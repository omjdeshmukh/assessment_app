import React, { useState } from 'react';
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAssessmentStore } from '../store/useAssessmentStore';
import { useAdminStore } from '../store/useAdminStore';
import { Question } from '../types/index';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { publishAssessmentToCloud } from '../services/api';
import { FeedbackModal, FeedbackModalProps } from '../components/FeedbackModal';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateManual'>;

export const CreateManualAssessmentScreen: React.FC<Props> = ({
  route,
  navigation,
}) => {
  const {
    initialDraft,
    editAssessmentId,
    mode = 'create',
    scope = 'local',
  } = route.params || {};

  const {
    addLocalAssessment,
    updateLocalAssessment,
    updatePublishedAssessmentAction,
    activeProfileId,
    fetchLatestPublishedAssessments,
    addPublishedAssessment,
  } = useAssessmentStore();
  const { isLoggedIn, token, admin } = useAdminStore();

  const isEditMode = mode === 'edit';

  const [title, setTitle] = useState(initialDraft?.title || '');
  const [subject, setSubject] = useState(initialDraft?.subject || 'Mathematics');
  const [durationMinutes, setDurationMinutes] = useState(
    String(initialDraft?.suggestedDurationMinutes || 15)
  );
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  const [questions, setQuestions] = useState<Question[]>(
    initialDraft?.questions || [
      {
        id: 'q-manual-1',
        prompt: '',
        options: [
          { id: 'A', text: '' },
          { id: 'B', text: '' },
          { id: 'C', text: '' },
          { id: 'D', text: '' },
        ],
        correctOptionId: 'A',
        explanation: '',
        difficulty: 'medium',
      },
    ]
  );

  const handleUpdatePrompt = (index: number, text: string) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], prompt: text };
    setQuestions(updated);
  };

  const handleUpdateOption = (
    qIndex: number,
    optIndex: number,
    text: string
  ) => {
    const updated = [...questions];
    const opts = [...updated[qIndex].options];
    opts[optIndex] = { ...opts[optIndex], text };
    updated[qIndex] = { ...updated[qIndex], options: opts };
    setQuestions(updated);
  };

  const handleSetCorrectOption = (qIndex: number, optId: string) => {
    const updated = [...questions];
    updated[qIndex] = { ...updated[qIndex], correctOptionId: optId };
    setQuestions(updated);
  };

  const handleUpdateExplanation = (qIndex: number, text: string) => {
    const updated = [...questions];
    updated[qIndex] = { ...updated[qIndex], explanation: text };
    setQuestions(updated);
  };

  const handleAddQuestion = () => {
    const newQ: Question = {
      id: `q-manual-${Date.now()}`,
      prompt: '',
      options: [
        { id: 'A', text: '' },
        { id: 'B', text: '' },
        { id: 'C', text: '' },
        { id: 'D', text: '' },
      ],
      correctOptionId: 'A',
      explanation: '',
      difficulty: 'medium',
    };
    setQuestions([...questions, newQ]);
  };

  const handleDeleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      Alert.alert('Cannot Remove', 'The assessment must contain at least 1 question.');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const validateAssessment = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Required Title', 'Please enter an assessment title.');
      return false;
    }
    const mins = parseInt(durationMinutes, 10);
    if (isNaN(mins) || mins <= 0) {
      Alert.alert('Invalid Duration', 'Duration must be a positive number of minutes.');
      return false;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt.trim()) {
        Alert.alert('Incomplete Question', `Question #${i + 1} has an empty prompt.`);
        return false;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].text.trim()) {
          Alert.alert(
            'Incomplete Option',
            `Question #${i + 1}, Option ${q.options[j].id} text cannot be empty.`
          );
          return false;
        }
      }
    }
    return true;
  };

  // Save locally to device (Private to active profile)
  const handleSaveLocal = () => {
    if (!validateAssessment()) return;
    if (isSavingLocal || isPublishing) return;

    setIsSavingLocal(true);
    const mins = parseInt(durationMinutes, 10);
    try {
      addLocalAssessment({
        profileId: activeProfileId,
        title: title.trim(),
        subject: subject.trim(),
        durationMinutes: mins,
        totalQuestions: questions.length,
        questions,
        sourcePdfName: 'Manual Entry',
      });
      setIsSavingLocal(false);
      setFeedbackModal({
        visible: true,
        type: 'success',
        title: 'Assessment Created ✅',
        assessmentName: title.trim(),
        message: 'Assessment created successfully. Stored privately on your device.',
        confirmText: 'Go to Library',
        onConfirm: () => {
          setFeedbackModal((prev) => ({ ...prev, visible: false }));
          navigation.navigate('Library');
        },
      });
    } catch (err: any) {
      setIsSavingLocal(false);
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Creation Failed',
        assessmentName: title.trim(),
        message: err?.message || 'Could not save assessment locally.',
        cancelText: 'Dismiss',
        retryText: 'Retry Save',
        onCancel: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
        onRetry: () => {
          setFeedbackModal((prev) => ({ ...prev, visible: false }));
          handleSaveLocal();
        },
      });
    }
  };

  // Publish Assessment to MongoDB (Cloud Shared)
  const handlePublishToCloud = async () => {
    if (!validateAssessment()) return;
    if (isPublishing || isSavingLocal) return;

    setIsPublishing(true);

    const payload = {
      title: title.trim(),
      subject: subject.trim(),
      durationMinutes: parseInt(durationMinutes, 10),
      totalQuestions: questions.length,
      questions,
      sourcePdfName: 'Manual Authoring',
    };

    // Calls POST http://localhost:4000/api/assessments to store in MongoDB
    const result = await publishAssessmentToCloud(payload, token || undefined);
    setIsPublishing(false);

    if (!result.success || !result.assessment) {
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Publish Failed',
        assessmentName: title.trim(),
        message: result.error || 'Failed to publish assessment to MongoDB. Check connection or authorization.',
        cancelText: 'Dismiss',
        retryText: 'Retry Publish',
        onCancel: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
        onRetry: () => {
          setFeedbackModal((prev) => ({ ...prev, visible: false }));
          handlePublishToCloud();
        },
      });
      return;
    }

    // Immediately cache the published document into state
    addPublishedAssessment(result.assessment);

    setFeedbackModal({
      visible: true,
      type: 'success',
      title: 'Assessment Published 🚀',
      assessmentName: title.trim(),
      message: 'Assessment created and published to MongoDB successfully. It is now available to all app users via cloud sync.',
      confirmText: 'View in Library',
      onConfirm: () => {
        setFeedbackModal((prev) => ({ ...prev, visible: false }));
        navigation.navigate('Library');
      },
    });
  };

  // Save edited changes for local assessment
  const handleSaveLocalEdit = () => {
    if (!validateAssessment()) return;
    if (!editAssessmentId) return;
    if (isSavingLocal || isPublishing) return;

    setIsSavingLocal(true);
    const mins = parseInt(durationMinutes, 10);
    try {
      updateLocalAssessment(editAssessmentId, {
        title: title.trim(),
        subject: subject.trim(),
        durationMinutes: mins,
        totalQuestions: questions.length,
        questions,
      });
      setIsSavingLocal(false);

      setFeedbackModal({
        visible: true,
        type: 'success',
        title: 'Assessment Updated ✅',
        assessmentName: title.trim(),
        message: 'Assessment updated successfully. Changes remain saved locally on your device.',
        confirmText: 'Back to Library',
        onConfirm: () => {
          setFeedbackModal((prev) => ({ ...prev, visible: false }));
          navigation.navigate('Library');
        },
      });
    } catch (err: any) {
      setIsSavingLocal(false);
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Update Failed',
        assessmentName: title.trim(),
        message: err?.message || 'Failed to update local assessment.',
        cancelText: 'Dismiss',
        retryText: 'Retry Update',
        onCancel: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
        onRetry: () => {
          setFeedbackModal((prev) => ({ ...prev, visible: false }));
          handleSaveLocalEdit();
        },
      });
    }
  };

  // Save edited changes for published MongoDB assessment (Admin only)
  const handleSavePublishedEdit = async () => {
    if (!validateAssessment()) return;
    if (!editAssessmentId) return;
    if (isPublishing || isSavingLocal) return;

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

    setIsPublishing(true);
    const mins = parseInt(durationMinutes, 10);
    const payload = {
      title: title.trim(),
      subject: subject.trim(),
      durationMinutes: mins,
      totalQuestions: questions.length,
      questions,
    };

    const result = await updatePublishedAssessmentAction(editAssessmentId, payload, token);
    setIsPublishing(false);

    if (!result.success) {
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Update Failed',
        assessmentName: title.trim(),
        message: result.error || 'Failed to update assessment in MongoDB.',
        cancelText: 'Dismiss',
        retryText: 'Retry Update',
        onCancel: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
        onRetry: () => {
          setFeedbackModal((prev) => ({ ...prev, visible: false }));
          handleSavePublishedEdit();
        },
      });
      return;
    }

    setFeedbackModal({
      visible: true,
      type: 'success',
      title: 'Assessment Updated 🚀',
      assessmentName: title.trim(),
      message: result.queuedOffline
        ? 'Assessment updated locally and queued to sync with MongoDB once internet connection is restored.'
        : 'Assessment updated successfully in MongoDB.',
      confirmText: 'Back to Library',
      onConfirm: () => {
        setFeedbackModal((prev) => ({ ...prev, visible: false }));
        navigation.navigate('Library');
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={
          isEditMode
            ? scope === 'published'
              ? 'Edit Shared Assessment'
              : 'Edit Local Assessment'
            : 'Create Manually'
        }
        subtitle={
          isEditMode
            ? scope === 'published'
              ? 'Admin editing shared test in MongoDB'
              : 'Editing test on this local device'
            : 'Author questions and answer keys'
        }
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Basic Info Card */}
        <Card style={styles.infoCard}>
          <Text style={styles.inputLabel}>Assessment Title *</Text>
          <TextInput
            style={styles.textInput}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Modern Physics Chapter 4 Quiz"
            placeholderTextColor={COLORS.textDim}
          />

          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Subject *</Text>
              <TextInput
                style={styles.textInput}
                value={subject}
                onChangeText={setSubject}
                placeholder="e.g. Physics, Law, STEM"
                placeholderTextColor={COLORS.textDim}
              />
            </View>
            <View style={{ width: 110 }}>
              <Text style={styles.inputLabel}>Time (Mins) *</Text>
              <TextInput
                style={styles.textInput}
                value={durationMinutes}
                onChangeText={setDurationMinutes}
                keyboardType="numeric"
                placeholder="15"
                placeholderTextColor={COLORS.textDim}
              />
            </View>
          </View>
        </Card>

        {/* Questions Header */}
        <View style={styles.questionsHeaderRow}>
          <Text style={styles.sectionTitle}>
            Questions ({questions.length})
          </Text>
          <Text style={styles.sectionSubtitle}>
            Tap option circle to mark as the verified correct answer.
          </Text>
        </View>

        {/* Question Cards */}
        {questions.map((q, qIdx) => (
          <Card key={q.id || qIdx} style={styles.questionCard}>
            <View style={styles.qCardHeader}>
              <Text style={styles.qNumber}>Question {qIdx + 1}</Text>
              {questions.length > 1 && (
                <TouchableOpacity
                  onPress={() => handleDeleteQuestion(qIdx)}
                  style={styles.deleteBtn}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete question ${qIdx + 1}`}
                >
                  <Text style={styles.deleteText}>Delete ✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.fieldLabel}>Question Prompt *</Text>
            <TextInput
              style={[styles.textInput, styles.promptInput]}
              value={q.prompt}
              onChangeText={(t) => handleUpdatePrompt(qIdx, t)}
              placeholder="Enter question text here..."
              placeholderTextColor={COLORS.textDim}
              multiline
            />

            <Text style={styles.fieldLabel}>Answer Choices (Select Correct):</Text>
            <View style={styles.optionsList}>
              {q.options.map((opt, optIdx) => {
                const isCorrect =
                  opt.id.toUpperCase() === q.correctOptionId.toUpperCase();

                return (
                  <View key={opt.id || optIdx} style={styles.optionRow}>
                    <TouchableOpacity
                      onPress={() => handleSetCorrectOption(qIdx, opt.id)}
                      style={[
                        styles.correctPill,
                        isCorrect && styles.correctPillActive,
                      ]}
                      accessible={true}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isCorrect }}
                      accessibilityLabel={`Option ${opt.id}, ${
                        isCorrect ? 'Correct Answer' : 'Tap to mark as correct'
                      }`}
                    >
                      <Text
                        style={[
                          styles.correctPillText,
                          isCorrect && styles.correctPillTextActive,
                        ]}
                      >
                        {opt.id} {isCorrect ? '✓' : ''}
                      </Text>
                    </TouchableOpacity>

                    <TextInput
                      style={[
                        styles.textInput,
                        styles.optionInput,
                        isCorrect && styles.optionInputCorrect,
                      ]}
                      value={opt.text}
                      onChangeText={(t) => handleUpdateOption(qIdx, optIdx, t)}
                      placeholder={`Option ${opt.id} text...`}
                      placeholderTextColor={COLORS.textDim}
                    />
                  </View>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Explanation / Rationale (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.explanationInput]}
              value={q.explanation || ''}
              onChangeText={(t) => handleUpdateExplanation(qIdx, t)}
              placeholder="Explain why this answer is correct for the results screen..."
              placeholderTextColor={COLORS.textDim}
              multiline
            />
          </Card>
        ))}

        {/* Add Question Button */}
        <Button
          title="+ Add Another Question"
          variant="outline"
          size="md"
          onPress={handleAddQuestion}
          style={{ marginVertical: SPACING.sm }}
        />

        {/* Bottom Actions */}
        <View style={styles.actionSection}>
          {isEditMode ? (
            scope === 'published' ? (
              <Button
                title="💾 Update in MongoDB (Shared Cloud)"
                variant="primary"
                size="lg"
                loading={isPublishing}
                disabled={isPublishing || isSavingLocal}
                onPress={handleSavePublishedEdit}
                accessibilityHint="Updates shared assessment in MongoDB for all users"
              />
            ) : (
              <Button
                title="💾 Save Changes (Local Device Only)"
                variant="primary"
                size="lg"
                loading={isSavingLocal}
                disabled={isSavingLocal || isPublishing}
                onPress={handleSaveLocalEdit}
                accessibilityHint="Saves changes locally on device"
              />
            )
          ) : (
            <>
              <Button
                title="Save Local Assessment (Device Only)"
                variant="primary"
                size="lg"
                loading={isSavingLocal}
                disabled={isSavingLocal || isPublishing}
                onPress={handleSaveLocal}
              />

              <Button
                title="🚀 Publish to MongoDB (Cloud Shared)"
                variant="secondary"
                size="lg"
                loading={isPublishing}
                disabled={isPublishing || isSavingLocal}
                onPress={handlePublishToCloud}
                accessibilityHint="Stores and publishes assessment directly to MongoDB for all users"
              />

              {!isLoggedIn && (
                <View style={styles.adminTipBox}>
                  <Text style={styles.adminTipText}>
                    💡 Publishing without admin token attributes to community admin. Sign in via{' '}
                    <Text
                      style={styles.adminTipLink}
                      onPress={() => navigation.navigate('AdminPortal')}
                    >
                      Admin Portal
                    </Text>{' '}
                    to use verified administrative credentials.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

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
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  infoCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 4,
    marginTop: 6,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  textInput: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm + 2,
    color: COLORS.text,
    fontSize: 14,
  },
  questionsHeaderRow: {
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS.text,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  questionCard: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  qCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  qNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  deleteBtn: {
    padding: 4,
  },
  deleteText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDim,
    marginTop: SPACING.sm,
    marginBottom: 4,
  },
  promptInput: {
    minHeight: 52,
    textAlignVertical: 'top',
  },
  optionsList: {
    gap: SPACING.xs + 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  correctPill: {
    width: 44,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  correctPillActive: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  correctPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  correctPillTextActive: {
    color: '#FFF',
  },
  optionInput: {
    flex: 1,
  },
  optionInputCorrect: {
    borderColor: COLORS.success,
  },
  explanationInput: {
    minHeight: 46,
    textAlignVertical: 'top',
    fontSize: 12,
    color: COLORS.textMuted,
  },
  actionSection: {
    gap: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  adminTipBox: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  adminTipText: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
    textAlign: 'center',
  },
  adminTipLink: {
    color: COLORS.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
