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

type Props = NativeStackScreenProps<RootStackParamList, 'ReviewExtraction'>;

export const ReviewExtractionScreen: React.FC<Props> = ({ route, navigation }) => {
  const { extractedData, sourceFilename } = route.params;
  const { addLocalAssessment, activeProfileId, fetchLatestPublishedAssessments, addPublishedAssessment } =
    useAssessmentStore();
  const { isLoggedIn, token, admin } = useAdminStore();

  const [title, setTitle] = useState(extractedData.title || 'Extracted Assessment');
  const [subject, setSubject] = useState(extractedData.subject || 'General');
  const [durationMinutes, setDurationMinutes] = useState(
    String(extractedData.suggestedDurationMinutes || 15)
  );
  const [questions, setQuestions] = useState<Question[]>(
    extractedData.questions || []
  );
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  const handleUpdatePrompt = (index: number, newPrompt: string) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], prompt: newPrompt };
    setQuestions(updated);
  };

  const handleUpdateOption = (
    qIndex: number,
    optIndex: number,
    newText: string
  ) => {
    const updated = [...questions];
    const updatedOptions = [...updated[qIndex].options];
    updatedOptions[optIndex] = { ...updatedOptions[optIndex], text: newText };
    updated[qIndex] = { ...updated[qIndex], options: updatedOptions };
    setQuestions(updated);
  };

  const handleSetCorrectOption = (qIndex: number, optId: string) => {
    const updated = [...questions];
    updated[qIndex] = { ...updated[qIndex], correctOptionId: optId };
    setQuestions(updated);
  };

  const handleUpdateExplanation = (qIndex: number, newExp: string) => {
    const updated = [...questions];
    updated[qIndex] = { ...updated[qIndex], explanation: newExp };
    setQuestions(updated);
  };

  const handleDeleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      Alert.alert('Cannot Remove', 'The assessment must have at least one question.');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleAddQuestion = () => {
    const newQ: Question = {
      id: `q-user-${Date.now()}`,
      prompt: 'New Question Prompt',
      options: [
        { id: 'A', text: 'Option A' },
        { id: 'B', text: 'Option B' },
        { id: 'C', text: 'Option C' },
        { id: 'D', text: 'Option D' },
      ],
      correctOptionId: 'A',
      explanation: 'Explanation for correct answer.',
      difficulty: 'medium',
      confidenceScore: 1.0,
    };
    setQuestions([...questions, newQ]);
  };

  const validate = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please provide a title for the assessment.');
      return false;
    }
    const duration = parseInt(durationMinutes, 10);
    if (isNaN(duration) || duration <= 0) {
      Alert.alert('Invalid Duration', 'Duration must be a positive number of minutes.');
      return false;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt.trim()) {
        Alert.alert('Incomplete Question', `Question #${i + 1} has an empty prompt.`);
        return false;
      }
      if (!q.options || q.options.length < 2) {
        Alert.alert('Incomplete Options', `Question #${i + 1} must have at least 2 options.`);
        return false;
      }
    }
    return true;
  };

  // Save locally to device
  const handleSaveToDevice = () => {
    if (!validate()) return;
    if (isSavingLocal || isPublishing) return;

    setIsSavingLocal(true);
    try {
      addLocalAssessment({
        profileId: activeProfileId,
        title: title.trim(),
        subject: subject.trim(),
        durationMinutes: parseInt(durationMinutes, 10),
        totalQuestions: questions.length,
        questions,
        sourcePdfName: sourceFilename,
        extractionNotes: extractedData.extractionNotes,
      });
      setIsSavingLocal(false);

      setFeedbackModal({
        visible: true,
        type: 'success',
        title: 'Assessment Created ✅',
        assessmentName: title.trim(),
        message: 'Assessment created successfully from PDF and saved to your device.',
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
        title: 'Save Failed',
        assessmentName: title.trim(),
        message: err?.message || 'Could not save assessment locally.',
        cancelText: 'Dismiss',
        retryText: 'Retry Save',
        onCancel: () => setFeedbackModal((prev) => ({ ...prev, visible: false })),
        onRetry: () => {
          setFeedbackModal((prev) => ({ ...prev, visible: false }));
          handleSaveToDevice();
        },
      });
    }
  };

  // Publish to MongoDB (Cloud Shared)
  const handlePublishToCloud = async () => {
    if (!validate()) return;
    if (isPublishing || isSavingLocal) return;

    setIsPublishing(true);

    const payload = {
      title: title.trim(),
      subject: subject.trim(),
      durationMinutes: parseInt(durationMinutes, 10),
      totalQuestions: questions.length,
      questions,
      sourcePdfName: sourceFilename,
      extractionNotes: extractedData.extractionNotes,
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
        message: result.error || 'Server error while publishing to MongoDB. Check connection or authorization.',
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

    // Cache the published document directly into state
    addPublishedAssessment(result.assessment);

    setFeedbackModal({
      visible: true,
      type: 'success',
      title: 'Assessment Published 🚀',
      assessmentName: title.trim(),
      message: 'Assessment extracted from PDF and published to MongoDB successfully for all users.',
      confirmText: 'Go to Library',
      onConfirm: () => {
        setFeedbackModal((prev) => ({ ...prev, visible: false }));
        navigation.navigate('Library');
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Review & Edit Extraction"
        subtitle={`${questions.length} questions extracted from PDF`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Admin notice banner if admin is logged in */}
        {isLoggedIn && (
          <View style={styles.adminBanner}>
            <Text style={styles.adminIcon}>🔑</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.adminTitle}>Admin Publishing Available</Text>
              <Text style={styles.adminSubtitle}>
                You are signed in as {admin?.username}. You can publish this extracted
                assessment to MongoDB for all users.
              </Text>
            </View>
          </View>
        )}

        {/* Assessment Settings Card */}
        <Card style={styles.headerSettingsCard}>
          <Text style={styles.settingLabel}>Assessment Title</Text>
          <TextInput
            style={styles.textInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Assessment Title"
            placeholderTextColor={COLORS.textDim}
          />

          <View style={styles.settingsRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Subject</Text>
              <TextInput
                style={styles.textInput}
                value={subject}
                onChangeText={setSubject}
                placeholder="Subject"
                placeholderTextColor={COLORS.textDim}
              />
            </View>
            <View style={{ width: 100 }}>
              <Text style={styles.settingLabel}>Minutes</Text>
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

        {/* AI Extraction Notes Banner */}
        {extractedData.extractionNotes && extractedData.extractionNotes.length > 0 && (
          <View style={styles.notesCard}>
            <Text style={styles.notesTitle}>🤖 Gemini Extraction Telemetry:</Text>
            {extractedData.extractionNotes.map((note, idx) => (
              <Text key={idx} style={styles.noteItem}>
                • {note}
              </Text>
            ))}
          </View>
        )}

        {/* Questions List */}
        <View style={styles.questionsHeader}>
          <Text style={styles.sectionTitle}>Questions Review</Text>
          <Text style={styles.sectionSubtitle}>
            Tap any answer option pill to set or change the verified correct key.
          </Text>
        </View>

        {questions.map((q, qIdx) => {
          const confidence = q.confidenceScore ? Math.round(q.confidenceScore * 100) : 90;
          const isUncertain = confidence < 80;

          return (
            <Card key={q.id || qIdx} style={styles.questionCard}>
              <View style={styles.qCardHeader}>
                <View style={styles.qBadgeRow}>
                  <Text style={styles.qNumber}>Question {qIdx + 1}</Text>
                  <View
                    style={[
                      styles.confidenceBadge,
                      isUncertain && styles.confidenceBadgeLow,
                    ]}
                  >
                    <Text
                      style={[
                        styles.confidenceText,
                        isUncertain && styles.confidenceTextLow,
                      ]}
                    >
                      {confidence}% Confidence
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteQuestion(qIdx)}
                  style={styles.deleteQBtn}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete question ${qIdx + 1}`}
                >
                  <Text style={styles.deleteQIcon}>Delete ✕</Text>
                </TouchableOpacity>
              </View>

              {/* Question Prompt */}
              <Text style={styles.fieldLabel}>Question Prompt:</Text>
              <TextInput
                style={[styles.textInput, styles.promptInput]}
                value={q.prompt}
                onChangeText={(t) => handleUpdatePrompt(qIdx, t)}
                multiline
              />

              {/* Options */}
              <Text style={styles.fieldLabel}>
                Options (Tap pill to mark as Correct Answer):
              </Text>
              <View style={styles.optionsList}>
                {q.options.map((opt, optIdx) => {
                  const isCorrect =
                    opt.id.toUpperCase() === q.correctOptionId.toUpperCase();

                  return (
                    <View key={opt.id || optIdx} style={styles.optionRow}>
                      <TouchableOpacity
                        onPress={() => handleSetCorrectOption(qIdx, opt.id)}
                        style={[
                          styles.correctToggleBtn,
                          isCorrect && styles.correctToggleBtnActive,
                        ]}
                        accessible={true}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isCorrect }}
                        accessibilityLabel={`Option ${opt.id}, ${
                          isCorrect ? 'Marked as correct' : 'Tap to mark as correct'
                        }`}
                      >
                        <Text
                          style={[
                            styles.correctToggleText,
                            isCorrect && styles.correctToggleTextActive,
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
                      />
                    </View>
                  );
                })}
              </View>

              {/* Explanation */}
              <Text style={styles.fieldLabel}>Correct Answer Rationale:</Text>
              <TextInput
                style={[styles.textInput, styles.explanationInput]}
                value={q.explanation || ''}
                onChangeText={(t) => handleUpdateExplanation(qIdx, t)}
                multiline
                placeholder="Explanation shown on results screen..."
                placeholderTextColor={COLORS.textDim}
              />
            </Card>
          );
        })}

        {/* Add Question Button */}
        <Button
          title="+ Add Question Manually"
          variant="outline"
          size="md"
          onPress={handleAddQuestion}
          style={{ marginVertical: SPACING.md }}
        />

        {/* Action Buttons */}
        <View style={styles.footerActions}>
          <Button
            title="Save Local Assessment (Device Only)"
            variant="primary"
            size="lg"
            loading={isSavingLocal}
            disabled={isSavingLocal || isPublishing}
            onPress={handleSaveToDevice}
          />

          <Button
            title="🚀 Publish to MongoDB (Cloud Shared)"
            variant="secondary"
            size="lg"
            loading={isPublishing}
            disabled={isPublishing || isSavingLocal}
            onPress={handlePublishToCloud}
            accessibilityHint="Stores and publishes extracted assessment directly to MongoDB for all users"
          />
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
  adminBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  adminIcon: {
    fontSize: 20,
  },
  adminTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryLight,
  },
  adminSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  headerSettingsCard: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  settingLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 4,
    marginTop: 6,
  },
  settingsRow: {
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
  notesCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  noteItem: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  questionsHeader: {
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
    marginBottom: SPACING.sm,
  },
  qBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  qNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  confidenceBadge: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  confidenceBadgeLow: {
    backgroundColor: COLORS.warningLight,
    borderColor: COLORS.warning,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.success,
  },
  confidenceTextLow: {
    color: COLORS.warning,
  },
  deleteQBtn: {
    padding: 4,
  },
  deleteQIcon: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.danger,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDim,
    marginTop: SPACING.sm,
    marginBottom: 4,
  },
  promptInput: {
    minHeight: 56,
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
  correctToggleBtn: {
    width: 44,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  correctToggleBtnActive: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  correctToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  correctToggleTextActive: {
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
  footerActions: {
    gap: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.xxl,
  },
});
