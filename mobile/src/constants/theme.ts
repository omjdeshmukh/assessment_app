export const COLORS = {
  // Brand Accents
  primary: '#6366F1', // Indigo 500
  primaryHover: '#4F46E5', // Indigo 600
  primaryLight: '#EEF2FF',
  primaryDark: '#3730A3',
  secondary: '#8B5CF6', // Violet 500
  accent: '#06B6D4', // Cyan 500

  // Neutral Backgrounds
  background: '#0B0F19', // Deep dark
  surface: '#151D2F', // Slate card surface
  surfaceElevated: '#1E293B', // Slate 800
  surfaceSubtle: '#27354E',

  // Borders & Dividers
  border: '#243046',
  borderHighlight: '#3B4D6E',

  // Text Hierarchy
  text: '#F8FAFC', // Slate 50
  textMuted: '#94A3B8', // Slate 400
  textDim: '#64748B', // Slate 500
  textInverse: '#0F172A',

  // Status & Assessment States
  success: '#10B981', // Emerald 500
  successLight: 'rgba(16, 185, 129, 0.15)',
  danger: '#EF4444', // Red 500
  dangerLight: 'rgba(239, 68, 68, 0.15)',
  warning: '#F59E0B', // Amber 500
  warningLight: 'rgba(245, 158, 11, 0.15)',
  info: '#38BDF8', // Sky 400
  unanswered: '#475569', // Slate 600
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 9999,
};

export const TYPOGRAPHY = {
  titleLarge: {
    fontSize: 28,
    fontWeight: '800' as const,
    lineHeight: 34,
    color: COLORS.text,
  },
  titleMedium: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
    color: COLORS.text,
  },
  titleSmall: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
    color: COLORS.text,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 22,
    color: COLORS.text,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: COLORS.textMuted,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    color: COLORS.textDim,
  },
  badge: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
};
