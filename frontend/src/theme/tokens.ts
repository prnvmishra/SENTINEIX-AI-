export const colors = {
  background: "#050816",
  surface: "#111827",
  surfaceRaised: "#161f36",
  border: "#1f2937",
  borderStrong: "#263349",
  primary: "#06b6d4",
  primaryDim: "#0e7490",
  primaryGlow: "#22d3ee",
  danger: "#ef4444",
  dangerDim: "#7f1d1d",
  success: "#10b981",
  successDim: "#065f46",
  warning: "#f59e0b",
  warningDim: "#78350f",
  textPrimary: "#e5e7eb",
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
