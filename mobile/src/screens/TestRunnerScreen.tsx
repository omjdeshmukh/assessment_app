import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useTestExecutionStore } from '../store/useTestExecutionStore';
import { useAssessmentStore } from '../store/useAssessmentStore';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { TimerBadge } from '../components/TimerBadge';
import { QuestionPaletteModal } from '../components/QuestionPaletteModal';
import { SubmitConfirmationModal } from '../components/SubmitConfirmationModal';

type Props = NativeStackScreenProps<RootStackParamList, 'TestRunner'>;

export const TestRunnerScreen: React.FC<Props> = ({ navigation }) => {
  const {
    assessment,
    currentQuestionIndex,
    answers,
    flaggedQuestionIds,
    totalElapsedSeconds,
    questionTimesSeconds,
    isPaletteModalOpen,
    isSubmitModalOpen,
    selectOption,
    toggleFlagCurrentQuestion,
    nextQuestion,
    prevQuestion,
    goToQuestion,
    tickTimer,
    setPaletteModalOpen,
    setSubmitModalOpen,
    finalizeSubmission,
  } = useTestExecutionStore();

  const { saveSession } = useAssessmentStore();

  // Active Timer Tick Loop
  useEffect(() => {
    const timer = setInterval(() => {
      tickTimer();
    }, 1000);

    return () => clearInterval(timer);
  }, [tickTimer]);

  if (!assessment || !assessment.questions || assessment.questions.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>No Active Assessment</Text>
          <Text style={styles.errorSub}>Please select a test from the library.</Text>
          <Button
            title="Return to Library"
            onPress={() => navigation.navigate('Library')}
            style={{ marginTop: SPACING.md }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const currentQ = assessment.questions[currentQuestionIndex];
  const totalQuestions = assessment.questions.length;
  const isFlagged = flaggedQuestionIds.includes(currentQ.id);
  const selectedOptionId = answers[currentQ.id];
  const currentQTimeSpent = questionTimesSeconds[currentQ.id] || 0;

  const answeredIds = Object.keys(answers);
  const answeredCount = answeredIds.length;
  const unansweredCount = totalQuestions - answeredCount;

  const handleExitTest = () => {
    Alert.alert(
      'Exit Assessment?',
      'Are you sure you want to quit? Your current progress will be lost.',
      [
        { text: 'Continue Test', style: 'cancel' },
        {
          text: 'Quit',
          style: 'destructive',
          onPress: () => navigation.navigate('Library'),
        },
      ]
    );
  };

  const handleConfirmSubmit = () => {
    const session = finalizeSubmission();
    if (session) {
      saveSession(session);
      navigation.replace('Results', { sessionId: session.id });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header with Dual Timers */}
      <Header
        title={assessment.title}
        subtitle={`${assessment.subject} • Q ${currentQuestionIndex + 1} of ${totalQuestions}`}
        onBack={handleExitTest}
        rightElement={
          <View style={styles.headerRightRow}>
            <TimerBadge seconds={totalElapsedSeconds} label="Total" />
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Question Telemetry Bar */}
        <View style={styles.telemetryBar}>
          <View style={styles.qProgressBadge}>
            <Text style={styles.qProgressText}>
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </Text>
          </View>

          {/* Time spent on THIS question */}
          <View style={styles.perQuestionTimeBadge}>
            <Text style={styles.perQuestionTimeText}>
              ⏱ Q-Pace: {currentQTimeSpent}s
            </Text>
          </View>

          {/* Flag Toggle */}
          <TouchableOpacity
            onPress={toggleFlagCurrentQuestion}
            style={[
              styles.flagButton,
              isFlagged && styles.flagButtonActive,
            ]}
            accessible={true}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isFlagged }}
            accessibilityLabel={`Flag question ${currentQuestionIndex + 1} for review`}
          >
            <Text style={styles.flagIcon}>{isFlagged ? '🚩 Flagged' : '🏳️ Flag'}</Text>
          </TouchableOpacity>
        </View>

        {/* Question Prompt Card */}
        <Card style={styles.promptCard}>
          <Text style={styles.promptText}>{currentQ.prompt}</Text>
        </Card>

        {/* Options List - Absolutely NO correct answer revealed during the test */}
        <Text style={styles.optionsLabel}>SELECT YOUR ANSWER:</Text>
        <View style={styles.optionsList}>
          {currentQ.options.map((option) => {
            const isSelected = selectedOptionId === option.id;

            return (
              <TouchableOpacity
                key={option.id}
                onPress={() => selectOption(currentQ.id, option.id)}
                activeOpacity={0.8}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                ]}
                accessible={true}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Option ${option.id}: ${option.text}. ${
                  isSelected ? 'Selected' : 'Not selected'
                }`}
              >
                <View
                  style={[
                    styles.radioCircle,
                    isSelected && styles.radioCircleSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.radioLetter,
                      isSelected && styles.radioLetterSelected,
                    ]}
                  >
                    {option.id}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                  ]}
                >
                  {option.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Sticky Navigation Bar */}
      <View style={styles.bottomBar}>
        <Button
          title="← Prev"
          variant="outline"
          size="md"
          onPress={prevQuestion}
          disabled={currentQuestionIndex === 0}
          style={styles.navButton}
        />

        <Button
          title={`Palette (${answeredCount}/${totalQuestions})`}
          variant="secondary"
          size="md"
          onPress={() => setPaletteModalOpen(true)}
          style={styles.paletteButton}
          accessibilityLabel="Open question review palette grid"
        />

        {currentQuestionIndex < totalQuestions - 1 ? (
          <Button
            title="Next →"
            variant="primary"
            size="md"
            onPress={nextQuestion}
            style={styles.navButton}
          />
        ) : (
          <Button
            title="Finish 🏁"
            variant="danger"
            size="md"
            onPress={() => setSubmitModalOpen(true)}
            style={styles.navButton}
            accessibilityLabel="Submit assessment for grading"
          />
        )}
      </View>

      {/* Question Palette Modal */}
      <QuestionPaletteModal
        visible={isPaletteModalOpen}
        totalQuestions={totalQuestions}
        currentIndex={currentQuestionIndex}
        answeredQuestionIds={answeredIds}
        flaggedQuestionIds={flaggedQuestionIds}
        questionIds={assessment.questions.map((q) => q.id)}
        questionTimesSeconds={questionTimesSeconds}
        onSelectQuestion={(idx) => goToQuestion(idx)}
        onClose={() => setPaletteModalOpen(false)}
        onSubmit={() => setSubmitModalOpen(true)}
      />

      {/* Submit Confirmation Modal (Warns about unanswered questions) */}
      <SubmitConfirmationModal
        visible={isSubmitModalOpen}
        totalQuestions={totalQuestions}
        answeredCount={answeredCount}
        unansweredCount={unansweredCount}
        flaggedCount={flaggedQuestionIds.length}
        onCancel={() => setSubmitModalOpen(false)}
        onConfirm={handleConfirmSubmit}
      />
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
    paddingBottom: 100,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  telemetryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  qProgressBadge: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qProgressText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  perQuestionTimeBadge: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
  },
  perQuestionTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
  },
  flagButton: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  flagButtonActive: {
    backgroundColor: COLORS.warningLight,
    borderColor: COLORS.warning,
  },
  flagIcon: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.warning,
  },
  promptCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  promptText: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 24,
  },
  optionsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDim,
    letterSpacing: 0.6,
    marginBottom: SPACING.sm,
  },
  optionsList: {
    gap: SPACING.sm + 2,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceElevated,
  },
  radioCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: COLORS.borderHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
  },
  radioCircleSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  radioLetter: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  radioLetterSelected: {
    color: '#FFF',
  },
  optionText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.text,
    flex: 1,
    lineHeight: 20,
  },
  optionTextSelected: {
    color: COLORS.text,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  navButton: {
    flex: 1,
  },
  paletteButton: {
    flex: 1.2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorTitle: {
    ...TYPOGRAPHY.titleMedium,
    color: COLORS.text,
  },
  errorSub: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});
