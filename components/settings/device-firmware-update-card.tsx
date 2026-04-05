import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import {
  SETTINGS_FIELD_GAP,
  SETTINGS_HEADER_GAP,
  SettingsFieldLabel,
  SettingsNote,
  SettingsSurface,
} from "@/components/settings/device-settings-scaffold";
import { theme } from "@/constants/theme";
import { useDeviceFirmwareUpdate } from "@/hooks/use-device-firmware-update";
import { withAlpha } from "@/lib/color";
import { isDevicePendingRemoval } from "@/lib/device-removal";
import { isDeviceRecovering, needsDeviceRecovery } from "@/lib/device-recovery";
import {
  AddOneDevice,
  DeviceFirmwareOtaState,
  DeviceFirmwareProofScenario,
  DeviceFirmwareUpdateSummary,
} from "@/types/addone";

const FIRMWARE_PROGRESS_STAGES = [
  "Queued",
  "Download",
  "Verify",
  "Stage",
  "Restart",
  "Safety check",
];

function FirmwareStatusPill({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "error" | "success" | "warning";
}) {
  const borderColor =
    tone === "success"
      ? withAlpha(theme.colors.accentSuccess, 0.28)
      : tone === "warning"
        ? withAlpha(theme.colors.accentAmber, 0.24)
        : tone === "error"
          ? withAlpha(theme.colors.statusErrorMuted, 0.24)
          : withAlpha(theme.colors.textPrimary, 0.08);
  const backgroundColor =
    tone === "success"
      ? withAlpha(theme.colors.accentSuccess, 0.12)
      : tone === "warning"
        ? withAlpha(theme.colors.accentAmber, 0.14)
        : tone === "error"
          ? withAlpha(theme.colors.statusErrorMuted, 0.12)
          : withAlpha(theme.colors.textPrimary, 0.04);
  const textColor =
    tone === "success"
      ? theme.colors.accentSuccess
      : tone === "warning"
        ? theme.colors.accentAmber
        : tone === "error"
          ? theme.colors.statusErrorMuted
          : theme.colors.textSecondary;

  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor,
        backgroundColor,
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Text
        style={{
          color: textColor,
          fontFamily: theme.typography.micro.fontFamily,
          fontSize: theme.typography.micro.fontSize,
          lineHeight: theme.typography.micro.lineHeight,
          letterSpacing: theme.typography.micro.letterSpacing,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function ActionButton({
  disabled = false,
  label,
  loading = false,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={{
        minHeight: 42,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: theme.radius.pill,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.accentAmber, 0.18),
        backgroundColor: withAlpha(theme.colors.accentAmber, 0.1),
        opacity: disabled ? 0.45 : 1,
        paddingHorizontal: 16,
      }}
    >
      <Text
        style={{
          color: theme.colors.accentAmber,
          fontFamily: theme.typography.label.fontFamily,
          fontSize: theme.typography.label.fontSize,
          lineHeight: theme.typography.label.lineHeight,
        }}
      >
        {loading ? "Requesting…" : label}
      </Text>
    </Pressable>
  );
}

function isFailureState(state: DeviceFirmwareOtaState | null) {
  return state === "failed_download" || state === "failed_verify" || state === "failed_stage" || state === "failed_boot" || state === "rolled_back" || state === "recovery_needed" || state === "blocked";
}

function isInProgressState(state: DeviceFirmwareOtaState | null) {
  return state === "requested" || state === "downloading" || state === "downloaded" || state === "verifying" || state === "staged" || state === "rebooting" || state === "pending_confirm";
}

function isRetryingDownload(summary: DeviceFirmwareUpdateSummary | null) {
  return summary?.currentState === "downloading" && (!!summary.lastFailureCode || !!summary.lastFailureDetail);
}

function isUnsupportedCommandKindFailure(summary: DeviceFirmwareUpdateSummary | null) {
  return (
    summary?.lastFailureCode === "command_rejected" &&
    /unsupported command kind/i.test(summary.lastFailureDetail ?? "")
  );
}

function actionLockReason(device: AddOneDevice) {
  if (isDevicePendingRemoval(device)) {
    return "Boards leaving the account cannot start firmware updates.";
  }

  if (needsDeviceRecovery(device)) {
    return "Reconnect this board before you start a firmware update.";
  }

  if (isDeviceRecovering(device)) {
    return "Wait for recovery to finish before you start a firmware update.";
  }

  if (!device.isLive) {
    return "Bring the board back online before you start a firmware update.";
  }

  return null;
}

function stateHeadline(state: DeviceFirmwareOtaState | null) {
  switch (state) {
    case "requested":
      return "Update requested";
    case "downloading":
      return "Downloading update";
    case "downloaded":
      return "Download complete";
    case "verifying":
      return "Checking update";
    case "staged":
      return "Ready to restart";
    case "rebooting":
      return "Restarting board";
    case "pending_confirm":
      return "Final safety check";
    case "succeeded":
      return "Update complete";
    case "failed_download":
      return "Download stalled";
    case "failed_verify":
      return "Verification failed";
    case "failed_stage":
      return "Staging failed";
    case "failed_boot":
      return "Restart failed";
    case "rolled_back":
      return "Update rolled back";
    case "recovery_needed":
      return "Recovery needed";
    case "blocked":
      return "Update blocked";
    default:
      return null;
  }
}

function firmwareProgressStageIndex(state: DeviceFirmwareOtaState | null) {
  switch (state) {
    case "requested":
      return 0;
    case "downloading":
    case "downloaded":
    case "failed_download":
      return 1;
    case "verifying":
    case "failed_verify":
      return 2;
    case "staged":
    case "failed_stage":
      return 3;
    case "rebooting":
    case "failed_boot":
    case "rolled_back":
    case "recovery_needed":
    case "blocked":
      return 4;
    case "pending_confirm":
    case "succeeded":
      return 5;
    default:
      return -1;
  }
}

function firmwareProgressFillRatio(state: DeviceFirmwareOtaState | null) {
  const stageIndex = firmwareProgressStageIndex(state);
  if (stageIndex < 0) {
    return 0;
  }

  if (state === "succeeded") {
    return 1;
  }

  if (isFailureState(state)) {
    return (stageIndex + 1) / FIRMWARE_PROGRESS_STAGES.length;
  }

  return (stageIndex + 0.5) / FIRMWARE_PROGRESS_STAGES.length;
}

function firmwareProgressCaption(state: DeviceFirmwareOtaState | null) {
  const stageIndex = firmwareProgressStageIndex(state);
  if (stageIndex < 0) {
    return null;
  }

  if (state === "succeeded") {
    return `Step ${FIRMWARE_PROGRESS_STAGES.length} of ${FIRMWARE_PROGRESS_STAGES.length}`;
  }

  if (isFailureState(state)) {
    return `Stopped at step ${stageIndex + 1} of ${FIRMWARE_PROGRESS_STAGES.length}`;
  }

  return `Step ${stageIndex + 1} of ${FIRMWARE_PROGRESS_STAGES.length}`;
}

function FirmwareProgress({ state }: { state: DeviceFirmwareOtaState }) {
  const stageIndex = firmwareProgressStageIndex(state);
  if (stageIndex < 0) {
    return null;
  }

  const fillRatio = firmwareProgressFillRatio(state);
  const caption = firmwareProgressCaption(state);
  const accentColor = isFailureState(state)
    ? theme.colors.statusErrorMuted
    : state === "succeeded"
      ? theme.colors.accentSuccess
      : theme.colors.accentAmber;

  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 6 }}>
        <View
          style={{
            height: 8,
            overflow: "hidden",
            borderRadius: theme.radius.full,
            backgroundColor: withAlpha(theme.colors.textPrimary, 0.08),
          }}
        >
          <View
            style={{
              width: `${Math.max(fillRatio * 100, 8)}%`,
              height: "100%",
              borderRadius: theme.radius.full,
              backgroundColor: accentColor,
            }}
          />
        </View>
        {caption ? (
          <Text
            style={{
              color: isFailureState(state) ? theme.colors.statusErrorMuted : theme.colors.textSecondary,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: theme.typography.label.fontSize,
              lineHeight: theme.typography.label.lineHeight,
            }}
          >
            {caption}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function pillState(summary: DeviceFirmwareUpdateSummary | null, hasError: boolean, isLoading: boolean) {
  if (hasError) {
    return { label: "Status issue", tone: "error" as const };
  }

  if (isLoading || !summary) {
    return { label: "Checking", tone: "default" as const };
  }

  if (isFailureState(summary.currentState)) {
    return { label: "Needs attention", tone: "error" as const };
  }

  if (isInProgressState(summary.currentState)) {
    return { label: "Updating", tone: "warning" as const };
  }

  if (summary.updateAvailable) {
    return { label: "Update ready", tone: "warning" as const };
  }

  if (summary.currentState === "succeeded") {
    return { label: "Updated", tone: "success" as const };
  }

  if (summary.availableRelease && summary.availabilityReason === "not_in_rollout") {
    return { label: "No update yet", tone: "default" as const };
  }

  if (
    summary.availableRelease &&
    (summary.availabilityReason === "minimum_version_not_met" ||
      summary.availabilityReason === "minimum_app_version_not_met" ||
      summary.availabilityReason === "minimum_app_version_unknown" ||
      summary.availabilityReason === "partition_layout_unknown")
  ) {
    return { label: "Not ready", tone: "default" as const };
  }

  return { label: "Up to date", tone: "default" as const };
}

function statusCopy(
  summary: DeviceFirmwareUpdateSummary | null,
  device: AddOneDevice,
  isLoading: boolean,
  errorMessage: string | null,
) {
  const lockedReason = actionLockReason(device);

  if (errorMessage) {
    return {
      actionLabel: null,
      body: errorMessage,
      headline: "Firmware status unavailable",
      tone: "error" as const,
    };
  }

  if (isLoading || !summary) {
    return {
      actionLabel: null,
      body: "Checking the current firmware state for this board.",
      headline: "Checking firmware",
      tone: "default" as const,
    };
  }

  const availableVersion = summary.availableRelease?.firmwareVersion ?? null;
  const retryingDownload = isRetryingDownload(summary);
  const currentStateHeadline = retryingDownload ? "Retrying download" : stateHeadline(summary.currentState);
  if (currentStateHeadline && isInProgressState(summary.currentState)) {
    const body =
      summary.currentState === "requested"
        ? availableVersion
          ? `${availableVersion} is queued for this board. Keep it on Wi‑Fi and power while it begins the update.`
          : "The update is queued for this board. Keep it on Wi‑Fi and power while it begins."
        : retryingDownload
          ? summary.lastFailureDetail ??
            (availableVersion
              ? `${availableVersion} hit a temporary download issue. AddOne is retrying automatically while the board stays on Wi‑Fi and power.`
              : "The download hit a temporary issue. AddOne is retrying automatically while the board stays on Wi‑Fi and power.")
        : summary.currentState === "pending_confirm"
          ? availableVersion
            ? `${availableVersion} already restarted on the board. AddOne is waiting through the final safety window before it marks the update complete. This step usually finishes about 45 seconds after the restart.`
            : "The board already restarted on the new firmware. AddOne is waiting through the final safety window before it marks the update complete. This step usually finishes about 45 seconds after the restart."
        : availableVersion
          ? `${availableVersion} is in progress. Keep the board on Wi‑Fi and power while it finishes.`
          : "Keep the board on Wi‑Fi and power while the update finishes.";

    return {
      actionLabel: null,
      body,
      headline: currentStateHeadline,
      tone: "default" as const,
    };
  }

  if (isFailureState(summary.currentState)) {
    if (isUnsupportedCommandKindFailure(summary)) {
      return {
        actionLabel: null,
        body: "This board rejected the OTA request. It needs a newer OTA-capable base firmware before app-triggered updates will work here.",
        headline: "Update not supported here yet",
        tone: "error" as const,
      };
    }

    return {
      actionLabel: summary.updateAvailable && summary.canRequestUpdate && !lockedReason ? "Try again" : null,
      body:
        summary.lastFailureDetail ??
        (availableVersion
          ? `${availableVersion} did not finish installing. Reconnect the board, then try again.`
          : "The last firmware attempt did not finish cleanly."),
      headline: currentStateHeadline ?? "Update needs attention",
      tone: "error" as const,
    };
  }

  if (summary.updateAvailable && availableVersion) {
    return {
      actionLabel: summary.canRequestUpdate && !lockedReason ? "Install update" : null,
      body: lockedReason ?? `${availableVersion} is eligible for this board. Start it when the board can stay on Wi‑Fi and power through the restart.`,
      headline: `${availableVersion} is ready`,
      tone: "default" as const,
    };
  }

  if (summary.currentState === "succeeded") {
    return {
      actionLabel: null,
      body: `${summary.currentFirmwareVersion} finished the final safety check and is now the active firmware on this board.`,
      headline: currentStateHeadline ?? "Update complete",
      tone: "default" as const,
    };
  }

  switch (summary.availabilityReason) {
    case "not_in_rollout":
      return {
        actionLabel: null,
        body: "The next beta release is not assigned to this board yet.",
        headline: "No update ready",
        tone: "default" as const,
      };
    case "minimum_version_not_met":
      return {
        actionLabel: null,
        body: "This board needs a newer confirmed base firmware before the next release can install here.",
        headline: "No update ready",
        tone: "default" as const,
      };
    case "minimum_app_version_not_met":
      return {
        actionLabel: null,
        body: summary.availableRelease?.minimumAppVersion
          ? `This firmware needs app ${summary.availableRelease.minimumAppVersion} or newer before it can be started here.`
          : "This firmware needs a newer app build before it can be started here.",
        headline: "App update needed",
        tone: "default" as const,
      };
    case "minimum_app_version_unknown":
      return {
        actionLabel: null,
        body: "This firmware depends on an app-version check the current build cannot confirm yet.",
        headline: "App update needed",
        tone: "default" as const,
      };
    case "partition_layout_unknown":
      return {
        actionLabel: null,
        body: "This board is outside the current beta OTA layout assumption, so AddOne is not offering the update here yet.",
        headline: "No update ready",
        tone: "default" as const,
      };
    case "device_not_active":
      return {
        actionLabel: null,
        body: "Only active boards can start firmware updates.",
        headline: "No update ready",
        tone: "default" as const,
      };
    default:
      return {
        actionLabel: null,
        body: "This board is already on the latest eligible firmware for its beta channel.",
        headline: "No update ready",
        tone: "default" as const,
      };
  }
}

export function DeviceFirmwareUpdateCard({
  device,
  proofScenario,
}: {
  device: AddOneDevice;
  proofScenario?: DeviceFirmwareProofScenario | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { error, isLoading, isStartingUpdate, startUpdate, summary } = useDeviceFirmwareUpdate(device, proofScenario);
  const copy = statusCopy(summary, device, isLoading, error instanceof Error ? error.message : null);
  const pill = pillState(summary, error instanceof Error, isLoading);
  const currentVersion = summary?.currentFirmwareVersion ?? device.firmwareVersion;
  const targetVersion = summary?.availableRelease?.firmwareVersion ?? summary?.targetReleaseId ?? null;
  const showProgress =
    !!summary?.currentState &&
    (isInProgressState(summary.currentState) || isFailureState(summary.currentState));

  const requestUpdate = () => {
    Alert.alert(
      "Install firmware update?",
      targetVersion
        ? `${device.name} will start installing ${targetVersion}. Keep the board on Wi‑Fi and power while it downloads and restarts.`
        : `AddOne will ask ${device.name} to start its firmware update. Keep the board on Wi‑Fi and power while it finishes.`,
      [
        {
          style: "cancel",
          text: "Cancel",
        },
        {
          text: copy.actionLabel ?? "Install",
          onPress: () => {
            void startUpdate().then(
              () => {},
              (requestError: unknown) => {
                Alert.alert(
                  "Update request failed",
                  requestError instanceof Error ? requestError.message : "The firmware update could not be requested.",
                );
              },
            );
          },
        },
      ],
    );
  };

  return (
    <SettingsSurface>
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsExpanded((current) => !current)}
        style={{ gap: 12 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <SettingsFieldLabel>Current firmware</SettingsFieldLabel>
            <Text
              selectable
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.title.fontFamily,
                fontSize: theme.typography.title.fontSize,
                lineHeight: theme.typography.title.lineHeight,
              }}
            >
              {currentVersion}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 10 }}>
            <FirmwareStatusPill label={pill.label} tone={pill.tone} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.label.fontFamily,
                  fontSize: theme.typography.label.fontSize,
                  lineHeight: theme.typography.label.lineHeight,
                }}
              >
                {isExpanded ? "Hide" : "Details"}
              </Text>
              <Ionicons color={theme.colors.textSecondary} name={isExpanded ? "chevron-up" : "chevron-down"} size={16} />
            </View>
          </View>
        </View>
      </Pressable>

      {isExpanded ? (
        <>
          <View style={{ height: 1, backgroundColor: withAlpha(theme.colors.textPrimary, 0.08) }} />
          <View style={{ gap: SETTINGS_HEADER_GAP }}>
            <SettingsFieldLabel>{copy.headline}</SettingsFieldLabel>
            <SettingsNote tone={copy.tone === "error" ? "error" : "secondary"}>{copy.body}</SettingsNote>
            {showProgress && summary?.currentState ? (
              <FirmwareProgress state={summary.currentState} />
            ) : null}
          </View>

          {copy.actionLabel ? (
            <View style={{ gap: SETTINGS_FIELD_GAP }}>
              <ActionButton
                disabled={!summary?.canRequestUpdate}
                label={copy.actionLabel}
                loading={isStartingUpdate}
                onPress={requestUpdate}
              />
            </View>
          ) : null}
        </>
      ) : null}
    </SettingsSurface>
  );
}
