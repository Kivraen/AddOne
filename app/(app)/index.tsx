import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { PixelGrid } from "@/components/board/pixel-grid";
import { ScreenFrame } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { IconButton } from "@/components/ui/icon-button";
import { PrimaryActionButton, PrimaryActionState } from "@/components/ui/primary-action-button";
import { SyncBadge } from "@/components/ui/sync-badge";
import { theme } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useDeviceActions, useDevices } from "@/hooks/use-devices";
import { buildBoardCells, getMergedPalette, targetStatusLabel } from "@/lib/board";
import { formatBoardVerifiedLabel } from "@/lib/device-status";
import { withAlpha } from "@/lib/color";
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

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        gap: 5,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, 0.06),
        backgroundColor: withAlpha(theme.colors.bgBase, 0.5),
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
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
        {label}
      </Text>
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontFamily: theme.typography.label.fontFamily,
          fontSize: theme.typography.label.fontSize,
          lineHeight: theme.typography.label.lineHeight,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { mode } = useAuth();
  const { activeDevice, activeDeviceId, isLoading } = useDevices();
  const { isApplyingToday, toggleToday } = useDeviceActions();
  const pendingTodayStateByDevice = useAppUiStore((state) => state.pendingTodayStateByDevice);
  const activePendingTodayState = activeDeviceId ? pendingTodayStateByDevice[activeDeviceId] : undefined;
  const effectiveDevice = useMemo(
    () => (activeDevice ? withPendingTodayState(activeDevice, activePendingTodayState) : null),
    [activeDevice, activePendingTodayState],
  );
  const palette = useMemo(
    () => (effectiveDevice ? getMergedPalette(effectiveDevice.paletteId, effectiveDevice.customPalette) : null),
    [effectiveDevice],
  );
  const cells = useMemo(() => (effectiveDevice ? buildBoardCells(effectiveDevice) : []), [effectiveDevice]);
  const pendingPulse =
    effectiveDevice && activePendingTodayState !== undefined
      ? {
          col: effectiveDevice.today.weekIndex,
          row: effectiveDevice.today.dayIndex,
        }
      : null;

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
            Loading your board…
          </Text>
        </View>
      </ScreenFrame>
    );
  }

  const header = (
    <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingBottom: 18 }}>
      <View style={{ gap: 4 }}>
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
          {mode === "demo" ? "Preview" : "AddOne"}
        </Text>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.display.fontFamily,
            fontSize: theme.typography.display.fontSize,
            lineHeight: theme.typography.display.lineHeight,
          }}
        >
          {activeDevice ? "Today" : "Board"}
        </Text>
      </View>
      {activeDevice ? <IconButton icon="options-outline" onPress={() => router.push("/settings")} /> : null}
    </View>
  );

  if (!activeDevice || !effectiveDevice || !palette) {
    return (
      <ScreenFrame header={header}>
        <View style={{ flex: 1, justifyContent: "center", gap: 18 }}>
          <GlassCard style={{ gap: 12, paddingHorizontal: 20, paddingVertical: 20 }}>
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
              Start nearby setup to claim your device and bring it online.
            </Text>
          </GlassCard>

          <Pressable
            onPress={() => {
              router.push("/onboarding");
            }}
            style={{
              alignItems: "center",
              borderRadius: theme.radius.sheet,
              borderWidth: 1,
              borderColor: withAlpha(theme.colors.textPrimary, 0.12),
              backgroundColor: theme.colors.textPrimary,
              justifyContent: "center",
              minHeight: 64,
              paddingHorizontal: 22,
            }}
          >
            <Text
              style={{
                color: theme.colors.bgBase,
                fontFamily: theme.typography.title.fontFamily,
                fontSize: theme.typography.title.fontSize,
                lineHeight: theme.typography.title.lineHeight,
              }}
            >
              Start setup
            </Text>
          </Pressable>
        </View>
      </ScreenFrame>
    );
  }

  const liveStatusLabel =
    isApplyingToday || activePendingTodayState !== undefined
      ? "Applying on device"
      : effectiveDevice.syncState === "offline"
        ? "Device offline"
        : formatBoardVerifiedLabel(effectiveDevice.lastSnapshotAt);
  const device = effectiveDevice;
  const buttonIsApplying = isApplyingToday && activeDeviceId === device.id;

  return (
    <ScreenFrame header={header}>
      <View style={{ flex: 1, gap: 18, justifyContent: "space-between" }}>
        <View style={{ gap: 14 }}>
          <GlassCard style={{ marginTop: 2, paddingHorizontal: 16, paddingVertical: 18 }}>
            <View style={{ gap: 16 }}>
              <View style={{ alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, gap: 5 }}>
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
                    {device.name}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontFamily: theme.typography.body.fontFamily,
                      fontSize: theme.typography.body.fontSize,
                      lineHeight: theme.typography.body.lineHeight,
                    }}
                  >
                    {liveStatusLabel}
                  </Text>
                </View>
                <SyncBadge state={isApplyingToday || activePendingTodayState !== undefined ? "syncing" : device.syncState} />
              </View>

              <View style={{ alignItems: "center" }}>
                <PixelGrid cells={cells} mode="display" palette={palette} pendingPulse={pendingPulse} readOnly />
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <StatPill label="Target" value={targetStatusLabel(device)} />
                <StatPill label="Reset" value={device.nextResetLabel} />
              </View>

              <Pressable
                disabled={!device.isLive}
                onPress={() => router.push("/history")}
                style={{
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  opacity: device.isLive ? 1 : 0.45,
                  paddingHorizontal: 2,
                  paddingTop: 2,
                }}
              >
                <View style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
                  <Ionicons color={theme.colors.textSecondary} name="grid-outline" size={16} />
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
                </View>
                <Ionicons color={theme.colors.textTertiary} name="chevron-forward" size={16} />
              </Pressable>
            </View>
          </GlassCard>
        </View>

        <View style={{ gap: 10, paddingBottom: 8 }}>
          <PrimaryActionButton
            onPress={() => {
              void toggleToday(device.id).catch((error) => {
                console.warn("Failed to toggle today from app", error);
              });
            }}
            state={boardButtonState(device, buttonIsApplying)}
          />
          <Text
            style={{
              color: theme.colors.textTertiary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
              textAlign: "center",
            }}
          >
            {device.isLive ? "App changes confirm against the device." : "Reconnect Wi‑Fi to control this device from the app."}
          </Text>
        </View>
      </View>
    </ScreenFrame>
  );
}
