import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

const STEPS = [
  'Uploading PDF securely to backend...',
  'Processing multimodal document pages with Gemini...',
  'Extracting question stems, options, and answer keys...',
  'Validating schema and scoring confidence...',
  'Preparing questions for review...',
];

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message,
}) => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!visible) {
      setStepIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1 < STEPS.length ? prev + 1 : prev));
    }, 2800);

    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.spinner} />
          <Text style={styles.title}>AI Assessment Engine</Text>
          <Text style={styles.currentStep}>{message || STEPS[stepIndex]}</Text>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(95, (stepIndex + 1) * 22)}%` },
              ]}
            />
          </View>
          <Text style={styles.tipText}>
            Gemini reads questions, figures, and answer keys directly from the document.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  spinner: {
    marginBottom: SPACING.md,
    transform: [{ scale: 1.2 }],
  },
  title: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  currentStep: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.primaryLight,
    textAlign: 'center',
    minHeight: 44,
    marginBottom: SPACING.md,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
  },
  tipText: {
    fontSize: 11,
    color: COLORS.textDim,
    textAlign: 'center',
  },
});
