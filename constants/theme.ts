export const theme = {
  colors: {
    bgBase: "#070707",
    bgSurface: "#101010",
    bgElevated: "#171717",
    strokeSubtle: "#232323",
    textPrimary: "#F2EEE6",
    textSecondary: "#B2ACA2",
    textTertiary: "#7B766E",
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
    sm: 12,
    card: 20,
    sheet: 28,
    pill: 999,
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
