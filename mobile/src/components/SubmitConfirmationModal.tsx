import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { Button } from './Button';

interface SubmitConfirmationModalProps {
  visible: boolean;
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  flaggedCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export const SubmitConfirmationModal: React.FC<SubmitConfirmationModalProps> = ({
  visible,
  totalQuestions,
  answeredCount,
  unansweredCount,
  flaggedCount,
  onCancel,
  onConfirm,
}) => {
  const hasUnanswered = unansweredCount > 0;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={styles.iconContainer}>
            <Text style={styles.warningIcon}>
              {hasUnanswered ? '⚠️' : '🎯'}
            </Text>
          </View>

          <Text style={styles.title}>Submit Assessment?</Text>

          <Text style={styles.description}>
            {hasUnanswered
              ? `You still have ${unansweredCount} unanswered ${
                  unansweredCount === 1 ? 'question' : 'questions'
                }. Unanswered questions will receive zero points.`
              : 'You have answered all questions. Are you ready to see your results?'}
          </Text>

          {/* Breakdown summary */}
          <View style={styles.summaryBox}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Questions:</Text>
              <Text style={styles.statValue}>{totalQuestions}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Answered:</Text>
              <Text style={[styles.statValue, { color: COLORS.success }]}>
                {answeredCount}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Unanswered:</Text>
              <Text
                style={[
                  styles.statValue,
                  { color: hasUnanswered ? COLORS.danger : COLORS.textMuted },
                ]}
              >
                {unansweredCount}
              </Text>
            </View>
            {flaggedCount > 0 && (
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Marked for Review:</Text>
                <Text style={[styles.statValue, { color: COLORS.warning }]}>
                  {flaggedCount}
                </Text>
              </View>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.buttonRow}>
            <Button
              title={hasUnanswered ? 'Review Questions' : 'Go Back'}
              variant="outline"
              size="md"
              onPress={onCancel}
              style={{ flex: 1 }}
            />
            <Button
              title="Yes, Submit"
              variant={hasUnanswered ? 'danger' : 'primary'}
              size="md"
              onPress={onConfirm}
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  dialog: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  warningIcon: {
    fontSize: 28,
  },
  title: {
    ...TYPOGRAPHY.titleMedium,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  description: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  summaryBox: {
    width: '100%',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
});
