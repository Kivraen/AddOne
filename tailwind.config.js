/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./providers/**/*.{ts,tsx}", "./hooks/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#070707",
          surface: "#101010",
          elevated: "#171717",
        },
        stroke: {
          subtle: "#232323",
        },
        text: {
          primary: "#F2EEE6",
          secondary: "#B2ACA2",
          tertiary: "#7B766E",
        },
        accent: {
          amber: "#C7904A",
        },
        status: {
          errorMuted: "#8F4E46",
        },
        overlay: {
          scrim: "rgba(0,0,0,0.45)",
        },
      },
      fontFamily: {
        body: ["SpaceGrotesk_400Regular"],
        medium: ["SpaceGrotesk_500Medium"],
        semibold: ["SpaceGrotesk_600SemiBold"],
        display: ["SpaceGrotesk_700Bold"],
      },
      borderRadius: {
        sheet: "28px",
      },
      boxShadow: {
        none: "0 0 #0000",
      },
    },
  },
  plugins: [],
};
