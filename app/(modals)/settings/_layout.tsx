import { Stack } from "expo-router";
import { useEffect } from "react";

import { useDeviceSettingsDraftStore } from "@/store/device-settings-draft-store";

export default function DeviceSettingsLayout() {
  const clearDraft = useDeviceSettingsDraftStore((state) => state.clearDraft);

  useEffect(() => {
    return () => {
      clearDraft();
    };
  }, [clearDraft]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
