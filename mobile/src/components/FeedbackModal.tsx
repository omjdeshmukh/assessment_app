import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { Button } from './Button';

export type FeedbackModalType = 'confirm-delete' | 'success' | 'error' | 'loading' | 'info';

export interface FeedbackModalProps {
  visible: boolean;
  type: FeedbackModalType;
  title: string;
  message: string;
  assessmentName?: string;
  itemName?: string;
  itemLabel?: string;
  confirmText?: string;
  cancelText?: string;
  retryText?: string;
  isLoading?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  visible,
  type,
  title,
  message,
  assessmentName,
  itemName,
  itemLabel,
  confirmText,
  cancelText = 'Cancel',
  retryText = 'Try Again',
  isLoading = false,
  onConfirm,
  onCancel,
  onRetry,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'confirm-delete':
        return '🗑️';
      case 'success':
        return '✅';
      case 'error':
        return '⚠️';
      case 'loading':
        return '⏳';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  const getIconBackground = () => {
    switch (type) {
      case 'confirm-delete':
      case 'error':
        return COLORS.dangerLight;
      case 'success':
        return COLORS.successLight;
      case 'loading':
        return 'rgba(99, 102, 241, 0.15)';
      case 'info':
      default:
        return 'rgba(6, 182, 212, 0.15)';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={isLoading ? undefined : onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          {/* Header Icon */}
          <View style={[styles.iconContainer, { backgroundColor: getIconBackground() }]}>
            {type === 'loading' ? (
              <ActivityIndicator size="large" color={COLORS.primary} />
            ) : (
              <Text style={styles.iconText}>{getIcon()}</Text>
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Named Item / Assessment Highlight (if provided) */}
          {(itemName || assessmentName) ? (
            <View style={styles.assessmentHighlightBox}>
              <Text style={styles.assessmentHighlightLabel}>
                {itemLabel || (assessmentName ? 'Assessment:' : 'Target:')}
              </Text>
              <Text style={styles.assessmentHighlightName} numberOfLines={2}>
                "{itemName || assessmentName}"
              </Text>
            </View>
          ) : null}

          {/* Detailed Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {type === 'confirm-delete' && (
              <View style={styles.actionRow}>
                <Button
                  title={cancelText}
                  variant="outline"
                  size="md"
                  onPress={onCancel || (() => {})}
                  disabled={isLoading}
                  style={{ flex: 1 }}
                />
                <Button
                  title={isLoading ? 'Deleting...' : (confirmText || 'Delete')}
                  variant="danger"
                  size="md"
                  loading={isLoading}
                  disabled={isLoading}
                  onPress={onConfirm || (() => {})}
                  style={{ flex: 1 }}
                />
              </View>
            )}

            {type === 'success' && (
              <Button
                title={confirmText || 'OK'}
                variant="primary"
                size="md"
                onPress={onConfirm || onCancel || (() => {})}
                style={{ width: '100%' }}
              />
            )}

            {type === 'error' && (
              onRetry ? (
                <View style={styles.actionRow}>
                  <Button
                    title={cancelText || 'Dismiss'}
                    variant="outline"
                    size="md"
                    onPress={onCancel || (() => {})}
                    disabled={isLoading}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title={isLoading ? 'Retrying...' : retryText}
                    variant="primary"
                    size="md"
                    loading={isLoading}
                    disabled={isLoading}
                    onPress={onRetry}
                    style={{ flex: 1 }}
                  />
                </View>
              ) : (
                <Button
                  title={cancelText || 'Dismiss'}
                  variant="outline"
                  size="md"
                  onPress={onCancel || (() => {})}
                  style={{ width: '100%' }}
                />
              )
            )}

            {type === 'loading' && (
              <View style={styles.loadingBox}>
                <Text style={styles.loadingText}>Please wait, processing...</Text>
              </View>
            )}

            {type === 'info' && (
              <Button
                title={confirmText || 'OK'}
                variant="primary"
                size="md"
                onPress={onConfirm || onCancel || (() => {})}
                style={{ width: '100%' }}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  dialog: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconText: {
    fontSize: 30,
  },
  title: {
    ...TYPOGRAPHY.titleMedium,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  assessmentHighlightBox: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginVertical: SPACING.sm,
    width: '100%',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  assessmentHighlightLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  assessmentHighlightName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  message: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginVertical: SPACING.sm,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    marginTop: SPACING.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textDim,
  },
});
