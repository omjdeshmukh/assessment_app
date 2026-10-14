import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

interface TimerBadgeProps {
  seconds: number;
  label?: string;
  isWarning?: boolean;
}

export const TimerBadge: React.FC<TimerBadgeProps> = ({
  seconds,
  label = 'Total Time',
  isWarning = false,
}) => {
  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, isWarning && styles.warningContainer]}>
      <Text style={styles.clockIcon}>⏱</Text>
      <View>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <Text style={[styles.timeText, isWarning && styles.warningText]}>
          {formatTime(seconds)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.sm + 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs + 2,
  },
  warningContainer: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerLight,
  },
  clockIcon: {
    fontSize: 14,
  },
  label: {
    fontSize: 9,
    color: COLORS.textDim,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: COLORS.text,
  },
  warningText: {
    color: COLORS.danger,
  },
});
