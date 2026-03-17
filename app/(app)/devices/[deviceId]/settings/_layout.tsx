import { Stack, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";

import { useRoutedDevice } from "@/components/devices/device-route-context";
import { ScreenView } from "@/components/layout/screen-frame";
import { theme } from "@/constants/theme";
import { useDeviceActions } from "@/hooks/use-devices";
import { areSettingsDraftsEqual, buildSettingsPatchFromDraft, validateSettingsDraft } from "@/lib/device-settings";
import { deviceSettingsPath } from "@/lib/device-routes";
import { useDeviceSettingsDraftStore } from "@/store/device-settings-draft-store";

export default function DeviceSettingsLayout() {
  const router = useRouter();
  const device = useRoutedDevice();
  const { applySettingsDraft } = useDeviceActions();
  const baseDraft = useDeviceSettingsDraftStore((state) => state.baseDraft);
  const clearDraft = useDeviceSettingsDraftStore((state) => state.clearDraft);
  const draft = useDeviceSettingsDraftStore((state) => state.draft);
  const draftDeviceId = useDeviceSettingsDraftStore((state) => state.deviceId);
  const [guardDeviceId, setGuardDeviceId] = useState<string | null>(null);
  const hasCrossDeviceDirtyDraft =
    !!draftDeviceId &&
    draftDeviceId !== device.id &&
    !!baseDraft &&
    !!draft &&
    !areSettingsDraftsEqual(baseDraft, draft);
  const nextPatch = useMemo(
    () => (baseDraft && draft ? buildSettingsPatchFromDraft(baseDraft, draft) : null),
    [baseDraft, draft],
  );
  const draftIsValid = useMemo(() => (draft ? validateSettingsDraft(draft).isValid : false), [draft]);

  useEffect(() => {
    if (!hasCrossDeviceDirtyDraft) {
      if (guardDeviceId) {
        setGuardDeviceId(null);
      }
      return;
    }

    if (guardDeviceId === device.id || !draftDeviceId) {
      return;
    }

    setGuardDeviceId(device.id);
    const previousDeviceId = draftDeviceId;
    const canApply = draftIsValid && !!nextPatch;

    Alert.alert(
      "Resolve device changes first",
      canApply
        ? "You still have unpublished changes for another AddOne device. Apply or discard them before opening a different device."
        : "You still have unpublished changes for another AddOne device. Discard them before opening a different device.",
      [
        {
          style: "cancel",
          text: "Stay there",
          onPress: () => {
            router.replace(deviceSettingsPath(previousDeviceId));
          },
        },
        {
          style: "destructive",
          text: "Discard",
          onPress: () => {
            clearDraft();
          },
        },
        ...(canApply
          ? [
              {
                text: "Apply",
                onPress: () => {
                  void applySettingsDraft(nextPatch, previousDeviceId)
                    .then(() => {
                      clearDraft();
                    })
                    .catch((error) => {
                      Alert.alert(
                        "Couldn't apply changes",
                        error instanceof Error ? error.message : "The previous device did not confirm its settings.",
                      );
                      router.replace(deviceSettingsPath(previousDeviceId));
                    });
                },
              },
            ]
          : []),
      ],
    );
  }, [applySettingsDraft, clearDraft, device.id, draftDeviceId, draftIsValid, guardDeviceId, hasCrossDeviceDirtyDraft, nextPatch, router]);

  if (hasCrossDeviceDirtyDraft) {
    return (
      <ScreenView contentMaxWidth={theme.layout.narrowContentWidth}>
        <View style={{ flex: 1, justifyContent: "center", gap: 10 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.title.fontFamily,
              fontSize: theme.typography.title.fontSize,
              lineHeight: theme.typography.title.lineHeight,
              textAlign: "center",
            }}
          >
            Resolve settings changes
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
              textAlign: "center",
            }}
          >
            Finish, discard, or go back to the previous device before opening this one.
          </Text>
        </View>
      </ScreenView>
    );
  }

  return (
    <Stack
      screenOptions={{
        animation: "simple_push",
        contentStyle: { backgroundColor: theme.colors.bgBase },
        headerBackButtonDisplayMode: "minimal",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.colors.bgBase },
        headerTintColor: theme.colors.textPrimary,
        headerTitleAlign: "left",
      }}
    />
  );
}
