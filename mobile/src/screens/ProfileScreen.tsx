import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Profile } from '../types/index';
import { useAssessmentStore } from '../store/useAssessmentStore';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FeedbackModal, FeedbackModalProps } from '../components/FeedbackModal';

type ProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Profile'
>;

interface ProfileScreenProps {
  navigation: ProfileScreenNavigationProp;
}

const AVATARS = ['👨‍💻', '🔬', '👩‍🎓', '📚', '🚀', '🧠', '🎯', '⚖️', '💡', '🎨'];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const {
    profiles,
    activeProfileId,
    assessments,
    sessions,
    setActiveProfile,
    createProfile,
    updateProfile,
    deleteProfile,
  } = useAssessmentStore();

  // Create Profile Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTargetExam, setNewTargetExam] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editName, setEditName] = useState('');
  const [editTargetExam, setEditTargetExam] = useState('');
  const [editAvatar, setEditAvatar] = useState(AVATARS[0]);

  // Feedback Modal State (Confirmations, Success, Errors)
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  // Open Edit Modal for a selected profile
  const handleOpenEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setEditName(profile.name);
    setEditTargetExam(profile.targetExam || '');
    setEditAvatar(profile.avatar || AVATARS[0]);
    setIsEditModalOpen(true);
  };

  // Save Edit Profile Changes
  const handleSaveEdit = () => {
    if (!editingProfile) return;

    const trimmedName = editName.trim();
    if (!trimmedName) {
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Name Required',
        message: 'Please enter a valid learner profile name.',
        cancelText: 'OK',
        onCancel: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    try {
      const updated = updateProfile(editingProfile.id, {
        name: trimmedName,
        avatar: editAvatar,
        targetExam: editTargetExam.trim() || undefined,
      });

      if (!updated) {
        throw new Error('Profile could not be found to update.');
      }

      // Close edit modal
      setIsEditModalOpen(false);
      setEditingProfile(null);

      // Show success modal only once changes are saved
      setFeedbackModal({
        visible: true,
        type: 'success',
        title: 'Profile Updated',
        itemName: trimmedName,
        itemLabel: 'Learner Profile',
        message: 'Profile details have been updated and saved locally on this device.',
        confirmText: 'Done',
        onConfirm: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
      });
    } catch (err: any) {
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Update Failed',
        itemName: editingProfile.name,
        itemLabel: 'Profile',
        message:
          err?.message ||
          'An error occurred while saving profile changes. Please try again.',
        cancelText: 'Dismiss',
        retryText: 'Retry Save',
        onCancel: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
        onRetry: () => handleSaveEdit(),
      });
    }
  };

  // Helper to generate data impact explanation for deletion
  const getDeleteExplanation = (
    profile: Profile,
    localCount: number,
    resultsCount: number
  ): string => {
    const parts: string[] = [];

    if (localCount > 0 && resultsCount > 0) {
      parts.push(
        `This profile currently has ${localCount} custom local assessment${
          localCount === 1 ? '' : 's'
        } and ${resultsCount} saved test result${resultsCount === 1 ? '' : 's'}.`
      );
      parts.push(
        `⚠️ Deleting this profile will permanently remove all associated local tests, diagnostic history, and performance statistics from this device.`
      );
    } else if (localCount > 0) {
      parts.push(
        `This profile currently has ${localCount} custom local assessment${
          localCount === 1 ? '' : 's'
        }.`
      );
      parts.push(
        `⚠️ Deleting this profile will permanently remove all associated local tests from this device.`
      );
    } else if (resultsCount > 0) {
      parts.push(
        `This profile has ${resultsCount} saved test result${
          resultsCount === 1 ? '' : 's'
        }.`
      );
      parts.push(
        `⚠️ Deleting this profile will permanently remove all test history and diagnostic reports for this learner from this device.`
      );
    } else {
      parts.push(`This profile has no associated local assessments or test results.`);
      parts.push(
        `Deleting it will permanently remove the profile record and its settings from this device.`
      );
    }

    parts.push(
      `Shared published assessments downloaded from MongoDB will remain intact and accessible to all other profiles.`
    );
    parts.push(`Are you sure you want to permanently delete this profile?`);

    return parts.join('\n\n');
  };

  // Request Profile Deletion with Confirmation Modal
  const handleRequestDelete = (profile: Profile) => {
    // Guard: Prevent deleting the only remaining profile
    if (profiles.length <= 1) {
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Cannot Delete Profile',
        itemName: profile.name,
        itemLabel: 'Profile',
        message:
          'At least one learner profile must be kept on this device. Please create a new profile before deleting this one.',
        cancelText: 'Understood',
        onCancel: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    const localCount = assessments.filter(
      (a) => a.profileId === profile.id && a.scope === 'local'
    ).length;
    const resultsCount = sessions.filter(
      (s) => s.profileId === profile.id
    ).length;

    const explanation = getDeleteExplanation(profile, localCount, resultsCount);

    setFeedbackModal({
      visible: true,
      type: 'confirm-delete',
      title: 'Delete Learner Profile',
      itemName: profile.name,
      itemLabel: 'Profile to Delete',
      message: explanation,
      confirmText: 'Delete Profile',
      cancelText: 'Cancel',
      onCancel: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
      onConfirm: async () => {
        try {
          setFeedbackModal((prev) => ({ ...prev, isLoading: true }));

          // Execute deletion
          deleteProfile(profile.id);

          // Show success modal only once deletion has completed
          setFeedbackModal({
            visible: true,
            type: 'success',
            title: 'Profile Deleted',
            itemName: profile.name,
            itemLabel: 'Deleted Profile',
            message: `Learner profile "${profile.name}" and any associated local assessment data have been removed from this device.`,
            confirmText: 'Done',
            onConfirm: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
          });
        } catch (err: any) {
          setFeedbackModal({
            visible: true,
            type: 'error',
            title: 'Deletion Failed',
            itemName: profile.name,
            itemLabel: 'Profile',
            message:
              err?.message ||
              'Could not delete the profile. Please try again.',
            cancelText: 'Dismiss',
            retryText: 'Retry Delete',
            onCancel: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
            onRetry: () => handleRequestDelete(profile),
          });
        }
      },
    });
  };

  // Create Profile Handler
  const handleCreateProfile = () => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Name Required',
        message: 'Please enter a name for the new learner profile.',
        cancelText: 'OK',
        onCancel: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    try {
      const created = createProfile(
        trimmedName,
        selectedAvatar,
        newTargetExam.trim() || undefined
      );

      setNewName('');
      setNewTargetExam('');
      setSelectedAvatar(AVATARS[0]);
      setIsCreateModalOpen(false);

      // Show success modal only once creation has completed
      setFeedbackModal({
        visible: true,
        type: 'success',
        title: 'Profile Created',
        itemName: created.name,
        itemLabel: 'New Profile',
        message: `Learner profile "${created.name}" created and set as active on this device.`,
        confirmText: 'Great!',
        onConfirm: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
      });
    } catch (err: any) {
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Creation Failed',
        message: err?.message || 'Could not create new profile. Please try again.',
        cancelText: 'Dismiss',
        onCancel: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Learner Profiles"
        subtitle="Select, customize or manage study profiles"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.introBox}>
          <Text style={styles.introTitle}>Personalized Assessment Portfolios</Text>
          <Text style={styles.introDesc}>
            Each profile tracks independent assessment test scores, completion
            histories, and pacing metrics stored locally on this device.
          </Text>
        </View>

        {/* List of Profiles */}
        <View style={styles.listSection}>
          {profiles.map((profile) => {
            const isActive = profile.id === activeProfileId;
            const localCount = assessments.filter(
              (a) => a.profileId === profile.id && a.scope === 'local'
            ).length;
            const resultsCount = sessions.filter(
              (s) => s.profileId === profile.id
            ).length;

            return (
              <Card
                key={profile.id}
                highlighted={isActive}
                style={styles.profileCard}
                accessibilityLabel={`Profile ${profile.name}, ${
                  isActive ? 'Currently Active' : 'Tap to activate'
                }`}
              >
                {/* Header Row: Tap to Activate */}
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() => setActiveProfile(profile.id)}
                  activeOpacity={0.7}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${profile.name}`}
                >
                  <View style={styles.avatarRow}>
                    <Text style={styles.avatarText}>{profile.avatar}</Text>
                    <View style={styles.nameContainer}>
                      <View style={styles.titleRow}>
                        <Text style={styles.profileName}>{profile.name}</Text>
                        {isActive && (
                          <View style={styles.activeTag}>
                            <Text style={styles.activeTagText}>ACTIVE</Text>
                          </View>
                        )}
                      </View>
                      {profile.targetExam ? (
                        <Text style={styles.targetExamText} numberOfLines={1}>
                          🎯 {profile.targetExam}
                        </Text>
                      ) : null}
                      <Text style={styles.associatedDataText}>
                        📁 {localCount} local test{localCount === 1 ? '' : 's'} • 📊{' '}
                        {resultsCount} result{resultsCount === 1 ? '' : 's'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Stats Row */}
                <View style={styles.statsContainer}>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{profile.stats.testsTaken}</Text>
                    <Text style={styles.statLabel}>Tests Taken</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: COLORS.success }]}>
                      {profile.stats.averageScorePercentage}%
                    </Text>
                    <Text style={styles.statLabel}>Avg Score</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>
                      {profile.stats.totalTimeMinutes}m
                    </Text>
                    <Text style={styles.statLabel}>Study Time</Text>
                  </View>
                </View>

                {/* Management Action Buttons Row */}
                <View style={styles.cardActionsRow}>
                  {isActive ? (
                    <View style={styles.activeBadgeContainer}>
                      <Text style={styles.activeBadgeCheck}>✓</Text>
                      <Text style={styles.activeBadgeLabel}>Current Active Profile</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.switchButton}
                      onPress={() => setActiveProfile(profile.id)}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={`Set ${profile.name} as active`}
                    >
                      <Text style={styles.switchButtonText}>Activate Profile</Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.actionButtonsGroup}>
                    {/* Edit Profile Button */}
                    <TouchableOpacity
                      onPress={() => handleOpenEdit(profile)}
                      style={styles.editActionButton}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit profile ${profile.name}`}
                    >
                      <Text style={styles.editActionIcon}>✏️</Text>
                      <Text style={styles.editActionText}>Edit</Text>
                    </TouchableOpacity>

                    {/* Delete Profile Button */}
                    <TouchableOpacity
                      onPress={() => handleRequestDelete(profile)}
                      style={[
                        styles.deleteActionButton,
                        profiles.length <= 1 && styles.deleteDisabledButton,
                      ]}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete profile ${profile.name}`}
                    >
                      <Text style={styles.deleteActionIcon}>🗑️</Text>
                      <Text style={styles.deleteActionText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>

        {/* Action Button: Create Profile */}
        <Button
          title="+ Create New Profile"
          variant="outline"
          size="lg"
          onPress={() => setIsCreateModalOpen(true)}
          style={{ marginTop: SPACING.md, marginBottom: SPACING.xl }}
        />
      </ScrollView>

      {/* Modal for Creating Profile */}
      <Modal
        visible={isCreateModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Profile</Text>
            <Text style={styles.modalSubtitle}>
              Profile details are stored locally on this device.
            </Text>

            <Text style={styles.inputLabel}>Choose Avatar</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.avatarPicker}
            >
              {AVATARS.map((av) => (
                <TouchableOpacity
                  key={av}
                  onPress={() => setSelectedAvatar(av)}
                  style={[
                    styles.avatarChoice,
                    selectedAvatar === av && styles.avatarSelected,
                  ]}
                >
                  <Text style={styles.avatarChoiceText}>{av}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Profile Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Maya Lin"
              placeholderTextColor={COLORS.textDim}
              value={newName}
              onChangeText={setNewName}
              autoFocus={true}
            />

            <Text style={styles.inputLabel}>Target Exam / Focus Area (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. USMLE Step 1, GRE Math, AP Physics"
              placeholderTextColor={COLORS.textDim}
              value={newTargetExam}
              onChangeText={setNewTargetExam}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setIsCreateModalOpen(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Create Profile"
                variant="primary"
                onPress={handleCreateProfile}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal for Editing Profile */}
      <Modal
        visible={isEditModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setIsEditModalOpen(false);
          setEditingProfile(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Learner Profile</Text>
            <Text style={styles.modalSubtitle}>
              Update profile details stored locally on this device.
            </Text>

            <Text style={styles.inputLabel}>Choose Avatar</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.avatarPicker}
            >
              {AVATARS.map((av) => (
                <TouchableOpacity
                  key={av}
                  onPress={() => setEditAvatar(av)}
                  style={[
                    styles.avatarChoice,
                    editAvatar === av && styles.avatarSelected,
                  ]}
                >
                  <Text style={styles.avatarChoiceText}>{av}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Profile Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Maya Lin"
              placeholderTextColor={COLORS.textDim}
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={styles.inputLabel}>Target Exam / Focus Area (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. USMLE Step 1, GRE Math, AP Physics"
              placeholderTextColor={COLORS.textDim}
              value={editTargetExam}
              onChangeText={setEditTargetExam}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => {
                  setIsEditModalOpen(false);
                  setEditingProfile(null);
                }}
                style={{ flex: 1 }}
              />
              <Button
                title="Save Changes"
                variant="primary"
                onPress={handleSaveEdit}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Operational Feedback & Confirmation Modal */}
      <FeedbackModal {...feedbackModal} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: SPACING.lg,
  },
  introBox: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  introTitle: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS.text,
    fontSize: 15,
  },
  introDesc: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  listSection: {
    gap: SPACING.md,
  },
  profileCard: {
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarText: {
    fontSize: 34,
    marginRight: SPACING.md,
  },
  nameContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  profileName: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.text,
  },
  activeTag: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  activeTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primaryLight,
  },
  targetExamText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  associatedDataText: {
    fontSize: 11,
    color: COLORS.textDim,
    marginTop: 3,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textDim,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  activeBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  activeBadgeCheck: {
    color: COLORS.success,
    fontSize: 13,
    fontWeight: '800',
  },
  activeBadgeLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  switchButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  switchButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryLight,
  },
  actionButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  editActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  editActionIcon: {
    fontSize: 12,
  },
  editActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  deleteActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gap: 4,
  },
  deleteDisabledButton: {
    opacity: 0.5,
  },
  deleteActionIcon: {
    fontSize: 12,
  },
  deleteActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.danger,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS.text,
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  avatarPicker: {
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  avatarChoice: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryDark,
  },
  avatarChoiceText: {
    fontSize: 22,
  },
  textInput: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
});
