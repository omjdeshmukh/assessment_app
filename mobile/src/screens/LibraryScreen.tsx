import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAssessmentStore } from '../store/useAssessmentStore';
import { useTestExecutionStore } from '../store/useTestExecutionStore';
import { useAdminStore } from '../store/useAdminStore';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Assessment } from '../types/index';
import { publishAssessmentToCloud } from '../services/api';
import { FeedbackModal, FeedbackModalProps } from '../components/FeedbackModal';

type LibraryScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Library'
>;

interface LibraryScreenProps {
  navigation: LibraryScreenNavigationProp;
}

type ScopeFilter = 'all' | 'published' | 'local';

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ navigation }) => {
  const {
    profiles,
    activeProfileId,
    deleteAssessment,
    deleteLocalAssessment,
    deletePublishedAssessmentAction,
    getAssessmentsForActiveProfile,
    fetchLatestPublishedAssessments,
    addPublishedAssessment,
    isSyncing,
    lastSyncedAt,
    syncError,
    queuedAdminActions,
  } = useAssessmentStore();

  const { initTest } = useTestExecutionStore();
  const { isLoggedIn, admin, token } = useAdminStore();

  const [selectedSubject, setSelectedSubject] = useState('All');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) || profiles[0];

  // Auto-sync published assessments on screen mount when online
  useEffect(() => {
    fetchLatestPublishedAssessments(undefined, false);
  }, []);

  const profileAssessments = getAssessmentsForActiveProfile(scopeFilter);

  // Extract distinct subjects
  const subjectList = useMemo(() => {
    const allForProfile = getAssessmentsForActiveProfile('all');
    const subjects = new Set<string>();
    allForProfile.forEach((a) => {
      if (a.subject) subjects.add(a.subject);
    });
    return ['All', ...Array.from(subjects)];
  }, [getAssessmentsForActiveProfile]);

  // Filter assessments
  const filteredAssessments = useMemo(() => {
    return profileAssessments.filter((a) => {
      const matchesSubject =
        selectedSubject === 'All' ||
        a.subject.toLowerCase() === selectedSubject.toLowerCase();
      const matchesSearch =
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.subject.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSubject && matchesSearch;
    });
  }, [profileAssessments, selectedSubject, searchQuery]);

  const handleStartTest = (assessmentId: string) => {
    const assessment = profileAssessments.find((a) => a.id === assessmentId);
    if (!assessment) return;

    if (!assessment.questions || assessment.questions.length === 0) {
      Alert.alert('Empty Test', 'This assessment has no questions configured.');
      return;
    }

    initTest(assessment, activeProfile.id);
    navigation.navigate('TestRunner', { assessmentId });
  };

  const handleManualSync = async () => {
    const result = await fetchLatestPublishedAssessments(undefined, true);
    if (result.error) {
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Sync Notice',
        message: `${result.error}\n\nUsing cached offline assessments. You can retry syncing with MongoDB.`,
        cancelText: 'Dismiss',
        retryText: 'Retry Fetch',
        onCancel: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
        onRetry: () => {
          setFeedbackModal((prev) => ({ ...prev, visible: false }));
          handleManualSync();
        },
      });
    } else if (result.count > 0) {
      setFeedbackModal({
        visible: true,
        type: 'success',
        title: 'Assessments Updated ✅',
        message: `Successfully fetched and updated ${result.count} published assessment${result.count === 1 ? '' : 's'} from MongoDB.`,
        confirmText: 'Done',
        onConfirm: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
      });
    } else {
      setFeedbackModal({
        visible: true,
        type: 'success',
        title: 'Up to Date ✅',
        message: 'Checked MongoDB for latest assessments. No new or updated assessments found—your library is fully up to date.',
        confirmText: 'OK',
        onConfirm: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
      });
    }
  };

  // Local Assessment Actions (Device only)
  const handleEditLocal = (item: Assessment) => {
    navigation.navigate('CreateManual', {
      mode: 'edit',
      scope: 'local',
      editAssessmentId: item.id,
      initialDraft: {
        title: item.title,
        subject: item.subject,
        suggestedDurationMinutes: item.durationMinutes,
        totalQuestions: item.totalQuestions,
        questions: item.questions,
        extractionNotes: item.extractionNotes,
      },
    });
  };

  const handleDeleteLocal = (item: Assessment) => {
    setFeedbackModal({
      visible: true,
      type: 'confirm-delete',
      title: 'Delete Local Assessment',
      assessmentName: item.title,
      message: 'Are you sure you want to delete this assessment? This will permanently remove it from this device and cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isLoading: false,
      onCancel: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
      onConfirm: () => {
        setFeedbackModal((prev) => ({ ...prev, isLoading: true }));
        try {
          deleteLocalAssessment(item.id);
          setFeedbackModal({
            visible: true,
            type: 'success',
            title: 'Assessment Deleted',
            assessmentName: item.title,
            message: `Assessment "${item.title}" deleted successfully from your device.`,
            confirmText: 'OK',
            onConfirm: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
          });
        } catch (err: any) {
          setFeedbackModal({
            visible: true,
            type: 'error',
            title: 'Delete Failed',
            assessmentName: item.title,
            message: err?.message || 'Could not delete the local assessment.',
            cancelText: 'Dismiss',
            retryText: 'Retry Delete',
            onCancel: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
            onRetry: () => handleDeleteLocal(item),
          });
        }
      },
    });
  };

  // Published Cloud Assessment Actions (Admin Authorized)
  const handleEditPublished = (item: Assessment) => {
    if (!isLoggedIn || !token) {
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Admin Authentication Required',
        message: 'Only authenticated administrators can edit shared assessments in MongoDB.',
        cancelText: 'OK',
        onCancel: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
      });
      return;
    }
    navigation.navigate('CreateManual', {
      mode: 'edit',
      scope: 'published',
      editAssessmentId: item.id,
      initialDraft: {
        title: item.title,
        subject: item.subject,
        suggestedDurationMinutes: item.durationMinutes,
        totalQuestions: item.totalQuestions,
        questions: item.questions,
        extractionNotes: item.extractionNotes,
      },
    });
  };

  const handleDeletePublished = (item: Assessment) => {
    if (!isLoggedIn || !token) {
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Admin Authentication Required',
        message: 'Only authenticated administrators can delete shared assessments in MongoDB.',
        cancelText: 'OK',
        onCancel: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    setFeedbackModal({
      visible: true,
      type: 'confirm-delete',
      title: 'Delete Shared Assessment (MongoDB)',
      assessmentName: item.title,
      message: 'Are you sure you want to delete this shared assessment from MongoDB?\n\nThis will record a deletion marker (tombstone) in the database and automatically remove it from all users\' devices upon synchronization.',
      confirmText: 'Delete from DB',
      cancelText: 'Cancel',
      isLoading: false,
      onCancel: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
      onConfirm: async () => {
        setFeedbackModal((prev) => ({ ...prev, isLoading: true }));
        const res = await deletePublishedAssessmentAction(item.id, token);
        if (!res.success && !res.queuedOffline) {
          setFeedbackModal({
            visible: true,
            type: 'error',
            title: 'Delete Failed',
            assessmentName: item.title,
            message: res.error || 'Failed to delete assessment from MongoDB.',
            cancelText: 'Dismiss',
            retryText: 'Retry Delete',
            onCancel: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
            onRetry: () => handleDeletePublished(item),
          });
          return;
        }

        setFeedbackModal({
          visible: true,
          type: 'success',
          title: 'Assessment Deleted',
          assessmentName: item.title,
          message: res.queuedOffline
            ? `Assessment "${item.title}" removed locally and queued for synchronization once connection is restored.`
            : `Assessment "${item.title}" deleted successfully from MongoDB with a permanent tombstone marker.`,
          confirmText: 'OK',
          onConfirm: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
        });
      },
    });
  };

  const handlePublishLocalToMongoDB = async (item: Assessment) => {
    setPublishingId(item.id);
    const payload = {
      title: item.title,
      subject: item.subject,
      durationMinutes: item.durationMinutes,
      totalQuestions: item.totalQuestions || item.questions.length,
      questions: item.questions,
      sourcePdfName: item.sourcePdfName || 'Device Assessment',
      extractionNotes: item.extractionNotes,
    };

    // Calls POST http://localhost:4000/api/assessments to store into MongoDB
    const res = await publishAssessmentToCloud(payload, token || undefined);
    setPublishingId(null);

    if (!res.success || !res.assessment) {
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Publish Failed',
        assessmentName: item.title,
        message: res.error || 'Failed to publish assessment to MongoDB.',
        cancelText: 'Dismiss',
        retryText: 'Retry Publish',
        onCancel: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
        onRetry: () => {
          setFeedbackModal((prev) => ({ ...prev, visible: false }));
          handlePublishLocalToMongoDB(item);
        },
      });
      return;
    }

    addPublishedAssessment(res.assessment);
    setFeedbackModal({
      visible: true,
      type: 'success',
      title: 'Assessment Published 🚀',
      assessmentName: item.title,
      message: `Assessment "${item.title}" published to MongoDB successfully and shared across all users.`,
      confirmText: 'Great!',
      onConfirm: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
    });
  };

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never synced';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Assessment Library"
        subtitle={`Profile: ${activeProfile ? activeProfile.name : 'Learner'}`}
        onBack={() => navigation.navigate('Landing')}
        rightElement={
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={[
                styles.adminBadgeBtn,
                isLoggedIn && styles.adminBadgeBtnActive,
              ]}
              onPress={() => navigation.navigate('AdminPortal')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Admin portal. ${isLoggedIn ? 'Signed in as ' + admin?.username : 'Tap to sign in'}`}
            >
              <Text style={styles.adminBadgeIcon}>{isLoggedIn ? '🛡️' : '🔑'}</Text>
              <Text style={[styles.adminBadgeText, isLoggedIn && styles.adminBadgeTextActive]}>
                {isLoggedIn ? 'Admin' : 'Login'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileBadge}
              onPress={() => navigation.navigate('Profile')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Switch active profile"
            >
              <Text style={styles.profileAvatarText}>
                {activeProfile ? activeProfile.avatar : '👤'}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.content}>
        {/* Sync Status & "Fetch Latest Assessments" Bar */}
        <View style={styles.syncBanner}>
          <View style={styles.syncMeta}>
            <Text style={styles.syncLabel}>
              {isSyncing ? 'Checking MongoDB for updates...' : `Cloud Sync: ${formatLastSync(lastSyncedAt)}`}
            </Text>
            {queuedAdminActions.length > 0 && (
              <Text style={{ fontSize: 11, color: COLORS.warning, fontWeight: '600' }}>
                ⏳ {queuedAdminActions.length} offline admin action(s) queued for sync
              </Text>
            )}
            {syncError && (
              <Text style={styles.syncOfflineText}>Offline Mode: Using local cache</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleManualSync}
            disabled={isSyncing}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Fetch latest assessments from MongoDB"
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <Text style={styles.syncBtnIcon}>🔄</Text>
                <Text style={styles.syncBtnText}>Fetch Latest</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Search & Action Bar */}
        <View style={styles.searchBarRow}>
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by title or topic..."
              placeholderTextColor={COLORS.textDim}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>

          <Button
            title="+ Create"
            variant="primary"
            size="sm"
            onPress={() => navigation.navigate('CreateChoice')}
            accessibilityLabel="Create assessment manually or from PDF"
          />
        </View>

        {/* Scope Filter Tabs: All | Cloud Published | Local Device */}
        <View style={styles.scopeTabsRow}>
          <TouchableOpacity
            style={[
              styles.scopeTab,
              scopeFilter === 'all' && styles.scopeTabActive,
            ]}
            onPress={() => setScopeFilter('all')}
          >
            <Text
              style={[
                styles.scopeTabText,
                scopeFilter === 'all' && styles.scopeTabTextActive,
              ]}
            >
              All Tests
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.scopeTab,
              scopeFilter === 'published' && styles.scopeTabActive,
            ]}
            onPress={() => setScopeFilter('published')}
          >
            <Text
              style={[
                styles.scopeTabText,
                scopeFilter === 'published' && styles.scopeTabTextActive,
              ]}
            >
              ☁️ Cloud Published
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.scopeTab,
              scopeFilter === 'local' && styles.scopeTabActive,
            ]}
            onPress={() => setScopeFilter('local')}
          >
            <Text
              style={[
                styles.scopeTabText,
                scopeFilter === 'local' && styles.scopeTabTextActive,
              ]}
            >
              📱 My Local
            </Text>
          </TouchableOpacity>
        </View>

        {/* Subject Filter Pills */}
        <View style={styles.subjectTabsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subjectTabsList}
          >
            {subjectList.map((subject) => {
              const isSelected = selectedSubject === subject;
              return (
                <TouchableOpacity
                  key={subject}
                  onPress={() => setSelectedSubject(subject)}
                  style={[
                    styles.subjectPill,
                    isSelected && styles.subjectPillActive,
                  ]}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by subject ${subject}`}
                >
                  <Text
                    style={[
                      styles.subjectPillText,
                      isSelected && styles.subjectPillTextActive,
                    ]}
                  >
                    {subject}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Assessment Cards List */}
        <ScrollView
          contentContainerStyle={styles.cardsScroll}
          showsVerticalScrollIndicator={false}
        >
          {filteredAssessments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.emptyTitle}>No Assessments Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'No assessments match your search keyword.'
                  : scopeFilter === 'published'
                  ? 'No published assessments downloaded yet. Tap "Fetch Latest" above to check MongoDB.'
                  : `No tests under "${selectedSubject}". Create one manually or upload a PDF!`}
              </Text>
              <Button
                title="+ Create New Assessment"
                variant="primary"
                size="md"
                onPress={() => navigation.navigate('CreateChoice')}
                style={{ marginTop: SPACING.md }}
              />
            </View>
          ) : (
            filteredAssessments.map((assessment) => {
              const isCloud = assessment.scope === 'published';

              return (
                <Card key={assessment.id} style={styles.assessmentCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.badgeRow}>
                      <View style={styles.subjectBadge}>
                        <Text style={styles.subjectBadgeText}>
                          {assessment.subject}
                        </Text>
                      </View>

                      {/* Scope Badge */}
                      <View
                        style={[
                          styles.scopeBadge,
                          isCloud ? styles.scopeBadgeCloud : styles.scopeBadgeLocal,
                        ]}
                      >
                        <Text
                          style={[
                            styles.scopeBadgeText,
                            isCloud ? styles.scopeBadgeTextCloud : styles.scopeBadgeTextLocal,
                          ]}
                        >
                          {isCloud ? '☁️ Cloud' : '📱 Local'}
                        </Text>
                      </View>
                    </View>

                    {isCloud ? (
                      <View style={styles.accessBadge}>
                        <Text style={styles.accessBadgeText}>
                          {isLoggedIn ? '🛡️ Admin' : '🔒 Read-Only'}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.accessBadge}>
                        <Text style={styles.accessBadgeText}>✏️ Editable</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.assessmentTitle}>{assessment.title}</Text>

                  {isCloud && assessment.publishedBy && (
                    <Text style={styles.publishedByText}>
                      Published by Admin: {assessment.publishedBy}
                    </Text>
                  )}

                  {assessment.sourcePdfName && !isCloud && (
                    <View style={styles.sourcePdfRow}>
                      <Text style={styles.pdfIcon}>📄</Text>
                      <Text style={styles.pdfName} numberOfLines={1}>
                        {assessment.sourcePdfName}
                      </Text>
                    </View>
                  )}

                  <View style={styles.metadataRow}>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Questions</Text>
                      <Text style={styles.metaValue}>
                        {assessment.totalQuestions || assessment.questions.length}
                      </Text>
                    </View>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Duration</Text>
                      <Text style={styles.metaValue}>
                        {assessment.durationMinutes} mins
                      </Text>
                    </View>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Availability</Text>
                      <Text style={[styles.metaValue, { color: isCloud ? COLORS.secondary : COLORS.success }]}>
                        {isCloud ? 'Shared' : 'Private'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <Button
                      title="Take Assessment →"
                      variant="primary"
                      size="md"
                      onPress={() => handleStartTest(assessment.id)}
                      style={{ width: '100%' }}
                      accessibilityHint="Begins taking this assessment test"
                    />

                    {/* Local Assessment Controls (Creator has full edit and delete permissions on device) */}
                    {!isCloud && (
                      <View style={styles.cardActionRow}>
                        <Button
                          title="✏️ Edit"
                          variant="outline"
                          size="sm"
                          onPress={() => handleEditLocal(assessment)}
                          style={{ flex: 1 }}
                          accessibilityHint="Edit this assessment locally on your device"
                        />
                        <Button
                          title="🗑️ Delete"
                          variant="danger"
                          size="sm"
                          onPress={() => handleDeleteLocal(assessment)}
                          style={{ flex: 1 }}
                          accessibilityHint="Permanently delete this assessment from your device"
                        />
                        <Button
                          title={publishingId === assessment.id ? "Publishing..." : "🚀 Publish"}
                          variant="secondary"
                          size="sm"
                          loading={publishingId === assessment.id}
                          disabled={publishingId !== null}
                          onPress={() => handlePublishLocalToMongoDB(assessment)}
                          style={{ flex: 1.2 }}
                          accessibilityHint="Publishes a copy of this assessment to MongoDB for all users"
                        />
                      </View>
                    )}

                    {/* Published MongoDB Controls: Admin Edit & Delete vs Regular User Read-Only */}
                    {isCloud && (
                      isLoggedIn ? (
                        <View style={styles.cardActionRow}>
                          <Button
                            title="✏️ Edit (Admin)"
                            variant="outline"
                            size="sm"
                            onPress={() => handleEditPublished(assessment)}
                            style={{ flex: 1 }}
                            accessibilityHint="Edit shared assessment in MongoDB"
                          />
                          <Button
                            title="🗑️ Delete from DB"
                            variant="danger"
                            size="sm"
                            onPress={() => handleDeletePublished(assessment)}
                            style={{ flex: 1.2 }}
                            accessibilityHint="Delete shared assessment from MongoDB with tombstone marker"
                          />
                        </View>
                      ) : (
                        <View style={styles.readOnlyBanner}>
                          <Text style={styles.readOnlyIcon}>🔒</Text>
                          <Text style={styles.readOnlyText}>
                            Shared MongoDB Test • Read-only for learners (Only admins can edit or delete)
                          </Text>
                        </View>
                      )
                    )}
                  </View>
                </Card>
              );
            })
          )}
        </ScrollView>
      </View>

      <FeedbackModal {...feedbackModal} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  adminBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  adminBadgeBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryDark,
  },
  adminBadgeIcon: {
    fontSize: 13,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  adminBadgeTextActive: {
    color: COLORS.primaryLight,
  },
  profileBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
  },
  profileAvatarText: {
    fontSize: 18,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  syncMeta: {
    flex: 1,
  },
  syncLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  syncOfflineText: {
    fontSize: 10,
    color: COLORS.warning,
    marginTop: 1,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 4,
  },
  syncBtnIcon: {
    fontSize: 11,
  },
  syncBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryLight,
  },
  searchBarRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    color: COLORS.text,
    fontSize: 13,
  },
  scopeTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    gap: SPACING.xs + 2,
  },
  scopeTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  scopeTabActive: {
    backgroundColor: COLORS.surfaceSubtle,
    borderColor: COLORS.primary,
  },
  scopeTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  scopeTabTextActive: {
    color: COLORS.text,
    fontWeight: '700',
  },
  subjectTabsWrapper: {
    marginVertical: SPACING.sm,
  },
  subjectTabsList: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs + 4,
  },
  subjectPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subjectPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  subjectPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  subjectPillTextActive: {
    color: COLORS.text,
    fontWeight: '700',
  },
  cardsScroll: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
    gap: SPACING.md,
  },
  assessmentCard: {
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
  },
  subjectBadge: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
  },
  subjectBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.secondary,
    textTransform: 'uppercase',
  },
  scopeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  scopeBadgeCloud: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: COLORS.secondary,
  },
  scopeBadgeLocal: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: COLORS.success,
  },
  scopeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  scopeBadgeTextCloud: {
    color: COLORS.secondary,
  },
  scopeBadgeTextLocal: {
    color: COLORS.success,
  },
  cardDeleteBtn: {
    padding: 4,
  },
  cardDeleteIcon: {
    color: COLORS.textDim,
    fontSize: 14,
    fontWeight: '700',
  },
  assessmentTitle: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS.text,
    marginVertical: SPACING.xs,
  },
  publishedByText: {
    fontSize: 11,
    color: COLORS.textDim,
    marginBottom: 4,
  },
  sourcePdfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  pdfIcon: {
    fontSize: 12,
  },
  pdfName: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    flex: 1,
  },
  metadataRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    marginVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 9,
    color: COLORS.textDim,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  metaDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  accessBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  accessBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    marginTop: SPACING.xs,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  readOnlyIcon: {
    fontSize: 12,
  },
  readOnlyText: {
    fontSize: 11,
    color: COLORS.textDim,
    flex: 1,
  },
  cardFooter: {
    marginTop: SPACING.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 18,
  },
});
