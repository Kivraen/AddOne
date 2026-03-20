const { getDefaultConfig } = require("expo/metro-config");
const exclusionList =
  require(require.resolve("metro-config/package.json").replace("package.json", "src/defaults/exclusionList.js")).default;

const config = getDefaultConfig(__dirname);

// Keep Metro out of large backup/experiment folders that are not part of the app bundle.
config.resolver.blockList = exclusionList([/[/\\]AddOne-Experiments[/\\].*/, /[/\\]node_modules_sdk54_backup[/\\].*/]);

module.exports = config;
