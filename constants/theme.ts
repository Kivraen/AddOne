export const theme = {
  colors: {
    bgBase: "#050506",
    bgSurface: "#0B0C0E",
    bgElevated: "#141518",
    strokeSubtle: "#24272C",
    textPrimary: "#F4F5F7",
    textSecondary: "#AAB0B8",
    textTertiary: "#737A84",
    accentAmber: "#C7904A",
    statusErrorMuted: "#8F4E46",
    overlayScrim: "rgba(0,0,0,0.45)",
  },
  spacing: {
    4: 4,
    8: 8,
    12: 12,
    16: 16,
    24: 24,
    32: 32,
  },
  radius: {
    sm: 10,
    card: 16,
    sheet: 20,
    pill: 18,
  },
  typography: {
    display: { fontSize: 28, lineHeight: 32, fontFamily: "SpaceGrotesk_700Bold" as const },
    title: { fontSize: 20, lineHeight: 24, fontFamily: "SpaceGrotesk_600SemiBold" as const },
    body: { fontSize: 15, lineHeight: 22, fontFamily: "SpaceGrotesk_400Regular" as const },
    label: { fontSize: 13, lineHeight: 18, fontFamily: "SpaceGrotesk_500Medium" as const },
    micro: {
      fontSize: 11,
      lineHeight: 14,
      fontFamily: "SpaceGrotesk_500Medium" as const,
      letterSpacing: 0.9,
      textTransform: "uppercase" as const,
    },
  },
  motion: {
    press: { duration: 140 },
    board: { duration: 250 },
    sheet: { duration: 320 },
    reward: { duration: 420 },
  },
};

export type Theme = typeof theme;
