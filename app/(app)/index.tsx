import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { PixelGrid } from "@/components/board/pixel-grid";
import { DevicePager } from "@/components/layout/device-pager";
import { ScreenFrame } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { IconButton } from "@/components/ui/icon-button";
import { PrimaryActionButton, PrimaryActionState } from "@/components/ui/primary-action-button";
import { SyncBadge } from "@/components/ui/sync-badge";
import { theme } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useDeviceActions, useDevices } from "@/hooks/use-devices";
import { buildBoardCells, getMergedPalette, targetStatusLabel } from "@/lib/board";
import { useAppUiStore } from "@/store/app-ui-store";
import { AddOneDevice } from "@/types/addone";

function boardButtonState(device: AddOneDevice, isApplyingToday: boolean): PrimaryActionState {
  if (isApplyingToday) {
    return "syncing";
  }

  if (!device.isLive) {
    return "disabled";
  }

  return device.days[device.today.weekIndex][device.today.dayIndex] ? "done" : "notDone";
}

function withPendingTodayState(device: AddOneDevice, pendingTodayState?: boolean): AddOneDevice {
  if (pendingTodayState === undefined) {
    return device;
  }

  const days = device.days.map((week) => [...week]);
  days[device.today.weekIndex][device.today.dayIndex] = pendingTodayState;

  return {
    ...device,
    days,
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const { mode, userEmail } = useAuth();
  const { activeDevice, activeDeviceId, devices, isLoading, setActiveDevice } = useDevices();
  const { cycleSyncState, isApplyingToday, toggleToday } = useDeviceActions();
  const pendingTodayStateByDevice = useAppUiStore((state) => state.pendingTodayStateByDevice);
  const initialPage = Math.max(0, devices.findIndex((device) => device.id === activeDeviceId));
  const activePendingTodayState = activeDeviceId ? pendingTodayStateByDevice[activeDeviceId] : undefined;
  const statusLine = activeDevice
    ? mode === "demo"
      ? `Demo preview · ${activeDevice.lastSyncedLabel}`
      : `${userEmail ?? "Signed in"} · ${activeDevice.lastSyncedLabel}`
    : null;
  const pages = useMemo(
    () =>
      devices.map((device) => {
        const effectiveDevice = withPendingTodayState(device, pendingTodayStateByDevice[device.id]);
        const palette = getMergedPalette(effectiveDevice.paletteId, effectiveDevice.customPalette);

        return {
          cells: buildBoardCells(effectiveDevice),
          device: effectiveDevice,
          palette,
        };
      }),
    [devices, pendingTodayStateByDevice],
  );

  if (isLoading) {
    return (
      <ScreenFrame>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14 }}>
          <ActivityIndicator color={theme.colors.textPrimary} />
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            Loading your boards…
          </Text>
        </View>
      </ScreenFrame>
    );
  }

  if (!activeDevice) {
    return (
      <ScreenFrame
        header={
          <View className="pb-5">
            <Text
              style={{
                color: theme.colors.textTertiary,
                fontFamily: theme.typography.micro.fontFamily,
                fontSize: theme.typography.micro.fontSize,
                lineHeight: theme.typography.micro.lineHeight,
                letterSpacing: theme.typography.micro.letterSpacing,
                textTransform: "uppercase",
              }}
            >
              {mode === "demo" ? "AddOne demo" : "AddOne cloud"}
            </Text>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.display.fontFamily,
                fontSize: theme.typography.display.fontSize,
                lineHeight: theme.typography.display.lineHeight,
                marginTop: 4,
              }}
            >
              No devices yet
            </Text>
          </View>
        }
      >
        <View style={{ flex: 1, justifyContent: "center", gap: 16 }}>
          <GlassCard style={{ gap: 12, paddingHorizontal: 18, paddingVertical: 18 }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.title.fontFamily,
                fontSize: theme.typography.title.fontSize,
                lineHeight: theme.typography.title.lineHeight,
              }}
            >
              Connect your first AddOne
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              Use onboarding to claim a device into this account. In demo mode, the board uses mock data instead.
            </Text>
          </GlassCard>

          <Pressable
            onPress={() => router.push("/onboarding")}
            style={{
              alignItems: "center",
              justifyContent: "center",
              minHeight: 58,
              borderRadius: theme.radius.sheet,
              backgroundColor: theme.colors.textPrimary,
            }}
          >
            <Text
              style={{
                color: theme.colors.bgBase,
                fontFamily: theme.typography.label.fontFamily,
                fontSize: theme.typography.label.fontSize,
                lineHeight: theme.typography.label.lineHeight,
              }}
            >
              Open onboarding
            </Text>
          </Pressable>
        </View>
      </ScreenFrame>
    );
  }

  const header = (
    <View className="pb-5">
      <View style={{ alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              color: theme.colors.textTertiary,
              fontFamily: theme.typography.micro.fontFamily,
              fontSize: theme.typography.micro.fontSize,
              lineHeight: theme.typography.micro.lineHeight,
              letterSpacing: theme.typography.micro.letterSpacing,
              textTransform: "uppercase",
            }}
          >
            {mode === "demo" ? "AddOne demo" : "AddOne cloud"}
          </Text>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.display.fontFamily,
              fontSize: theme.typography.display.fontSize,
              lineHeight: theme.typography.display.lineHeight,
            }}
          >
            {activeDevice.name}
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            {statusLine}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 10 }}>
          <SyncBadge
            onPress={() => void cycleSyncState()}
            state={isApplyingToday || activePendingTodayState !== undefined ? "syncing" : activeDevice.syncState}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <IconButton icon="people-outline" onPress={() => router.push("/shared")} />
            <IconButton icon="options-outline" onPress={() => router.push("/settings")} />
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenFrame header={header}>
      <View style={{ flex: 1 }}>
        <DevicePager
          initialPage={initialPage}
          onPageChange={(index) => {
            const next = devices[index];
            if (next) {
              setActiveDevice(next.id);
            }
          }}
        >
          {pages.map(({ cells, device, palette }) => (
            <View key={device.id} style={{ flex: 1, gap: 18, justifyContent: "space-between" }}>
              <GlassCard style={{ marginTop: 8, paddingHorizontal: 16, paddingVertical: 18 }}>
                <View style={{ gap: 16 }}>
                  <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
                    <Text
                      style={{
                        color: theme.colors.textTertiary,
                        fontFamily: theme.typography.micro.fontFamily,
                        fontSize: theme.typography.micro.fontSize,
                        lineHeight: theme.typography.micro.lineHeight,
                        letterSpacing: theme.typography.micro.letterSpacing,
                        textTransform: "uppercase",
                      }}
                    >
                      {device.ownerName}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textTertiary,
                        fontFamily: theme.typography.micro.fontFamily,
                        fontSize: theme.typography.micro.fontSize,
                        lineHeight: theme.typography.micro.lineHeight,
                        letterSpacing: theme.typography.micro.letterSpacing,
                        textTransform: "uppercase",
                      }}
                    >
                      {device.sharedViewers} viewers
                    </Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <PixelGrid cells={cells} mode="display" palette={palette} readOnly />
                  </View>
                </View>
              </GlassCard>

              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <GlassCard style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 14 }}>
                    <Text
                      style={{
                        color: theme.colors.textTertiary,
                        fontFamily: theme.typography.micro.fontFamily,
                        fontSize: theme.typography.micro.fontSize,
                        lineHeight: theme.typography.micro.lineHeight,
                        letterSpacing: theme.typography.micro.letterSpacing,
                        textTransform: "uppercase",
                      }}
                    >
                      Weekly target
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textPrimary,
                        fontFamily: theme.typography.label.fontFamily,
                        fontSize: theme.typography.label.fontSize,
                        lineHeight: theme.typography.label.lineHeight,
                        marginTop: 8,
                      }}
                    >
                      {targetStatusLabel(device)}
                    </Text>
                  </GlassCard>

                  <GlassCard style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 14 }}>
                    <Text
                      style={{
                        color: theme.colors.textTertiary,
                        fontFamily: theme.typography.micro.fontFamily,
                        fontSize: theme.typography.micro.fontSize,
                        lineHeight: theme.typography.micro.lineHeight,
                        letterSpacing: theme.typography.micro.letterSpacing,
                        textTransform: "uppercase",
                      }}
                    >
                      Reset
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textPrimary,
                        fontFamily: theme.typography.label.fontFamily,
                        fontSize: theme.typography.label.fontSize,
                        lineHeight: theme.typography.label.lineHeight,
                        marginTop: 8,
                      }}
                    >
                      {device.nextResetLabel}
                    </Text>
                  </GlassCard>
                </View>

                <Pressable
                  disabled={!device.isLive}
                  onPress={() => router.push("/history")}
                  style={{
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    borderRadius: theme.radius.card,
                    borderWidth: 1,
                    borderColor: "rgba(242, 238, 230, 0.08)",
                    backgroundColor: "rgba(23, 23, 23, 0.92)",
                    opacity: device.isLive ? 1 : 0.55,
                    paddingHorizontal: 16,
                    paddingVertical: 15,
                  }}
                >
                  <View style={{ gap: 4 }}>
                    <Text
                      style={{
                        color: theme.colors.textPrimary,
                        fontFamily: theme.typography.label.fontFamily,
                        fontSize: theme.typography.label.fontSize,
                        lineHeight: theme.typography.label.lineHeight,
                      }}
                    >
                      Edit history
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textSecondary,
                        fontFamily: theme.typography.body.fontFamily,
                        fontSize: theme.typography.body.fontSize,
                        lineHeight: theme.typography.body.lineHeight,
                      }}
                    >
                      Correct day cells directly on the board.
                    </Text>
                    {!device.isLive ? (
                      <Text
                        style={{
                          color: theme.colors.statusErrorMuted,
                          fontFamily: theme.typography.body.fontFamily,
                          fontSize: theme.typography.body.fontSize,
                          lineHeight: theme.typography.body.lineHeight,
                        }}
                      >
                        Available only while the device is live.
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons color={theme.colors.textSecondary} name="chevron-forward" size={18} />
                </Pressable>
              </View>

              <View style={{ gap: 16, paddingBottom: 8 }}>
                <PrimaryActionButton
                  onPress={() => {
                    setActiveDevice(device.id);
                    void toggleToday(device.id).catch((error) => {
                      console.warn("Failed to toggle today from app", error);
                    });
                  }}
                  state={boardButtonState(device, isApplyingToday && activeDeviceId === device.id)}
                />
                <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}>
                  {devices.map((page) => (
                    <View
                      key={`indicator-${page.id}`}
                      style={{
                        height: 6,
                        width: page.id === device.id ? 24 : 6,
                        borderRadius: 6,
                        backgroundColor: page.id === device.id ? theme.colors.textPrimary : "rgba(242, 238, 230, 0.12)",
                      }}
                    />
                  ))}
                </View>
              </View>
            </View>
          ))}
        </DevicePager>
      </View>
    </ScreenFrame>
  );
}
