const variant = process.env.APP_VARIANT?.trim() === "beta" ? "beta" : "development";
const isBeta = variant === "beta";

module.exports = {
  expo: {
    name: isBeta ? "AddOne Beta" : "AddOne",
    slug: "addone-app",
    scheme: isBeta ? "addone-beta" : "addone",
    version: "0.2.0",
    orientation: "default",
    userInterfaceStyle: "dark",
    assetBundlePatterns: ["**/*"],
    experiments: {
      typedRoutes: true,
    },
    plugins: [
      "expo-router",
      "expo-sharing",
      "@react-native-community/datetimepicker",
      "expo-image",
      [
        "expo-image-picker",
        {
          cameraPermission: "AddOne uses the camera so you can take a profile photo.",
          microphonePermission: false,
          photosPermission: "AddOne uses your photo library so you can choose a profile photo.",
        },
      ],
    ],
    ios: {
      bundleIdentifier: isBeta ? "studio.addone.beta" : "studio.addone.dev",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocalNetworkUsageDescription:
          "AddOne uses your local network during first-boot and recovery to send Wi-Fi credentials to your device.",
      },
    },
    android: {
      package: isBeta ? "studio.addone.beta" : "studio.addone.dev",
    },
    extra: {
      appVariant: variant,
      eas: {
        projectId: "fe435038-1f31-49e0-9317-9a9a48b1fa04",
      },
    },
  },
};
