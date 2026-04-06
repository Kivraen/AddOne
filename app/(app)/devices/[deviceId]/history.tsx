import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useNavigation, usePreventRemove } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PixelGrid } from "@/components/board/pixel-grid";
import { useRoutedDevice } from "@/components/devices/device-route-context";
import { GlassCard } from "@/components/ui/glass-card";
import { ChoicePill } from "@/components/ui/choice-pill";
import { theme } from "@/constants/theme";
import { useDeviceActions } from "@/hooks/use-devices";
import {
  buildBoardCells,
  getMergedPalette,
  isCellBeforeHabitStart,
  resolveHabitStartLocalDate,
  toggleHistoryCell as toggleHistoryCellLocal,
} from "@/lib/board";
import { withAlpha } from "@/lib/color";
import { buildDeviceHistoryView, resolveDeviceWeekTarget } from "@/lib/device-history-view";
import {
  applyBackdatedHabitStartTarget,
  finalizeHistoryDraftWeekTargetsForSave,
} from "@/lib/history-week-targets";
import { connectionGraceState } from "@/lib/device-connection";
import { useDeviceHistorySyncStore } from "@/store/device-history-sync-store";
import { AddOneDevice, HistoryDraftUpdate } from "@/types/addone";

const HISTORY_CONNECTION_RECHECK_MS = 2_000;
const HISTORY_ORIENTATION_SETTLE_MS = 220;

interface PendingBackdateTargetSelection {
  col: number;
  localDate: string;
  previousHabitStartLocalDate: string | null;
  row: number;
}

function collectHistoryDraftUpdates(baseDevice: AddOneDevice, draftDevice: AddOneDevice): HistoryDraftUpdate[] {
  if (!baseDevice.dateGrid || !draftDevice.dateGrid) {
    return [];
  }

  const updates: HistoryDraftUpdate[] = [];
  const habitStartLocalDate = resolveHabitStartLocalDate(draftDevice);

  for (let weekIndex = 0; weekIndex < draftDevice.dateGrid.length; weekIndex += 1) {
    for (let dayIndex = 0; dayIndex < draftDevice.dateGrid[weekIndex].length; dayIndex += 1) {
      if (draftDevice.days[weekIndex][dayIndex] === baseDevice.days[weekIndex][dayIndex]) {
        continue;
      }

      const localDate = draftDevice.dateGrid[weekIndex]?.[dayIndex];
      if (!localDate) {
        continue;
      }

      if (habitStartLocalDate && localDate < habitStartLocalDate) {
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

function collectPastWeekBackfillUpdates(
  draftDevice: AddOneDevice,
  explicitUpdates: HistoryDraftUpdate[],
): HistoryDraftUpdate[] {
  if (!draftDevice.dateGrid) {
    return [];
  }

  const habitStartLocalDate = resolveHabitStartLocalDate(draftDevice);
  if (!habitStartLocalDate) {
    return [];
  }

  const explicitDates = new Set(explicitUpdates.map((update) => update.localDate));
  const updates: HistoryDraftUpdate[] = [];

  for (let weekIndex = 1; weekIndex < draftDevice.dateGrid.length; weekIndex += 1) {
    const weekDates = draftDevice.dateGrid[weekIndex] ?? [];
    const weekDays = draftDevice.days[weekIndex] ?? [];
    const weekHasAnyDone = weekDays.some(Boolean);
    if (weekHasAnyDone) {
      continue;
    }

    const weekHasExplicitUpdate = weekDates.some((localDate) => !!localDate && explicitDates.has(localDate));
    if (weekHasExplicitUpdate) {
      continue;
    }

    const representativeDate = weekDates.find((localDate) => !!localDate && localDate >= habitStartLocalDate);
    if (!representativeDate) {
      continue;
    }

    updates.push({
      isDone: false,
      localDate: representativeDate,
    });
  }

  return updates;
}

function applyHistoryDraftUpdates(device: AddOneDevice, updates: HistoryDraftUpdate[]) {
  if (updates.length === 0 || !device.dateGrid) {
    return device;
  }

  const days = device.days.map((week) => [...week]);

  for (const update of updates) {
    for (let weekIndex = 0; weekIndex < device.dateGrid.length; weekIndex += 1) {
      const dayIndex = device.dateGrid[weekIndex]?.indexOf(update.localDate) ?? -1;
      if (dayIndex < 0) {
        continue;
      }

      days[weekIndex][dayIndex] = update.isDone;
      break;
    }
  }

  return {
    ...device,
    days,
  };
}

function shiftLocalDate(localDate: string, days: number) {
  const date = new Date(`${localDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatHistoryDateLabel(localDate: string) {
  return new Date(`${localDate}T00:00:00.000Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
    year: "numeric",
  });
}

function backdateTargetPromptBody(selection: PendingBackdateTargetSelection) {
  const previousStart = selection.previousHabitStartLocalDate;
  if (!previousStart) {
    return "How many days counted as a good week for the newly added history?";
  }

  return `How many days counted as a good week from ${formatHistoryDateLabel(selection.localDate)} to ${formatHistoryDateLabel(
    shiftLocalDate(previousStart, -1),
  )}?`;
}

export default function DeviceHistoryRoute() {
  const navigation = useNavigation();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const routedDevice = useRoutedDevice();
  const pendingMirrorByDevice = useDeviceHistorySyncStore((state) => state.pendingMirrorByDevice);
  const device = useMemo(
    () =>
      buildDeviceHistoryView(routedDevice, {
        pendingMirror: pendingMirrorByDevice[routedDevice.id] ?? undefined,
      }).device,
    [pendingMirrorByDevice, routedDevice],
  );
  const {
    commitHistoryDraft,
    isUpdatingHabitStartDate,
    isSavingHistoryDraft,
    refreshDevices,
    refreshRuntimeSnapshot,
    setActiveHabitStartDate,
  } = useDeviceActions();
  const [baseDevice, setBaseDevice] = useState(device);
  const [draftDevice, setDraftDevice] = useState(device);
  const [isDirty, setIsDirty] = useState(false);
  const [isOrientationReady, setIsOrientationReady] = useState(false);
  const [isRefreshingAvailability, setIsRefreshingAvailability] = useState(false);
  const [isPersistingHistorySession, setIsPersistingHistorySession] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [pendingBackdateTarget, setPendingBackdateTarget] = useState<PendingBackdateTargetSelection | null>(null);
  const [selectedBackdateWeeklyTarget, setSelectedBackdateWeeklyTarget] = useState<number | null>(null);
  const [hasEnteredEditor, setHasEnteredEditor] = useState(false);
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

  useEffect(() => {
    if (canEditHistory) {
      setHasEnteredEditor(true);
    }
  }, [canEditHistory]);

  useEffect(() => {
    setHasEnteredEditor(canEditHistory);
  }, [canEditHistory, device.id]);

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

  const isSaveInFlight = isPersistingHistorySession || isSavingHistoryDraft || isUpdatingHabitStartDate;

  usePreventRemove(isSaveInFlight || isDirty, ({ data }) => {
    if (isSaveInFlight) {
      Alert.alert("Saving history", "AddOne is still applying your history changes.");
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
  }, [device.id]);

  useEffect(() => {
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
  const baseHabitStartLocalDate = resolveHabitStartLocalDate(baseDevice);
  const draftHabitStartLocalDate = resolveHabitStartLocalDate(draftDevice);
  const hasHabitStartChange = baseHabitStartLocalDate !== draftHabitStartLocalDate;
  const explicitUpdates = useMemo(() => collectHistoryDraftUpdates(baseDevice, draftDevice), [baseDevice, draftDevice]);
  const canRenderEditor = canEditHistory || hasEnteredEditor;
  const saveDisabled = !canEditHistory || isSaveInFlight || (!hasHabitStartChange && explicitUpdates.length === 0);
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
    if (!canRenderEditor || !isLandscape) {
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
          accessibilityLabel={isSaveInFlight ? "Saving history" : "Save history"}
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
            {isSaveInFlight ? "Saving…" : "Save"}
          </Text>
        </Pressable>
      </View>
    );
  }

  async function handleSave() {
    if (saveDisabled) {
      return;
    }

    setIsPersistingHistorySession(true);
    try {
      setStatusError(null);
      let nextBaseDevice = baseDevice;

      if (hasHabitStartChange && draftHabitStartLocalDate) {
        const refreshedDevice = await setActiveHabitStartDate(draftHabitStartLocalDate, device.id);
        nextBaseDevice = refreshedDevice ?? {
          ...baseDevice,
          habitStartedOnLocal: draftHabitStartLocalDate,
        };
      }

      const nextExplicitUpdates = collectHistoryDraftUpdates(nextBaseDevice, draftDevice);
      const updates = [...nextExplicitUpdates, ...collectPastWeekBackfillUpdates(draftDevice, nextExplicitUpdates)];
      const nextWeekTargets = finalizeHistoryDraftWeekTargetsForSave(
        baseDevice,
        Array.isArray(draftDevice.weekTargets) && draftDevice.weekTargets.length === draftDevice.days.length
          ? [...draftDevice.weekTargets]
          : null,
      );
      const currentWeekStart = nextBaseDevice.dateGrid?.[0]?.[0] ?? null;
      const savedDevice = applyHistoryDraftUpdates(
        {
          ...nextBaseDevice,
          habitStartedOnLocal: draftHabitStartLocalDate ?? nextBaseDevice.habitStartedOnLocal,
          weekTargets: nextWeekTargets,
        },
        updates,
      );

      if (updates.length > 0 || nextWeekTargets) {
        await commitHistoryDraft(updates, nextBaseDevice.runtimeRevision, device.id, {
          currentWeekStart,
          pendingMirror: {
            currentWeekStart,
            days: savedDevice.days,
            habitStartedOnLocal: savedDevice.habitStartedOnLocal,
            weekTargets: nextWeekTargets ?? undefined,
          },
          weekTargets: nextWeekTargets,
        });
      }

      setBaseDevice(savedDevice);
      setDraftDevice(savedDevice);
      setIsDirty(false);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Failed to save history on the device.");
    } finally {
      setIsPersistingHistorySession(false);
    }
  }

  function handleBackdateHabitStart(localDate: string, row: number, col: number) {
    if (selectedBackdateWeeklyTarget === null) {
      return;
    }

    setStatusError(null);
    setDraftDevice((current) =>
      toggleHistoryCellLocal(applyBackdatedHabitStartTarget(current, localDate, selectedBackdateWeeklyTarget), row, col),
    );
    setIsDirty(true);
    setPendingBackdateTarget(null);
    setSelectedBackdateWeeklyTarget(null);
  }

  function handleLockedCellPress(row: number, col: number) {
    if (isSaveInFlight) {
      return;
    }

    const localDate = draftDevice.dateGrid?.[col]?.[row];
    if (!localDate) {
      return;
    }

    if (col === 0) {
      setStatusError(null);
      setDraftDevice((current) =>
        toggleHistoryCellLocal(
          applyBackdatedHabitStartTarget(current, localDate, resolveDeviceWeekTarget(current, 0)),
          row,
          col,
        ),
      );
      setIsDirty(true);
      return;
    }

    setPendingBackdateTarget({
      col,
      localDate,
      previousHabitStartLocalDate: resolveHabitStartLocalDate(draftDevice),
      row,
    });
    setSelectedBackdateWeeklyTarget(null);
  }

  return (
    <>
      <View style={{ flex: 1, backgroundColor: theme.colors.bgBase }}>
        <StatusBar hidden animated style="light" />

        {pendingBackdateTarget ? (
          <View
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              zIndex: 40,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 16,
              paddingVertical: 16,
            }}
          >
            <Pressable
              onPress={() => {
                setPendingBackdateTarget(null);
                setSelectedBackdateWeeklyTarget(null);
              }}
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                backgroundColor: theme.colors.overlayScrim,
              }}
            />

            <View style={{ maxWidth: 460, width: "100%" }}>
              <GlassCard style={{ gap: 18, paddingHorizontal: 20, paddingVertical: 20, width: "100%" }}>
                <View style={{ gap: 8 }}>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontFamily: theme.typography.title.fontFamily,
                      fontSize: theme.typography.title.fontSize,
                      lineHeight: theme.typography.title.lineHeight,
                      textAlign: "center",
                    }}
                  >
                    Weekly target
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
                    {backdateTargetPromptBody(pendingBackdateTarget)}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                  {Array.from({ length: 7 }, (_, index) => index + 1).map((target) => (
                    <ChoicePill
                      key={`history-backdate-weekly-target-${target}`}
                      label={String(target)}
                      onPress={() => setSelectedBackdateWeeklyTarget(target)}
                      selected={selectedBackdateWeeklyTarget === target}
                    />
                  ))}
                </View>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Pressable
                    onPress={() => {
                      setPendingBackdateTarget(null);
                      setSelectedBackdateWeeklyTarget(null);
                    }}
                    style={[
                      controlButtonStyle,
                      {
                        flex: 1,
                        backgroundColor: withAlpha(theme.colors.bgSurface, 0.82),
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: theme.colors.textPrimary,
                        fontFamily: theme.typography.label.fontFamily,
                        fontSize: theme.typography.label.fontSize,
                        lineHeight: theme.typography.label.lineHeight,
                      }}
                    >
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={selectedBackdateWeeklyTarget === null}
                    onPress={() => {
                      handleBackdateHabitStart(
                        pendingBackdateTarget.localDate,
                        pendingBackdateTarget.row,
                        pendingBackdateTarget.col,
                      );
                    }}
                    style={[
                      controlButtonStyle,
                      {
                        flex: 1,
                        backgroundColor: withAlpha(theme.colors.accentAmber, 0.18),
                        borderColor: withAlpha(theme.colors.accentAmber, 0.28),
                        opacity: selectedBackdateWeeklyTarget === null ? 0.4 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: theme.colors.accentAmber,
                        fontFamily: theme.typography.label.fontFamily,
                        fontSize: theme.typography.label.fontSize,
                        lineHeight: theme.typography.label.lineHeight,
                      }}
                    >
                      Continue
                    </Text>
                  </Pressable>
                </View>
              </GlassCard>
            </View>
          </View>
        ) : null}

        {!canRenderEditor ? (
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
                    footerHint="Bottom row is automatic. Dimmed cells are before this habit started. Tap one to move the start date earlier."
                    isCellLocked={(row, col) => isCellBeforeHabitStart(draftDevice, row, col)}
                    maxWidth={2200}
                    mode="edit"
                    onLockedCellPress={handleLockedCellPress}
                    onCellPress={(row, col) => {
                      if (isSaveInFlight) {
                        return;
                      }

                      setStatusError(null);
                      setDraftDevice((current) => toggleHistoryCellLocal(current, row, col));
                      setIsDirty(true);
                    }}
                    palette={palette}
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
