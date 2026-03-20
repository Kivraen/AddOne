import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useNavigation, usePreventRemove } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PixelGrid } from "@/components/board/pixel-grid";
import { useRoutedDevice } from "@/components/devices/device-route-context";
import { theme } from "@/constants/theme";
import { useDeviceActions } from "@/hooks/use-devices";
import { buildBoardCells, getMergedPalette, toggleHistoryCell as toggleHistoryCellLocal } from "@/lib/board";
import { withAlpha } from "@/lib/color";
import { connectionGraceState } from "@/lib/device-connection";
import { AddOneDevice, HistoryDraftUpdate } from "@/types/addone";

const HISTORY_CONNECTION_RECHECK_MS = 2_000;
const HISTORY_ORIENTATION_SETTLE_MS = 220;

function collectHistoryDraftUpdates(baseDevice: AddOneDevice, draftDevice: AddOneDevice): HistoryDraftUpdate[] {
  if (!baseDevice.dateGrid || !draftDevice.dateGrid) {
    return [];
  }

  const updates: HistoryDraftUpdate[] = [];

  for (let weekIndex = 0; weekIndex < draftDevice.dateGrid.length; weekIndex += 1) {
    for (let dayIndex = 0; dayIndex < draftDevice.dateGrid[weekIndex].length; dayIndex += 1) {
      if (draftDevice.days[weekIndex][dayIndex] === baseDevice.days[weekIndex][dayIndex]) {
        continue;
      }

      const localDate = draftDevice.dateGrid[weekIndex]?.[dayIndex];
      if (!localDate) {
        continue;
      }

      updates.push({
        isDone: draftDevice.days[weekIndex][dayIndex],
        localDate,
      });
    }
  }

  return updates;
}

export default function DeviceHistoryRoute() {
  const navigation = useNavigation();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const device = useRoutedDevice();
  const {
    commitHistoryDraft,
    isSavingHistoryDraft,
    refreshDevices,
    refreshRuntimeSnapshot,
  } = useDeviceActions();
  const [baseDevice, setBaseDevice] = useState(device);
  const [draftDevice, setDraftDevice] = useState(device);
  const [isDirty, setIsDirty] = useState(false);
  const [isOrientationReady, setIsOrientationReady] = useState(false);
  const [isRefreshingAvailability, setIsRefreshingAvailability] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [boardViewport, setBoardViewport] = useState({ height: 0, width: 0 });
  const refreshDevicesRef = useRef(refreshDevices);
  const refreshRuntimeSnapshotRef = useRef(refreshRuntimeSnapshot);
  const previousOrientationLockRef = useRef<ScreenOrientation.OrientationLock | null>(null);
  const isLandscape = width > height;
  const historyConnectionState = connectionGraceState(device);
  const canEditHistory = historyConnectionState === "online";

  useEffect(() => {
    refreshDevicesRef.current = refreshDevices;
  }, [refreshDevices]);

  useEffect(() => {
    refreshRuntimeSnapshotRef.current = refreshRuntimeSnapshot;
  }, [refreshRuntimeSnapshot]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setIsOrientationReady(false);

      async function syncOrientation() {
        try {
          previousOrientationLockRef.current = await ScreenOrientation.getOrientationLockAsync();
          if (!isActive) {
            return;
          }

          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        } catch {
          // Ignore orientation failures in Expo Go and keep the editor usable.
        }
      }

      void syncOrientation();

      const settleTimer = setTimeout(() => {
        if (isActive) {
          setIsOrientationReady(true);
        }
      }, HISTORY_ORIENTATION_SETTLE_MS);

      return () => {
        isActive = false;
        clearTimeout(settleTimer);
        const previousLock = previousOrientationLockRef.current;

        if (previousLock !== null) {
          void ScreenOrientation.lockAsync(previousLock).catch(() => {
            void ScreenOrientation.unlockAsync().catch(() => undefined);
          });
          return;
        }

        void ScreenOrientation.unlockAsync().catch(() => undefined);
      };
    }, []),
  );

  usePreventRemove(isSavingHistoryDraft || isDirty, ({ data }) => {
    if (isSavingHistoryDraft) {
      Alert.alert("Saving history", "AddOne is still waiting for the device to confirm your history changes.");
      return;
    }

    if (!isDirty) {
      return;
    }

    Alert.alert("Discard changes?", "Your unsaved history edits will be lost.", [
      { style: "cancel", text: "Stay" },
      {
        style: "destructive",
        text: "Discard",
        onPress: () => {
          setDraftDevice(baseDevice);
          setIsDirty(false);
          setStatusError(null);
          navigation.dispatch(data.action);
        },
      },
    ]);
  });

  const deviceSyncKey = `${device.id}:${device.runtimeRevision}:${device.lastSnapshotAt ?? ""}`;

  useEffect(() => {
    setBaseDevice(device);
    setDraftDevice(device);
    setIsDirty(false);
    setStatusError(null);

    if (!canEditHistory) {
      return;
    }

    void refreshRuntimeSnapshotRef.current(device.id).catch((error) => {
      console.warn("Failed to refresh live board for history draft", error);
    });
  }, [canEditHistory, device.id]);

  useEffect(() => {
    if (historyConnectionState !== "checking") {
      setIsRefreshingAvailability(false);
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const runRefresh = async () => {
      if (cancelled) {
        return;
      }

      setIsRefreshingAvailability(true);

      try {
        await refreshDevicesRef.current();
      } catch (error) {
        if (!cancelled) {
          console.warn("Failed to refresh history editor availability", error);
        }
      } finally {
        if (!cancelled) {
          setIsRefreshingAvailability(false);
          timeoutId = setTimeout(() => {
            void runRefresh();
          }, HISTORY_CONNECTION_RECHECK_MS);
        }
      }
    };

    void runRefresh();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [historyConnectionState]);

  useEffect(() => {
    if (isDirty) {
      return;
    }

    setBaseDevice(device);
    setDraftDevice(device);
  }, [deviceSyncKey, device, isDirty]);

  const palette = getMergedPalette(draftDevice.paletteId, draftDevice.customPalette);
  const updates = useMemo(() => collectHistoryDraftUpdates(baseDevice, draftDevice), [baseDevice, draftDevice]);
  const saveDisabled = !canEditHistory || isSavingHistoryDraft || updates.length === 0;
  const gridAvailableWidth = Math.max(320, boardViewport.width - 16 || width - 32);
  const gridAvailableHeight = Math.max(140, boardViewport.height - 16 || height - 64);

  const controlButtonStyle = {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 18,
    borderRadius: theme.radius.full,
    borderCurve: "continuous" as const,
    borderWidth: 1,
    borderColor: theme.materials.panel.border,
    backgroundColor: withAlpha(theme.colors.bgSurface, 0.82),
    boxShadow: theme.shadows.panel,
  };

  async function handleRefreshAvailability() {
    setStatusError(null);
    setIsRefreshingAvailability(true);

    try {
      await refreshDevicesRef.current();
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Failed to refresh device status.");
    } finally {
      setIsRefreshingAvailability(false);
    }
  }

  function renderCenteredState(input: {
    title: string;
    message: string;
    showRefresh?: boolean;
  }) {
    const { message, showRefresh = false, title } = input;

    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <View style={{ alignItems: "center", gap: 14, maxWidth: 420 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.title.fontFamily,
              fontSize: theme.typography.title.fontSize,
              lineHeight: theme.typography.title.lineHeight,
              textAlign: "center",
            }}
          >
            {title}
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
            {message}
          </Text>
          <View style={{ flexDirection: "row", gap: 12, paddingTop: 6 }}>
            <Pressable
              accessibilityLabel="Back"
              accessibilityRole="button"
              onPress={() => navigation.goBack()}
              style={[controlButtonStyle, { minWidth: 132 }]}
            >
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontFamily: theme.typography.label.fontFamily,
                  fontSize: theme.typography.label.fontSize,
                  lineHeight: theme.typography.label.lineHeight,
                }}
              >
                Back
              </Text>
            </Pressable>
            {showRefresh ? (
              <Pressable
                accessibilityLabel={isRefreshingAvailability ? "Checking device" : "Refresh device status"}
                accessibilityRole="button"
                disabled={isRefreshingAvailability}
                onPress={() => void handleRefreshAvailability()}
                style={[controlButtonStyle, { minWidth: 132, opacity: isRefreshingAvailability ? 0.45 : 1 }]}
              >
                <Text
                  style={{
                    color: theme.colors.accentAmber,
                    fontFamily: theme.typography.label.fontFamily,
                    fontSize: theme.typography.label.fontSize,
                    lineHeight: theme.typography.label.lineHeight,
                  }}
                >
                  {isRefreshingAvailability ? "Checking…" : "Refresh"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  function renderCheckingState() {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <View style={{ alignItems: "center", gap: 16, maxWidth: 420 }}>
          <ActivityIndicator color={theme.colors.textPrimary} />
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.title.fontFamily,
              fontSize: theme.typography.title.fontSize,
              lineHeight: theme.typography.title.lineHeight,
              textAlign: "center",
            }}
          >
            Opening history…
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
            AddOne is checking the board connection in the background.
          </Text>
          <Pressable
            accessibilityLabel="Back"
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={[controlButtonStyle, { minWidth: 132 }]}
          >
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.label.fontFamily,
                fontSize: theme.typography.label.fontSize,
                lineHeight: theme.typography.label.lineHeight,
              }}
            >
              Back
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function renderOrientationSettlingState() {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={theme.colors.textPrimary} />
      </View>
    );
  }

  function renderTopControls() {
    if (!canEditHistory || !isLandscape) {
      return null;
    }

    return (
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: insets.top + 8,
          right: insets.right + 10,
          left: insets.left + 10,
          zIndex: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={controlButtonStyle}
        >
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.display.fontFamily,
              fontSize: 30,
              lineHeight: 30,
              marginTop: -2,
            }}
          >
            ‹
          </Text>
        </Pressable>

        <Pressable
          accessibilityLabel={isSavingHistoryDraft ? "Saving history" : "Save history"}
          accessibilityRole="button"
          disabled={saveDisabled}
          onPress={() => void handleSave()}
          style={[controlButtonStyle, { opacity: saveDisabled ? 0.4 : 1 }]}
        >
          <Text
            style={{
              color: saveDisabled ? theme.colors.textTertiary : theme.colors.accentAmber,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: theme.typography.label.fontSize,
              lineHeight: theme.typography.label.lineHeight,
            }}
          >
            {isSavingHistoryDraft ? "Saving…" : "Save"}
          </Text>
        </Pressable>
      </View>
    );
  }

  async function handleSave() {
    if (saveDisabled) {
      return;
    }

    try {
      setStatusError(null);
      await commitHistoryDraft(updates, baseDevice.runtimeRevision, device.id);
      setIsDirty(false);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Failed to save history on the device.");
    }
  }

  return (
    <>
      <View style={{ flex: 1, backgroundColor: theme.colors.bgBase }}>
        <StatusBar hidden animated style="light" />

        {!canEditHistory ? (
          historyConnectionState === "checking" ? (
            renderCheckingState()
          ) : (
            renderCenteredState({
              message: "Refresh to check again, or go back if you only needed settings. If the board stays unavailable, reconnect it from Recovery.",
              showRefresh: true,
              title: "History needs a live board",
            })
          )
        ) : !isOrientationReady ? (
          renderOrientationSettlingState()
        ) : !isLandscape ? (
          renderCenteredState({
            message: "Rotate the phone to open the full history editor, or go back to leave without editing.",
            title: "Rotate to edit history",
          })
        ) : (
          <View style={{ flex: 1 }}>
            {renderTopControls()}

            <View
              style={{
                flex: 1,
                minHeight: 0,
                paddingTop: insets.top + 68,
                paddingRight: insets.right + 10,
                paddingBottom: insets.bottom + 10,
                paddingLeft: insets.left + 10,
              }}
            >
              <View
                onLayout={(event) => {
                  const { height: nextHeight, width: nextWidth } = event.nativeEvent.layout;
                  if (Math.abs(nextHeight - boardViewport.height) > 1 || Math.abs(nextWidth - boardViewport.width) > 1) {
                    setBoardViewport({ height: nextHeight, width: nextWidth });
                  }
                }}
                style={{
                  flex: 1,
                  minHeight: 0,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    padding: 8,
                    borderRadius: theme.radius.hero,
                    borderCurve: "continuous",
                    borderWidth: 1,
                    borderColor: theme.materials.panel.border,
                    backgroundColor: withAlpha(theme.colors.bgBase, 0.34),
                    boxShadow: theme.shadows.panel,
                  }}
                >
                  <PixelGrid
                    availableHeight={gridAvailableHeight}
                    availableWidth={gridAvailableWidth}
                    cells={buildBoardCells(draftDevice)}
                    maxWidth={2200}
                    mode="edit"
                    onCellPress={(row, col) => {
                      if (isSavingHistoryDraft) {
                        return;
                      }

                      setStatusError(null);
                      setDraftDevice((current) => toggleHistoryCellLocal(current, row, col));
                      setIsDirty(true);
                    }}
                    palette={palette}
                    showFooterHint={false}
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {statusError ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              right: insets.right + 12,
              bottom: insets.bottom + 12,
              left: insets.left + 12,
              alignItems: "center",
            }}
          >
            <Text
              selectable
              style={{
                color: theme.colors.statusErrorMuted,
                fontFamily: theme.typography.label.fontFamily,
                fontSize: 13,
                lineHeight: 18,
                textAlign: "center",
                backgroundColor: withAlpha(theme.colors.bgSurface, 0.86),
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: theme.radius.full,
                borderCurve: "continuous",
                borderWidth: 1,
                borderColor: withAlpha(theme.colors.statusErrorMuted, 0.18),
              }}
            >
              {statusError}
            </Text>
          </View>
        ) : null}
      </View>

      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
    </>
  );
}
