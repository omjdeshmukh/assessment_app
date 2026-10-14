import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { Button } from './Button';

interface QuestionPaletteModalProps {
  visible: boolean;
  totalQuestions: number;
  currentIndex: number;
  answeredQuestionIds: string[];
  flaggedQuestionIds: string[];
  questionIds: string[];
  questionTimesSeconds?: Record<string, number>;
  onSelectQuestion: (index: number) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export const QuestionPaletteModal: React.FC<QuestionPaletteModalProps> = ({
  visible,
  totalQuestions,
  currentIndex,
  answeredQuestionIds,
  flaggedQuestionIds,
  questionIds,
  questionTimesSeconds = {},
  onSelectQuestion,
  onClose,
  onSubmit,
}) => {
  const answeredCount = answeredQuestionIds.length;
  const unansweredCount = totalQuestions - answeredCount;
  const flaggedCount = flaggedQuestionIds.length;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Assessment Navigation</Text>
              <Text style={styles.subtitle}>Tap any question number to jump to it</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Close question palette"
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Status Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.legendText}>Answered ({answeredCount})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
              <Text style={styles.legendText}>Flagged ({flaggedCount})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.unanswered }]} />
              <Text style={styles.legendText}>Unanswered ({unansweredCount})</Text>
            </View>
          </View>

          {/* Grid of question buttons */}
          <ScrollView contentContainerStyle={styles.gridContainer}>
            <View style={styles.grid}>
              {questionIds.map((qId, index) => {
                const isCurrent = index === currentIndex;
                const isAnswered = answeredQuestionIds.includes(qId);
                const isFlagged = flaggedQuestionIds.includes(qId);
                const timeSpent = questionTimesSeconds[qId] || 0;

                let badgeBg = COLORS.surfaceElevated;
                let borderColor = COLORS.border;

                if (isAnswered) {
                  badgeBg = COLORS.success;
                  borderColor = COLORS.success;
                } else if (isFlagged) {
                  badgeBg = COLORS.warning;
                  borderColor = COLORS.warning;
                }

                return (
                  <TouchableOpacity
                    key={qId}
                    onPress={() => onSelectQuestion(index)}
                    style={[
                      styles.paletteItem,
                      { backgroundColor: badgeBg, borderColor },
                      isCurrent && styles.activeItem,
                    ]}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Question ${index + 1}, ${
                      isAnswered ? 'Answered' : 'Unanswered'
                    }, ${isFlagged ? 'Flagged' : ''}, spent ${timeSpent} seconds`}
                  >
                    <Text
                      style={[
                        styles.itemNumber,
                        isAnswered || isFlagged ? styles.itemNumberLight : styles.itemNumberMuted,
                      ]}
                    >
                      {index + 1}
                    </Text>
                    {isFlagged && (
                      <View style={styles.flagPin}>
                        <Text style={styles.flagIcon}>🚩</Text>
                      </View>
                    )}
                    {timeSpent > 0 && (
                      <Text style={styles.timeSpentMini}>{timeSpent}s</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.footer}>
            <Button
              title="Close Palette"
              variant="outline"
              size="md"
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <Button
              title="Review & Submit"
              variant="primary"
              size="md"
              onPress={() => {
                onClose();
                onSubmit();
              }}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS.text,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  closeIcon: {
    color: COLORS.textMuted,
    fontSize: 20,
    fontWeight: '700',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceElevated,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  gridContainer: {
    paddingVertical: SPACING.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  paletteItem: {
    width: 54,
    height: 54,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  activeItem: {
    borderColor: '#38BDF8',
    borderWidth: 3,
    transform: [{ scale: 1.05 }],
  },
  itemNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  itemNumberLight: {
    color: '#FFFFFF',
  },
  itemNumberMuted: {
    color: COLORS.textMuted,
  },
  flagPin: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  flagIcon: {
    fontSize: 10,
  },
  timeSpentMini: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginTop: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
