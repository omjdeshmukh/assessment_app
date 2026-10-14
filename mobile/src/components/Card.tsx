import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  highlighted?: boolean;
  accessibilityLabel?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  highlighted = false,
  accessibilityLabel,
}) => {
  const content = (
    <View
      style={[
        styles.card,
        highlighted && styles.highlighted,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  highlighted: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceElevated,
  },
});
