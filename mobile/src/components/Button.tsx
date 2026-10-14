import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const getContainerStyle = (): ViewStyle => {
    switch (variant) {
      case 'secondary':
        return { backgroundColor: COLORS.secondary };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: COLORS.primary,
        };
      case 'danger':
        return { backgroundColor: COLORS.danger };
      case 'ghost':
        return { backgroundColor: 'transparent' };
      case 'primary':
      default:
        return { backgroundColor: COLORS.primary };
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case 'outline':
        return { color: COLORS.primary };
      case 'ghost':
        return { color: COLORS.textMuted };
      case 'primary':
      case 'secondary':
      case 'danger':
      default:
        return { color: COLORS.text };
    }
  };

  const getSizeStyle = (): { container: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          container: { paddingVertical: SPACING.xs + 2, paddingHorizontal: SPACING.md },
          text: { fontSize: 13, fontWeight: '600' },
        };
      case 'lg':
        return {
          container: { paddingVertical: SPACING.md + 2, paddingHorizontal: SPACING.xl },
          text: { fontSize: 17, fontWeight: '700' },
        };
      case 'md':
      default:
        return {
          container: { paddingVertical: SPACING.sm + 4, paddingHorizontal: SPACING.lg },
          text: { fontSize: 15, fontWeight: '600' },
        };
    }
  };

  const sizeStyles = getSizeStyle();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[
        styles.base,
        getContainerStyle(),
        sizeStyles.container,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' ? COLORS.primary : COLORS.text}
        />
      ) : (
        <>
          {leftIcon}
          <Text style={[styles.textBase, getTextStyle(), sizeStyles.text, textStyle]}>
            {title}
          </Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  textBase: {
    letterSpacing: 0.2,
  },
  disabled: {
    opacity: 0.5,
  },
});
