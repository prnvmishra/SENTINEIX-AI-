export const colors = {
  background: "#070b14",
  surface: "#0c1220",
  surfaceRaised: "#121a2b",
  border: "#1a2438",
  borderStrong: "#2a3752",
  primary: "#2dd4bf",
  primaryDim: "#0f766e",
  primaryGlow: "#5eead4",
  danger: "#f43f5e",
  dangerDim: "#881337",
  success: "#34d399",
  successDim: "#065f46",
  warning: "#fbbf24",
  warningDim: "#78350f",
  textPrimary: "#f1f5f9",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
} as const;

export const threatLevelColor = {
  low: colors.success,
  elevated: colors.warning,
  high: "#fb7185",
  critical: colors.danger,
} as const;

export type ThemeColorKey = keyof typeof colors;
