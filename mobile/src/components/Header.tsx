import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightElement,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightElement && <View style={styles.rightContainer}>{rightElement}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: SPACING.sm + 2,
    padding: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
  },
  titleContainer: {
    flex: 1,
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
  rightContainer: {
    marginLeft: SPACING.sm,
  },
});
