const variant = process.env.APP_VARIANT?.trim() === "beta" ? "beta" : "development";
const isBeta = variant === "beta";

module.exports = {
  expo: {
    name: isBeta ? "AddOne Beta" : "AddOne",
    slug: "addone-app",
    scheme: isBeta ? "addone-beta" : "addone",
    version: "0.1.0",
    orientation: "default",
    userInterfaceStyle: "dark",
    assetBundlePatterns: ["**/*"],
    experiments: {
      typedRoutes: true,
    },
    plugins: ["expo-router"],
    ios: {
      bundleIdentifier: isBeta ? "studio.addone.beta" : "studio.addone.dev",
      infoPlist: {
        NSLocalNetworkUsageDescription:
          "AddOne uses your local network during first-boot and recovery to send Wi-Fi credentials to your device.",
      },
    },
    android: {
      package: isBeta ? "studio.addone.beta" : "studio.addone.dev",
    },
    extra: {
      appVariant: variant,
    },
  },
};
