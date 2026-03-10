import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";

import { ScreenFrame } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { IconButton } from "@/components/ui/icon-button";
import { theme } from "@/constants/theme";
import { useApProvisioning } from "@/hooks/use-ap-provisioning";
import { useDeviceAp } from "@/hooks/use-device-ap";
import { useDevices } from "@/hooks/use-devices";
import { useOnboarding } from "@/hooks/use-onboarding";
import { withAlpha } from "@/lib/color";
import { DeviceApScannedNetwork, DeviceOnboardingSession } from "@/types/addone";

function currentPhoneTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const WIFI_RECONNECT_WARNING_MS = 15000;

function formatExpirationLabel(expiresAt: string) {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  const diffMinutes = Math.max(0, Math.ceil(diffMs / 60000));

  if (diffMinutes <= 1) {
    return "Expires in under a minute";
  }

  return `Expires in ${diffMinutes} minutes`;
}

function statusLabel(session: DeviceOnboardingSession | null) {
  if (!session) {
    return "Not started";
  }

  if (session.isExpired || session.status === "expired") {
    return "Expired";
  }

  switch (session.status) {
    case "awaiting_ap":
      return "Ready for Wi‑Fi";
    case "awaiting_cloud":
      return "Connecting";
    case "claimed":
      return "Recovered";
    case "cancelled":
      return "Cancelled";
    case "failed":
      return "Failed";
    default:
      return session.status;
  }
}

function statusTone(session: DeviceOnboardingSession | null) {
  if (!session) {
    return {
      bg: withAlpha(theme.colors.textPrimary, 0.08),
      fg: theme.colors.textSecondary,
    };
  }

  if (session.isExpired || session.status === "expired" || session.status === "failed") {
    return {
      bg: withAlpha(theme.colors.statusErrorMuted, 0.18),
      fg: theme.colors.statusErrorMuted,
    };
  }

  if (session.status === "claimed") {
    return {
      bg: withAlpha(theme.colors.accentAmber, 0.18),
      fg: theme.colors.textPrimary,
    };
  }

  return {
    bg: withAlpha(theme.colors.textPrimary, 0.08),
    fg: theme.colors.textPrimary,
  };
}

function ActionButton({
  disabled = false,
  label,
  onPress,
  secondary = false,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  secondary?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        justifyContent: "center",
        minHeight: 52,
        borderRadius: theme.radius.sheet,
        borderWidth: 1,
        borderColor: secondary ? withAlpha(theme.colors.textPrimary, 0.12) : withAlpha(theme.colors.accentAmber, 0.2),
        backgroundColor: secondary ? withAlpha(theme.colors.textPrimary, 0.08) : theme.colors.textPrimary,
        opacity: disabled ? 0.45 : 1,
        paddingHorizontal: 18,
      }}
    >
      <Text
        style={{
          color: secondary ? theme.colors.textPrimary : theme.colors.bgBase,
          fontFamily: theme.typography.label.fontFamily,
          fontSize: theme.typography.label.fontSize,
          lineHeight: theme.typography.label.lineHeight,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FieldLabel({ children }: { children: string }) {
  return (
    <Text
      style={{
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.label.fontFamily,
        fontSize: theme.typography.label.fontSize,
        lineHeight: theme.typography.label.lineHeight,
      }}
    >
      {children}
    </Text>
  );
}

function signalLabel(rssi: number | null) {
  if (rssi === null || !Number.isFinite(rssi)) {
    return "Unknown signal";
  }

  if (rssi >= -55) {
    return "Strong";
  }

  if (rssi >= -67) {
    return "Good";
  }

  if (rssi >= -75) {
    return "Fair";
  }

  return "Weak";
}

function NetworkRow({
  disabled = false,
  network,
  onPress,
  selected,
}: {
  disabled?: boolean;
  network: DeviceApScannedNetwork;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        borderRadius: theme.radius.card,
        borderWidth: 1,
        borderColor: selected ? withAlpha(theme.colors.accentAmber, 0.5) : withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: selected ? withAlpha(theme.colors.accentAmber, 0.14) : withAlpha(theme.colors.bgBase, 0.76),
        opacity: disabled ? 0.5 : 1,
        paddingHorizontal: 14,
        paddingVertical: 14,
      }}
    >
      <View style={{ alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: theme.typography.label.fontSize,
              lineHeight: theme.typography.label.lineHeight,
            }}
          >
            {network.ssid}
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            {network.secure ? "Password required" : "Open network"} · {signalLabel(network.rssi)}
          </Text>
        </View>
        {selected ? (
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.micro.fontFamily,
              fontSize: theme.typography.micro.fontSize,
              lineHeight: theme.typography.micro.lineHeight,
              letterSpacing: theme.typography.micro.letterSpacing,
              textTransform: "uppercase",
            }}
          >
            Selected
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function RecoveryScreen() {
  const router = useRouter();
  const { activeDevice } = useDevices();
  const {
    claimToken,
    clearLocalOnboardingSession,
    createSession,
    hasClaimToken,
    isBusy,
    markWaiting,
    refreshSession,
    session,
  } = useOnboarding();
  const {
    clearDraft,
    draft,
    preparedRequest,
    setWifiPassword,
    setWifiSsid,
    validation,
  } = useApProvisioning({
    claimToken,
    hardwareProfileHint: session?.hardwareProfileHint ?? "addone-v1",
    onboardingSessionId: session?.id ?? null,
  });
  const {
    apInfo,
    apInfoError,
    checkAp,
    isCheckingAp,
    isScanningNetworks,
    isSubmittingProvisioning,
    networks,
    networksError,
    provisioningError,
    provisioningResponse,
    scanNetworks,
    submitProvisioning,
  } = useDeviceAp();
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [waitingSinceMs, setWaitingSinceMs] = useState<number | null>(null);
  const [waitingWarning, setWaitingWarning] = useState<string | null>(null);
  const [hasRedirectedAfterRecovery, setHasRedirectedAfterRecovery] = useState(false);

  const liveSession = session;
  const recoveryCompleted = session?.status === "claimed";
  const currentStatusTone = useMemo(() => statusTone(liveSession), [liveSession]);
  const showDraftForm =
    !!liveSession &&
    !liveSession.isExpired &&
    hasClaimToken &&
    (liveSession.status === "awaiting_ap" || liveSession.status === "awaiting_cloud");
  const canStartFreshSession =
    !liveSession ||
    liveSession.isExpired ||
    liveSession.status === "cancelled" ||
    liveSession.status === "failed" ||
    (liveSession.status === "awaiting_ap" && !hasClaimToken);
  const sortedNetworks = useMemo(
    () =>
      [...networks].sort((left, right) => {
        const leftRssi = left.rssi ?? -999;
        const rightRssi = right.rssi ?? -999;
        return rightRssi - leftRssi;
      }),
    [networks],
  );
  const selectedNetwork = sortedNetworks.find((network) => network.ssid === draft.wifiSsid) ?? null;
  const isAwaitingReconnect = liveSession?.status === "awaiting_cloud" && !waitingWarning;

  useEffect(() => {
    if (!recoveryCompleted || hasRedirectedAfterRecovery) {
      return;
    }

    setHasRedirectedAfterRecovery(true);
    setStatusMessage("Reconnected. Returning to your board…");
    router.replace("/");

    const timeoutId = setTimeout(() => {
      clearLocalOnboardingSession();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [clearLocalOnboardingSession, hasRedirectedAfterRecovery, recoveryCompleted, router]);

  useEffect(() => {
    if (liveSession?.status !== "awaiting_cloud") {
      setWaitingSinceMs(null);
      setWaitingWarning(null);
      return;
    }

    const startedAt = waitingSinceMs ?? Date.now();
    if (!waitingSinceMs) {
      setWaitingSinceMs(startedAt);
    }

    const timeoutId = setTimeout(() => {
      setWaitingWarning("That network did not connect. Check the password and try again.");
    }, Math.max(0, WIFI_RECONNECT_WARNING_MS - (Date.now() - startedAt)));

    return () => clearTimeout(timeoutId);
  }, [liveSession?.status, waitingSinceMs]);

  async function handleStartRecovery() {
    setStatusError(null);
    setStatusMessage(null);
    setWaitingSinceMs(null);
    setWaitingWarning(null);
    setHasRedirectedAfterRecovery(false);
    clearDraft();
    await createSession({
      bootstrapDayResetTime: activeDevice?.resetTime ? `${activeDevice.resetTime}:00` : "00:00:00",
      bootstrapTimezone: activeDevice?.timezone ?? currentPhoneTimezone(),
      hardwareProfileHint: "addone-v1",
    });
  }

  async function handleCheckDeviceAp() {
    try {
      setStatusError(null);
      setStatusMessage(null);
      const info = await checkAp();
      const response = await scanNetworks();
      if (response.networks.length > 0) {
        setPickerVisible(true);
      }
      setStatusMessage(`Connected to ${info.device_ap_ssid}. Choose your Wi‑Fi and reconnect.`);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Failed to reach the AddOne AP.");
    }
  }

  async function handleProvisionDeviceAp() {
    if (!liveSession || !preparedRequest) {
      const firstError = Object.values(validation.errors)[0];
      setStatusError(firstError ?? "The Wi‑Fi handoff is incomplete.");
      return;
    }

    try {
      setStatusError(null);
      setStatusMessage(null);
      setWaitingWarning(null);
      const response = await submitProvisioning(preparedRequest);
      if (!response.accepted) {
        setStatusError(response.message ?? "The AddOne AP rejected the Wi‑Fi payload.");
        return;
      }

      await markWaiting(liveSession.id);
      setWaitingSinceMs(Date.now());
      setStatusMessage("Trying to join Wi‑Fi…");
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Failed to continue the recovery session.");
    }
  }

  async function handleCheckWaitingState() {
    try {
      const info = await checkAp();
      if (info.provisioning_state === "ready") {
        setWaitingWarning("The device is still in setup mode. Check the password and try again.");
        setStatusMessage(`Connected to ${info.device_ap_ssid}. Update the Wi‑Fi details and retry.`);
        return;
      }

      if (info.provisioning_state === "busy") {
        setWaitingWarning("The device is still trying the previous Wi‑Fi. You can replace it now.");
        setStatusMessage(`Connected to ${info.device_ap_ssid}. Update the Wi‑Fi details and reconnect.`);
        return;
      }

      if (info.provisioning_state === "provisioned") {
        setWaitingWarning("The device joined Wi‑Fi. Waiting for cloud confirmation.");
        void refreshSession();
      }
    } catch {
      setWaitingWarning("Still waiting for the device. Reconnect to AddOne-XXXX to check it again.");
    }
  }

  return (
    <ScreenFrame
      header={
        <View style={{ alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", gap: 12, paddingBottom: 20 }}>
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
              Recovery
            </Text>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.display.fontFamily,
                fontSize: theme.typography.display.fontSize,
                lineHeight: theme.typography.display.lineHeight,
              }}
            >
              Rejoin Wi‑Fi
            </Text>
          </View>
          <IconButton icon="close-outline" onPress={() => router.back()} />
        </View>
      }
      scroll
    >
      <View style={{ gap: 14 }}>
        <Modal animationType="fade" transparent visible={pickerVisible} onRequestClose={() => setPickerVisible(false)}>
          <View
            style={{
              alignItems: "center",
              backgroundColor: theme.colors.overlayScrim,
              flex: 1,
              justifyContent: "center",
              paddingHorizontal: 16,
              paddingVertical: 16,
            }}
          >
            <GlassCard style={{ gap: 14, height: "88%", paddingHorizontal: 16, paddingVertical: 18, width: "100%" }}>
              <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontFamily: theme.typography.title.fontFamily,
                    fontSize: theme.typography.title.fontSize,
                    lineHeight: theme.typography.title.lineHeight,
                  }}
                >
                  Choose Wi‑Fi
                </Text>
                <IconButton icon="close-outline" onPress={() => setPickerVisible(false)} />
              </View>
              {isScanningNetworks ? <ActivityIndicator color={theme.colors.textPrimary} /> : null}
              {sortedNetworks.length > 0 ? (
                <FlatList
                  contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                  data={sortedNetworks}
                  keyExtractor={(item) => item.ssid}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  renderItem={({ item }) => (
                    <NetworkRow
                      disabled={isSubmittingProvisioning}
                      network={item}
                      onPress={() => {
                        setWifiSsid(item.ssid);
                        setStatusError(null);
                        setStatusMessage(null);
                        setWaitingWarning(null);
                        setPickerVisible(false);
                      }}
                      selected={draft.wifiSsid === item.ssid}
                    />
                  )}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: theme.typography.body.fontSize,
                    lineHeight: theme.typography.body.lineHeight,
                  }}
                >
                  No networks showed up yet. You can type the Wi‑Fi name manually.
                </Text>
              )}
            </GlassCard>
          </View>
        </Modal>

        <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 18 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.title.fontFamily,
              fontSize: theme.typography.title.fontSize,
              lineHeight: theme.typography.title.lineHeight,
            }}
          >
            Rejoin this device
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            Use recovery when the router or password changes. Ownership, history, and settings stay intact.
          </Text>

          <View
            style={{
              alignSelf: "flex-start",
              borderRadius: theme.radius.pill,
              backgroundColor: currentStatusTone.bg,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text
              style={{
                color: currentStatusTone.fg,
                fontFamily: theme.typography.micro.fontFamily,
                fontSize: theme.typography.micro.fontSize,
                lineHeight: theme.typography.micro.lineHeight,
                letterSpacing: theme.typography.micro.letterSpacing,
                textTransform: "uppercase",
              }}
            >
              {statusLabel(liveSession)}
            </Text>
          </View>

          {liveSession ? (
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              Temporary setup session · {formatExpirationLabel(liveSession.expiresAt)}
            </Text>
          ) : null}

          {activeDevice ? (
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              Device: {activeDevice.name}
            </Text>
          ) : null}

          {canStartFreshSession && !recoveryCompleted ? (
            <ActionButton
              disabled={isBusy}
              label={isBusy ? "Starting…" : "Start recovery"}
              onPress={() => {
                void handleStartRecovery();
              }}
            />
          ) : null}

          {statusMessage ? (
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              {statusMessage}
            </Text>
          ) : null}

          {statusError ? (
            <Text
              style={{
                color: theme.colors.statusErrorMuted,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              {statusError}
            </Text>
          ) : null}
        </GlassCard>

        {showDraftForm ? (
          <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 18 }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.title.fontFamily,
                fontSize: theme.typography.title.fontSize,
                lineHeight: theme.typography.title.lineHeight,
              }}
            >
              Choose Wi‑Fi
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              1. Join `AddOne-XXXX`. 2. Choose your Wi‑Fi. 3. Enter the password and reconnect.
            </Text>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <ActionButton
                disabled={isCheckingAp || isScanningNetworks}
                label={isCheckingAp || isScanningNetworks ? "Checking…" : "Check AddOne Wi‑Fi"}
                onPress={() => {
                  void handleCheckDeviceAp();
                }}
                secondary
              />
              <ActionButton
                disabled={isSubmittingProvisioning || !preparedRequest || isAwaitingReconnect}
                label={
                  isSubmittingProvisioning
                    ? "Sending…"
                    : isAwaitingReconnect
                      ? "Connecting…"
                      : waitingWarning
                        ? "Try again"
                        : "Reconnect device"
                }
                onPress={() => {
                  void handleProvisionDeviceAp();
                }}
              />
            </View>

            {isAwaitingReconnect ? (
              <View style={{ alignItems: "center", flexDirection: "row", gap: 10 }}>
                <ActivityIndicator color={theme.colors.textPrimary} />
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: theme.typography.body.fontSize,
                    lineHeight: theme.typography.body.lineHeight,
                  }}
                >
                  Trying to join Wi‑Fi and return to the cloud…
                </Text>
              </View>
            ) : null}

            {waitingWarning ? (
              <Text
                style={{
                  color: theme.colors.statusErrorMuted,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: theme.typography.body.fontSize,
                  lineHeight: theme.typography.body.lineHeight,
                }}
              >
                {waitingWarning}
              </Text>
            ) : null}

            {liveSession?.status === "awaiting_cloud" ? (
              <ActionButton
                disabled={isCheckingAp}
                label={isCheckingAp ? "Checking…" : "Check AddOne Wi‑Fi"}
                onPress={() => {
                  void handleCheckWaitingState();
                }}
                secondary
              />
            ) : null}

            {apInfo ? (
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: theme.typography.body.fontSize,
                  lineHeight: theme.typography.body.lineHeight,
                }}
              >
                Device AP: {apInfo.device_ap_ssid}
                {apInfo.firmware_version ? ` · firmware ${apInfo.firmware_version}` : ""}
              </Text>
            ) : null}

            {apInfoError ? (
              <Text
                style={{
                  color: theme.colors.statusErrorMuted,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: theme.typography.body.fontSize,
                  lineHeight: theme.typography.body.lineHeight,
                }}
              >
                {apInfoError}
              </Text>
            ) : null}

            <View style={{ gap: 10 }}>
              <FieldLabel>Wi‑Fi network</FieldLabel>
              {networksError ? (
                <Text
                  style={{
                    color: theme.colors.statusErrorMuted,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: theme.typography.body.fontSize,
                    lineHeight: theme.typography.body.lineHeight,
                  }}
                >
                  {networksError}
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmittingProvisioning}
                    onChangeText={(value) => {
                      setWifiSsid(value);
                      setStatusError(null);
                      setStatusMessage(null);
                      setWaitingWarning(null);
                    }}
                    placeholder="Choose or type network"
                    placeholderTextColor={theme.colors.textTertiary}
                    style={{
                      borderRadius: theme.radius.sheet,
                      borderWidth: 1,
                      borderColor: withAlpha(theme.colors.textPrimary, 0.08),
                      backgroundColor: withAlpha(theme.colors.bgBase, 0.84),
                      color: theme.colors.textPrimary,
                      fontFamily: theme.typography.body.fontFamily,
                      fontSize: theme.typography.body.fontSize,
                      lineHeight: theme.typography.body.lineHeight,
                      paddingHorizontal: 16,
                      paddingVertical: 16,
                    }}
                    value={draft.wifiSsid}
                  />
                </View>
                <ActionButton
                  disabled={isSubmittingProvisioning || isCheckingAp || isScanningNetworks}
                  label={isScanningNetworks ? "Scanning…" : "Choose"}
                  onPress={() => {
                    if (sortedNetworks.length > 0) {
                      setPickerVisible(true);
                      return;
                    }

                    void handleCheckDeviceAp();
                  }}
                  secondary
                />
              </View>
              {selectedNetwork ? (
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: theme.typography.body.fontSize,
                    lineHeight: theme.typography.body.lineHeight,
                  }}
                >
                  {selectedNetwork.secure ? "Password required" : "Open network"} · {signalLabel(selectedNetwork.rssi)}
                </Text>
              ) : null}
              {validation.errors.wifiSsid ? (
                <Text
                  style={{
                    color: theme.colors.statusErrorMuted,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: theme.typography.body.fontSize,
                    lineHeight: theme.typography.body.lineHeight,
                  }}
                >
                  {validation.errors.wifiSsid}
                </Text>
              ) : null}
            </View>

            <View style={{ gap: 10 }}>
              <FieldLabel>Password</FieldLabel>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmittingProvisioning}
                onChangeText={(value) => {
                  setWifiPassword(value);
                  setStatusError(null);
                  setStatusMessage(null);
                  setWaitingWarning(null);
                }}
                placeholder="Enter the Wi-Fi password"
                placeholderTextColor={theme.colors.textTertiary}
                secureTextEntry
                style={{
                  borderRadius: theme.radius.sheet,
                  borderWidth: 1,
                  borderColor: withAlpha(theme.colors.textPrimary, 0.08),
                  backgroundColor: withAlpha(theme.colors.bgBase, 0.84),
                  color: theme.colors.textPrimary,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: theme.typography.body.fontSize,
                  lineHeight: theme.typography.body.lineHeight,
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                }}
                value={draft.wifiPassword}
              />
              {validation.errors.wifiPassword ? (
                <Text
                  style={{
                    color: theme.colors.statusErrorMuted,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: theme.typography.body.fontSize,
                    lineHeight: theme.typography.body.lineHeight,
                  }}
                >
                  {validation.errors.wifiPassword}
                </Text>
              ) : null}
              {provisioningError ? (
                <Text
                  style={{
                    color: theme.colors.statusErrorMuted,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: theme.typography.body.fontSize,
                    lineHeight: theme.typography.body.lineHeight,
                  }}
                >
                  {provisioningError}
                </Text>
              ) : null}
              {provisioningResponse?.message ? (
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: theme.typography.body.fontSize,
                    lineHeight: theme.typography.body.lineHeight,
                  }}
                >
                  {provisioningResponse.message}
                </Text>
              ) : null}
            </View>

            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              Hidden network? Type the Wi‑Fi name manually.
            </Text>

            <GlassCard style={{ gap: 6, paddingHorizontal: 14, paddingVertical: 12 }}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontFamily: theme.typography.label.fontFamily,
                  fontSize: theme.typography.label.fontSize,
                  lineHeight: theme.typography.label.lineHeight,
                }}
              >
                Physical fallback
              </Text>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: theme.typography.body.fontSize,
                  lineHeight: theme.typography.body.lineHeight,
                }}
              >
                Hold the main button while reconnecting power for about 5 seconds.
              </Text>
            </GlassCard>
          </GlassCard>
        ) : null}
      </View>
    </ScreenFrame>
  );
}
