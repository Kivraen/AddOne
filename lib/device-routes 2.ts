import { Href } from "expo-router";

export function deviceSettingsPath(deviceId: string) {
  return `/devices/${deviceId}/settings` as Href;
}

export function deviceSettingsSectionPath(
  deviceId: string,
  section: "appearance" | "colors" | "routine",
) {
  return `/devices/${deviceId}/settings/${section}` as Href;
}

export function deviceRecoveryPath(deviceId: string) {
  return `/devices/${deviceId}/recovery` as Href;
}

export function deviceHistoryPath(deviceId: string) {
  return `/devices/${deviceId}/history` as Href;
}
