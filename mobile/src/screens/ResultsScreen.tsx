import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAssessmentStore } from '../store/useAssessmentStore';
import { useTestExecutionStore } from '../store/useTestExecutionStore';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

type FilterType = 'ALL' | 'CORRECT' | 'INCORRECT' | 'UNANSWERED';

export const ResultsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { sessionId } = route.params;
  const { getSessionById, assessments, activeProfileId } = useAssessmentStore();
  const { initTest } = useTestExecutionStore();

  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

  const session = getSessionById(sessionId);
  const assessment = session
    ? assessments.find((a) => a.id === session.assessmentId)
    : undefined;

  const questionsWithReview = useMemo(() => {
    if (!session || !assessment) return [];

    return assessment.questions.map((q, idx) => {
      const userAnswerId = session.answers[q.id];
      const isAnswered = Boolean(userAnswerId);
      const isCorrect =
        isAnswered &&
        userAnswerId?.toUpperCase() === q.correctOptionId.toUpperCase();
      const isIncorrect = isAnswered && !isCorrect;
      const isUnanswered = !isAnswered;
      const timeSpent = session.questionTimesSeconds[q.id] || 0;

      return {
        questionNumber: idx + 1,
        question: q,
        userAnswerId,
        isAnswered,
        isCorrect,
        isIncorrect,
        isUnanswered,
        timeSpent,
      };
    });
  }, [session, assessment]);

  const filteredQuestions = useMemo(() => {
    switch (activeFilter) {
      case 'CORRECT':
        return questionsWithReview.filter((item) => item.isCorrect);
      case 'INCORRECT':
        return questionsWithReview.filter((item) => item.isIncorrect);
      case 'UNANSWERED':
        return questionsWithReview.filter((item) => item.isUnanswered);
      case 'ALL':
      default:
        return questionsWithReview;
    }
  }, [questionsWithReview, activeFilter]);

  if (!session || !assessment) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Session Not Found</Text>
          <Button
            title="Go to Library"
            onPress={() => navigation.navigate('Library')}
            style={{ marginTop: SPACING.md }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const handleRetake = () => {
    initTest(assessment, activeProfileId);
    navigation.replace('TestRunner', { assessmentId: assessment.id });
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  const avgSecondsPerQ = Math.round(
    session.totalDurationSeconds / (session.totalQuestions || 1)
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Assessment Results"
        subtitle={session.assessmentTitle}
        onBack={() => navigation.navigate('Library')}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Hero Score Card */}
        <Card style={styles.scoreHeroCard}>
          <View style={styles.scoreBadgeCircle}>
            <Text style={styles.scorePercentageText}>
              {session.scorePercentage}%
            </Text>
            <Text style={styles.scorePointsText}>
              {session.totalCorrect} / {session.totalQuestions}
            </Text>
          </View>

          <Text style={styles.heroResultTitle}>
            {session.scorePercentage >= 80
              ? 'Outstanding Mastery! 🏆'
              : session.scorePercentage >= 60
              ? 'Solid Performance! 👍'
              : 'Keep Practicing! 📖'}
          </Text>

          {/* Quick Metrics */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Total Time</Text>
              <Text style={styles.metricValue}>
                {formatSeconds(session.totalDurationSeconds)}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Avg Pace</Text>
              <Text style={styles.metricValue}>{avgSecondsPerQ}s / q</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Subject</Text>
              <Text style={styles.metricValue} numberOfLines={1}>
                {session.subject}
              </Text>
            </View>
          </View>
        </Card>

        {/* Filter Pills */}
        <View style={styles.filterTabsRow}>
          <TouchableOpacity
            onPress={() => setActiveFilter('ALL')}
            style={[
              styles.filterTab,
              activeFilter === 'ALL' && styles.filterTabActive,
            ]}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'ALL' && styles.filterTabTextActive,
              ]}
            >
              All ({session.totalQuestions})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveFilter('CORRECT')}
            style={[
              styles.filterTab,
              activeFilter === 'CORRECT' && styles.filterTabActive,
            ]}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'CORRECT' && styles.filterTabTextActive,
              ]}
            >
              Correct ({session.totalCorrect})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveFilter('INCORRECT')}
            style={[
              styles.filterTab,
              activeFilter === 'INCORRECT' && styles.filterTabActive,
            ]}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'INCORRECT' && styles.filterTabTextActive,
              ]}
            >
              Incorrect ({session.totalIncorrect})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveFilter('UNANSWERED')}
            style={[
              styles.filterTab,
              activeFilter === 'UNANSWERED' && styles.filterTabActive,
            ]}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'UNANSWERED' && styles.filterTabTextActive,
              ]}
            >
              Blank ({session.totalUnanswered})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Question-by-Question Review List */}
        <View style={styles.reviewList}>
          {filteredQuestions.map(
            ({
              questionNumber,
              question,
              userAnswerId,
              isCorrect,
              isIncorrect,
              isUnanswered,
              timeSpent,
            }) => {
              return (
                <Card key={question.id} style={styles.reviewCard}>
                  {/* Status header */}
                  <View style={styles.qReviewHeader}>
                    <Text style={styles.qReviewNumber}>
                      Question {questionNumber}
                    </Text>

                    <View style={styles.badgesRow}>
                      <View style={styles.timeSpentBadge}>
                        <Text style={styles.timeSpentText}>⏱ {timeSpent}s</Text>
                      </View>

                      {isCorrect && (
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: COLORS.successLight },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              { color: COLORS.success },
                            ]}
                          >
                            ✓ Correct
                          </Text>
                        </View>
                      )}

                      {isIncorrect && (
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: COLORS.dangerLight },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              { color: COLORS.danger },
                            ]}
                          >
                            ✕ Incorrect
                          </Text>
                        </View>
                      )}

                      {isUnanswered && (
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: COLORS.surfaceElevated },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              { color: COLORS.textMuted },
                            ]}
                          >
                            ○ Left Blank
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Question Prompt */}
                  <Text style={styles.reviewPrompt}>{question.prompt}</Text>

                  {/* Options breakdown */}
                  <View style={styles.reviewOptionsList}>
                    {question.options.map((opt) => {
                      const isOptionCorrect =
                        opt.id.toUpperCase() ===
                        question.correctOptionId.toUpperCase();
                      const isOptionSelected =
                        userAnswerId?.toUpperCase() === opt.id.toUpperCase();

                      let optContainerStyle = styles.reviewOption;
                      let badgeIcon = opt.id;

                      if (isOptionCorrect && isOptionSelected) {
                        optContainerStyle = styles.reviewOptionCorrect;
                        badgeIcon = `${opt.id} ✓`;
                      } else if (isOptionCorrect && !isOptionSelected) {
                        optContainerStyle = styles.reviewOptionKey;
                        badgeIcon = `${opt.id} ★`;
                      } else if (isOptionSelected && !isOptionCorrect) {
                        optContainerStyle = styles.reviewOptionIncorrect;
                        badgeIcon = `${opt.id} ✕`;
                      }

                      return (
                        <View key={opt.id} style={optContainerStyle}>
                          <View style={styles.optLetterBox}>
                            <Text style={styles.optLetterText}>{badgeIcon}</Text>
                          </View>
                          <Text style={styles.optReviewText}>{opt.text}</Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Answer Summary Callout */}
                  <View style={styles.answerKeySummary}>
                    <Text style={styles.keySummaryText}>
                      Your Answer: {userAnswerId ? userAnswerId : '(None)'} • Correct Answer: {question.correctOptionId}
                    </Text>
                  </View>

                  {/* Gemini Explanation Rationale */}
                  {question.explanation && (
                    <View style={styles.explanationBox}>
                      <Text style={styles.explanationTitle}>
                        💡 Solution & Rationale:
                      </Text>
                      <Text style={styles.explanationContent}>
                        {question.explanation}
                      </Text>
                    </View>
                  )}
                </Card>
              );
            }
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsFooter}>
          <Button
            title="Retake Assessment"
            variant="outline"
            size="lg"
            onPress={handleRetake}
            style={{ flex: 1 }}
          />
          <Button
            title="Library"
            variant="primary"
            size="lg"
            onPress={() => navigation.navigate('Library')}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
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
  scoreHeroCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  scoreBadgeCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.primary,
    marginBottom: SPACING.md,
  },
  scorePercentageText: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  scorePointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  heroResultTitle: {
    ...TYPOGRAPHY.titleMedium,
    color: COLORS.text,
    textAlign: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    marginTop: SPACING.md,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: COLORS.textDim,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: SPACING.xs + 2,
    marginBottom: SPACING.md,
  },
  filterTab: {
    flex: 1,
    paddingVertical: SPACING.xs + 4,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  filterTabTextActive: {
    color: COLORS.primaryLight,
    fontWeight: '700',
  },
  reviewList: {
    gap: SPACING.md,
  },
  reviewCard: {
    padding: SPACING.md,
  },
  qReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  qReviewNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeSpentBadge: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  timeSpentText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accent,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reviewPrompt: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  reviewOptionsList: {
    gap: 6,
    marginBottom: SPACING.sm,
  },
  reviewOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  reviewOptionCorrect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.success,
    gap: SPACING.sm,
  },
  reviewOptionKey: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.success,
    gap: SPACING.sm,
  },
  reviewOptionIncorrect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    gap: SPACING.sm,
  },
  optLetterBox: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  optLetterText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  optReviewText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.text,
    flex: 1,
  },
  answerKeySummary: {
    backgroundColor: COLORS.surfaceElevated,
    padding: SPACING.xs + 4,
    borderRadius: RADIUS.sm,
    marginVertical: SPACING.xs,
  },
  keySummaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  explanationBox: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
    marginTop: SPACING.xs,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.info,
  },
  explanationTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.info,
    marginBottom: 4,
  },
  explanationContent: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  actionsFooter: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
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
});
