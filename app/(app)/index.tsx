import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { PixelGrid } from "@/components/board/pixel-grid";
import { DevicePager } from "@/components/layout/device-pager";
import { ScreenFrame } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { IconButton } from "@/components/ui/icon-button";
import { PrimaryActionButton, PrimaryActionState } from "@/components/ui/primary-action-button";
import { SyncBadge } from "@/components/ui/sync-badge";
import { theme } from "@/constants/theme";
import { buildBoardCells, getMergedPalette, getTodayHighlight, targetStatusLabel } from "@/lib/board";
import { useAddOneStore } from "@/store/addone-store";
import { SyncState } from "@/types/addone";

function boardButtonState(isDone: boolean, syncState: SyncState): PrimaryActionState {
  if (syncState === "queued") {
    return "pendingSync";
  }

  return isDone ? "done" : "notDone";
}

export default function HomeScreen() {
  const router = useRouter();
  const devices = useAddOneStore((state) => state.devices);
  const activeDeviceId = useAddOneStore((state) => state.activeDeviceId);
  const setActiveDevice = useAddOneStore((state) => state.setActiveDevice);
  const toggleToday = useAddOneStore((state) => state.toggleToday);
  const cycleSyncState = useAddOneStore((state) => state.cycleSyncState);

  const activeDevice = devices.find((device) => device.id === activeDeviceId) ?? devices[0];
  const initialPage = Math.max(0, devices.findIndex((device) => device.id === activeDeviceId));

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
            AddOne
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
            {activeDevice.lastSyncedLabel}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 10 }}>
          <SyncBadge onPress={cycleSyncState} state={activeDevice.syncState} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <IconButton icon="people-outline" onPress={() => router.push("/shared")} />
            <IconButton icon="options-outline" onPress={() => router.push("/settings")} />
          </View>
        </View>
      </View>
    </View>
  );

  const pages = useMemo(
    () =>
      devices.map((device) => {
        const palette = getMergedPalette(device.paletteId, device.customPalette);
        const todayDone = device.days[device.today.weekIndex][device.today.dayIndex];

        return {
          device,
          palette,
          cells: buildBoardCells(device),
          todayDone,
          highlightToday: getTodayHighlight(device),
        };
      }),
    [devices],
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
          {pages.map(({ cells, device, highlightToday, palette, todayDone }) => (
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
                    <PixelGrid cells={cells} highlightToday={highlightToday} mode="display" palette={palette} readOnly />
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
                  onPress={() => router.push("/history")}
                  style={{
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    borderRadius: theme.radius.card,
                    borderWidth: 1,
                    borderColor: "rgba(242, 238, 230, 0.08)",
                    backgroundColor: "rgba(23, 23, 23, 0.92)",
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
                  </View>
                  <Ionicons color={theme.colors.textSecondary} name="chevron-forward" size={18} />
                </Pressable>
              </View>

              <View style={{ gap: 16, paddingBottom: 8 }}>
                <PrimaryActionButton
                  onPress={() => {
                    setActiveDevice(device.id);
                    toggleToday();
                  }}
                  state={boardButtonState(todayDone, device.syncState)}
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
