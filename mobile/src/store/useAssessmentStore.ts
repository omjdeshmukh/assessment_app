import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Assessment, Profile, TestSession, AssessmentScope } from '../types/index';
import { INITIAL_ASSESSMENTS, INITIAL_PROFILES } from '../constants/mockData';
import {
  fetchPublishedAssessmentsFromCloud,
  updatePublishedAssessmentApi,
  deletePublishedAssessmentApi,
} from '../services/api';

export interface QueuedAdminAction {
  id: string;
  assessmentId: string;
  action: 'edit' | 'delete';
  payload?: any;
  token: string;
  timestamp: string;
}

interface AssessmentState {
  profiles: Profile[];
  activeProfileId: string;
  assessments: Assessment[];
  sessions: TestSession[];

  // Sync & Offline Queue state
  lastSyncedAt: string | null;
  isSyncing: boolean;
  syncError: string | null;
  queuedAdminActions: QueuedAdminAction[];

  // Profile actions
  setActiveProfile: (profileId: string) => void;
  createProfile: (name: string, avatar: string, targetExam?: string) => Profile;
  updateProfile: (
    profileId: string,
    updates: Partial<Omit<Profile, 'id' | 'createdAt' | 'stats'>>
  ) => Profile | undefined;
  deleteProfile: (profileId: string) => void;

  // Local Assessment actions
  addLocalAssessment: (
    assessment: Omit<Assessment, 'id' | 'createdAt' | 'scope'>
  ) => Assessment;
  updateLocalAssessment: (
    assessmentId: string,
    updatedData: Partial<Assessment>
  ) => Assessment | undefined;
  deleteLocalAssessment: (assessmentId: string) => void;

  // Published Cloud Assessment actions
  addPublishedAssessment: (rawDoc: any) => Assessment;
  updatePublishedAssessmentAction: (
    assessmentId: string,
    updatedData: any,
    token: string,
    backendUrl?: string
  ) => Promise<{ success: boolean; queuedOffline?: boolean; error?: string }>;
  deletePublishedAssessmentAction: (
    assessmentId: string,
    token: string,
    backendUrl?: string
  ) => Promise<{ success: boolean; queuedOffline?: boolean; error?: string }>;
  deleteAssessment: (assessmentId: string) => void;

  // Cloud Sync
  fetchLatestPublishedAssessments: (
    backendUrl?: string,
    force?: boolean
  ) => Promise<{ count: number; error?: string }>;

  // Session & Results actions
  saveSession: (session: TestSession) => void;
  getSessionById: (sessionId: string) => TestSession | undefined;
  getAssessmentsForActiveProfile: (
    scopeFilter?: 'all' | 'published' | 'local'
  ) => Assessment[];
}

export const useAssessmentStore = create<AssessmentState>()(
  persist(
    (set, get) => ({
      profiles: INITIAL_PROFILES,
      activeProfileId: INITIAL_PROFILES[0].id,
      assessments: INITIAL_ASSESSMENTS,
      sessions: [],
      lastSyncedAt: null,
      isSyncing: false,
      syncError: null,
      queuedAdminActions: [],

      setActiveProfile: (profileId: string) => {
        set({ activeProfileId: profileId });
      },

      createProfile: (name: string, avatar: string, targetExam?: string) => {
        const newProfile: Profile = {
          id: `prof-${Date.now()}`,
          name: name.trim(),
          avatar: avatar || '🎓',
          targetExam: targetExam?.trim() || 'General Learning',
          createdAt: new Date().toISOString(),
          stats: {
            testsTaken: 0,
            averageScorePercentage: 0,
            totalTimeMinutes: 0,
          },
        };

        set((state) => ({
          profiles: [...state.profiles, newProfile],
          activeProfileId: newProfile.id,
        }));

        return newProfile;
      },

      updateProfile: (profileId, updates) => {
        let updatedProfile: Profile | undefined;
        set((state) => {
          const nextProfiles = state.profiles.map((p) => {
            if (p.id === profileId) {
              updatedProfile = {
                ...p,
                ...updates,
              };
              return updatedProfile;
            }
            return p;
          });
          return { profiles: nextProfiles };
        });
        return updatedProfile;
      },

      deleteProfile: (profileId: string) => {
        set((state) => {
          const remainingProfiles = state.profiles.filter((p) => p.id !== profileId);
          const nextActiveId =
            state.activeProfileId === profileId
              ? remainingProfiles[0]?.id || ''
              : state.activeProfileId;

          // Also cascade delete local assessments belonging to this profile
          const remainingAssessments = state.assessments.filter(
            (a) => !(a.profileId === profileId && a.scope === 'local')
          );

          // Also remove test results/sessions belonging to this profile
          const remainingSessions = state.sessions.filter((s) => s.profileId !== profileId);

          return {
            profiles: remainingProfiles,
            activeProfileId: nextActiveId,
            assessments: remainingAssessments,
            sessions: remainingSessions,
          };
        });
      },

      // Local Assessment Actions
      addLocalAssessment: (newAssessmentData) => {
        const newAssessment: Assessment = {
          ...newAssessmentData,
          id: `test-local-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          scope: 'local',
          profileId: newAssessmentData.profileId || get().activeProfileId,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          assessments: [newAssessment, ...state.assessments],
        }));

        return newAssessment;
      },

      updateLocalAssessment: (assessmentId, updatedData) => {
        let updatedItem: Assessment | undefined;
        set((state) => {
          const updatedAssessments = state.assessments.map((a) => {
            if (a.id === assessmentId && a.scope === 'local') {
              updatedItem = {
                ...a,
                ...updatedData,
                updatedAt: new Date().toISOString(),
              };
              return updatedItem;
            }
            return a;
          });
          return { assessments: updatedAssessments };
        });
        return updatedItem;
      },

      deleteLocalAssessment: (assessmentId) => {
        set((state) => ({
          assessments: state.assessments.filter((a) => !(a.id === assessmentId && a.scope === 'local')),
        }));
      },

      deleteAssessment: (assessmentId: string) => {
        set((state) => ({
          assessments: state.assessments.filter((a) => a.id !== assessmentId),
        }));
      },

      // Published Cloud Assessment Actions
      addPublishedAssessment: (rawDoc: any) => {
        const id = rawDoc.id || rawDoc._id || `pub-${Date.now()}`;
        const publishedItem: Assessment = {
          id,
          scope: 'published',
          title: rawDoc.title,
          subject: rawDoc.subject,
          durationMinutes: rawDoc.durationMinutes || 15,
          totalQuestions: rawDoc.totalQuestions || (rawDoc.questions ? rawDoc.questions.length : 0),
          questions: rawDoc.questions || [],
          sourcePdfName: rawDoc.sourcePdfName,
          createdAt: rawDoc.publishedAt || rawDoc.createdAt || new Date().toISOString(),
          updatedAt: rawDoc.updatedAt || new Date().toISOString(),
          publishedBy: rawDoc.publishedBy || 'admin',
          extractionNotes: rawDoc.extractionNotes,
        };

        set((state) => {
          const filtered = state.assessments.filter((a) => a.id !== id);
          return {
            assessments: [publishedItem, ...filtered],
          };
        });

        return publishedItem;
      },

      updatePublishedAssessmentAction: async (assessmentId, updatedData, token, backendUrl) => {
        // Immediate optimistic update in local state for seamless UI
        set((state) => {
          const updatedList = state.assessments.map((a) => {
            if (a.id === assessmentId && a.scope === 'published') {
              return {
                ...a,
                ...updatedData,
                updatedAt: new Date().toISOString(),
              };
            }
            return a;
          });
          return { assessments: updatedList };
        });

        const result = await updatePublishedAssessmentApi(assessmentId, updatedData, token, backendUrl);
        if (!result.success) {
          // Offline handling: queue for authorized sync
          const queueItem: QueuedAdminAction = {
            id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            assessmentId,
            action: 'edit',
            payload: updatedData,
            token,
            timestamp: new Date().toISOString(),
          };
          set((state) => ({
            queuedAdminActions: [...state.queuedAdminActions, queueItem],
          }));
          return { success: true, queuedOffline: true };
        }

        if (result.assessment) {
          get().addPublishedAssessment(result.assessment);
        }
        return { success: true, queuedOffline: false };
      },

      deletePublishedAssessmentAction: async (assessmentId, token, backendUrl) => {
        // Immediately remove from local state
        set((state) => ({
          assessments: state.assessments.filter((a) => a.id !== assessmentId),
        }));

        const result = await deletePublishedAssessmentApi(assessmentId, token, backendUrl);
        if (!result.success) {
          // Offline handling: queue tombstone delete for authorized sync
          const queueItem: QueuedAdminAction = {
            id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            assessmentId,
            action: 'delete',
            token,
            timestamp: new Date().toISOString(),
          };
          set((state) => ({
            queuedAdminActions: [...state.queuedAdminActions, queueItem],
          }));
          return { success: true, queuedOffline: true };
        }

        return { success: true, queuedOffline: false };
      },

      fetchLatestPublishedAssessments: async (backendUrl?: string, force = false) => {
        set({ isSyncing: true, syncError: null });

        // Flush queued offline admin actions if any exist
        const currentQueue = get().queuedAdminActions;
        if (currentQueue.length > 0) {
          const remainingQueue: QueuedAdminAction[] = [];
          for (const item of currentQueue) {
            try {
              if (item.action === 'delete') {
                const res = await deletePublishedAssessmentApi(item.assessmentId, item.token, backendUrl);
                if (!res.success) remainingQueue.push(item);
              } else if (item.action === 'edit' && item.payload) {
                const res = await updatePublishedAssessmentApi(item.assessmentId, item.payload, item.token, backendUrl);
                if (!res.success) remainingQueue.push(item);
              }
            } catch {
              remainingQueue.push(item);
            }
          }
          set({ queuedAdminActions: remainingQueue });
        }

        const sinceTimestamp = force ? undefined : get().lastSyncedAt || undefined;
        const result = await fetchPublishedAssessmentsFromCloud(backendUrl, sinceTimestamp);

        if (!result.success) {
          set({
            isSyncing: false,
            syncError: result.error || 'Failed to sync with cloud.',
          });
          return { count: 0, error: result.error };
        }

        const downloadedItems = result.assessments;
        const tombstoneIds = new Set(result.deletedIds || []);

        set((state) => {
          // Keep all existing local assessments intact
          const localItems = state.assessments.filter((a) => a.scope === 'local');

          // Filter out any published assessments that were deleted on the server (tombstone markers)
          const existingPublished = state.assessments.filter(
            (a) => a.scope === 'published' && !tombstoneIds.has(a.id)
          );

          // Merge downloaded published items (filtering out any tombstoned IDs)
          const publishedMap = new Map<string, Assessment>();
          existingPublished.forEach((item) => publishedMap.set(item.id, item));
          downloadedItems.forEach((item) => {
            if (!tombstoneIds.has(item.id)) {
              publishedMap.set(item.id, item);
            }
          });

          const mergedPublished = Array.from(publishedMap.values());

          return {
            assessments: [...mergedPublished, ...localItems],
            lastSyncedAt: result.syncedAt || new Date().toISOString(),
            isSyncing: false,
            syncError: null,
          };
        });

        return { count: downloadedItems.length };
      },

      saveSession: (session: TestSession) => {
        set((state) => {
          const updatedSessions = [session, ...state.sessions];

          // Recalculate profile stats
          const profileSessions = updatedSessions.filter((s) => s.profileId === session.profileId);
          const testsCount = profileSessions.length;
          const avgScore =
            profileSessions.reduce((acc, curr) => acc + curr.scorePercentage, 0) / (testsCount || 1);
          const totalDuration = profileSessions.reduce(
            (acc, curr) => acc + Math.round(curr.totalDurationSeconds / 60),
            0
          );

          const updatedProfiles = state.profiles.map((p) => {
            if (p.id === session.profileId) {
              return {
                ...p,
                stats: {
                  testsTaken: testsCount,
                  averageScorePercentage: Math.round(avgScore * 10) / 10,
                  totalTimeMinutes: totalDuration,
                },
              };
            }
            return p;
          });

          return {
            sessions: updatedSessions,
            profiles: updatedProfiles,
          };
        });
      },

      getSessionById: (sessionId: string) => {
        return get().sessions.find((s) => s.id === sessionId);
      },

      getAssessmentsForActiveProfile: (scopeFilter = 'all') => {
        const activeId = get().activeProfileId;

        return get().assessments.filter((a) => {
          const isPublished = a.scope === 'published';
          const isLocalForActive = a.scope === 'local' && (!a.profileId || a.profileId === activeId);

          if (scopeFilter === 'published') {
            return isPublished;
          }
          if (scopeFilter === 'local') {
            return isLocalForActive;
          }

          // 'all' returns both published shared items and the active profile's local items
          return isPublished || isLocalForActive;
        });
      },
    }),
    {
      name: 'gemini-assessment-store-v2',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
