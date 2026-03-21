import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { useRoutedDevice } from "@/components/devices/device-route-context";
import { ScreenScrollView } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { WifiNetworkPicker, authModeLabel } from "@/components/ui/wifi-network-picker";
import { theme } from "@/constants/theme";
import { useApProvisioning } from "@/hooks/use-ap-provisioning";
import { useDeviceAp } from "@/hooks/use-device-ap";
import { useOnboarding } from "@/hooks/use-onboarding";
import { describeProvisioningAttemptDebug } from "@/lib/ap-provisioning";
import { withAlpha } from "@/lib/color";
import { deviceSettingsPath } from "@/lib/device-routes";

const WIFI_RECONNECT_WARNING_MS = 15000;
const RECOVERY_PAGE_GAP = 18;
const RECOVERY_CARD_GAP = 18;
const RECOVERY_HEADER_BOTTOM_SPACE = 18;
const RECOVERY_COPY_GAP = 12;
const RECOVERY_FIELD_GAP = 12;
const RECOVERY_ACTION_ROW_GAP = 14;
const RECOVERY_ACTION_SECTION_TOP_SPACE = 12;
const RECOVERY_ACTION_SECTION_BOTTOM_SPACE = 10;
const RECOVERY_META_TOP_SPACE = 22;
const RECOVERY_CARD_PADDING_BOTTOM = 28;

function formatExpirationLabel(expiresAt: string) {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  const diffMinutes = Math.max(0, Math.ceil(diffMs / 60000));

  if (diffMinutes <= 1) {
    return "Session expires in under a minute";
  }

  return `Session expires in ${diffMinutes} minutes`;
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

function BodyText({ children }: { children: string }) {
  return (
    <Text
      style={{
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.body.fontFamily,
        fontSize: theme.typography.body.fontSize,
        lineHeight: theme.typography.body.lineHeight,
      }}
    >
      {children}
    </Text>
  );
}

function GuidanceCard({
  body,
  title,
}: {
  body: string;
  title?: string;
}) {
  return (
    <View
      style={{
        gap: 6,
        borderRadius: theme.radius.sheet,
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: withAlpha(theme.colors.textPrimary, 0.05),
        paddingHorizontal: 14,
        paddingVertical: 14,
      }}
    >
      {title ? (
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.label.fontFamily,
            fontSize: theme.typography.label.fontSize,
            lineHeight: theme.typography.label.lineHeight,
          }}
        >
          {title}
        </Text>
      ) : null}
      <BodyText>{body}</BodyText>
    </View>
  );
}

function MetaText({ children }: { children: string }) {
  return (
    <Text
      style={{
        color: theme.colors.textTertiary,
        fontFamily: theme.typography.label.fontFamily,
        fontSize: theme.typography.label.fontSize,
        lineHeight: theme.typography.label.lineHeight,
        textAlign: "center",
      }}
    >
      {children}
    </Text>
  );
}

function StepHeader({
  step,
  title,
}: {
  step: number;
  title: string;
}) {
  return (
    <View style={{ gap: 10 }}>
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
        Step {step} of 3
      </Text>
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontFamily: theme.typography.title.fontFamily,
          fontSize: theme.typography.title.fontSize,
          lineHeight: theme.typography.title.lineHeight,
        }}
      >
        {title}
      </Text>
    </View>
  );
}

export default function DeviceRecoveryRoute() {
  const router = useRouter();
  const device = useRoutedDevice();
  const {
    cancelSession,
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
    resetApInfo,
    resetNetworks,
    resetProvisioning,
    scanNetworks,
    submitProvisioning,
  } = useDeviceAp();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [manualWifiEntry, setManualWifiEntry] = useState(false);
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [waitingSinceMs, setWaitingSinceMs] = useState<number | null>(null);
  const [waitingWarning, setWaitingWarning] = useState<string | null>(null);
  const [hasRedirectedAfterRecovery, setHasRedirectedAfterRecovery] = useState(false);
  const [hasValidatedAp, setHasValidatedAp] = useState(false);
  const [isAwaitingReconnectLocally, setIsAwaitingReconnectLocally] = useState(false);

  const liveSession = session;
  const recoveryCompleted = session?.status === "claimed";
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
    liveSession.status === "claimed" ||
    !hasClaimToken;
  const missingRecoveryClaimContext =
    !!liveSession &&
    !liveSession.isExpired &&
    liveSession.status !== "claimed" &&
    !hasClaimToken;
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
  const isAwaitingReconnect =
    (liveSession?.status === "awaiting_cloud" || isAwaitingReconnectLocally) && !waitingWarning && !recoveryCompleted;
  const apReady = apInfo?.provisioning_state === "ready";
  const deviceApSsid = apInfo?.device_ap_ssid ?? "AddOne-XXXX";
  const showWifiForm = showDraftForm && hasValidatedAp;
  const visibleRecoveryError =
    waitingWarning ||
    apInfo?.last_failure_reason ||
    statusError ||
    (showWifiForm || isAwaitingReconnect ? null : apInfoError) ||
    networksError ||
    provisioningError ||
    (provisioningResponse && !provisioningResponse.accepted ? provisioningResponse.message : null);
  const shouldHideStaleApTimeout =
    !!visibleRecoveryError &&
    visibleRecoveryError.includes("Timed out waiting for the AddOne AP") &&
    (showWifiForm || isAwaitingReconnect);
  const renderedRecoveryError = shouldHideStaleApTimeout ? null : visibleRecoveryError;

  useEffect(() => {
    if (!showDraftForm) {
      setHasValidatedAp(false);
      setManualWifiEntry(false);
      setIsAwaitingReconnectLocally(false);
    }
  }, [showDraftForm]);

  useEffect(() => {
    if (!showWifiForm) {
      return;
    }

    setStatusError((current) =>
      current?.includes("Timed out waiting for the AddOne AP") ? null : current,
    );
  }, [showWifiForm]);

  useEffect(() => {
    if (showWifiForm || isAwaitingReconnect) {
      resetApInfo();
    }
  }, [isAwaitingReconnect, resetApInfo, showWifiForm]);

  useEffect(() => {
    if (liveSession?.status === "claimed" || liveSession?.status === "awaiting_ap") {
      setIsAwaitingReconnectLocally(false);
    }
  }, [liveSession?.status]);

  useEffect(() => {
    if (!recoveryCompleted || hasRedirectedAfterRecovery) {
      return;
    }

    setHasRedirectedAfterRecovery(true);
    router.replace("/");

    const timeoutId = setTimeout(() => {
      clearLocalOnboardingSession();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [clearLocalOnboardingSession, hasRedirectedAfterRecovery, recoveryCompleted, router]);

  useEffect(() => {
    if (!isAwaitingReconnect) {
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
  }, [isAwaitingReconnect, waitingSinceMs]);

  useEffect(() => {
    if (!isAwaitingReconnect || waitingWarning) {
      return;
    }

    let active = true;
    const intervalId = setInterval(() => {
      void (async () => {
        void refreshSession();

        try {
          const info = await checkAp();
          if (!active) {
            return;
          }

          if (info.provisioning_state === "ready" && info.last_failure_reason) {
            setWaitingWarning(info.last_failure_reason);
            setStatusMessage(`Connected to ${info.device_ap_ssid}. Update the Wi‑Fi details and try again.`);
            return;
          }

          if (info.provisioning_state === "ready") {
            setWaitingWarning("The device is back in setup mode. Check the Wi‑Fi details and try again.");
            setStatusMessage(`Connected to ${info.device_ap_ssid}. Update the Wi‑Fi details and try again.`);
            return;
          }
        } catch {
          // During a good reconnect the phone can leave AddOne-XXXX.
        }
      })();
    }, 2000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [checkAp, isAwaitingReconnect, refreshSession, waitingWarning]);

  async function handleStartRecovery() {
    setStatusError(null);
    setStatusMessage(null);
    setWaitingSinceMs(null);
    setWaitingWarning(null);
    setHasRedirectedAfterRecovery(false);
    setHasValidatedAp(false);
    setManualWifiEntry(false);
    clearDraft();
    resetApInfo();
    resetProvisioning();
    resetNetworks();
    await createSession({
      bootstrapDayResetTime: device.resetTime ? `${device.resetTime}:00` : "00:00:00",
      bootstrapTimezone: device.timezone,
      hardwareProfileHint: "addone-v1",
    });
  }

  async function handleCancelRecovery() {
    if (!liveSession) {
      if (router.canGoBack()) {
        router.back();
        return;
      }

      router.replace(deviceSettingsPath(device.id));
      return;
    }

    setStatusError(null);
    setStatusMessage(null);
    setWaitingSinceMs(null);
    setWaitingWarning(null);
    setHasValidatedAp(false);
    setIsAwaitingReconnectLocally(false);
    clearDraft();
    resetApInfo();
    resetProvisioning();
    resetNetworks();

    try {
      await cancelSession({
        reason: "Recovery cancelled from the app.",
        sessionId: liveSession.id,
      });
    } catch {
      clearLocalOnboardingSession();
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(deviceSettingsPath(device.id));
  }

  async function handleCheckDeviceAp() {
    try {
      setStatusError(null);
      setStatusMessage(null);
      setWaitingWarning(null);
      resetApInfo();
      const info = await checkAp();
      await scanNetworks();
      setHasValidatedAp(true);
      setStatusMessage(`Connected to ${info.device_ap_ssid}. Choose Wi‑Fi and reconnect.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reach the AddOne AP.";

      try {
        await scanNetworks();
        setHasValidatedAp(true);
        resetApInfo();
        setStatusMessage(`Connected to ${deviceApSsid}. Choose Wi‑Fi and reconnect.`);
        return;
      } catch {
        // If the phone is already on AddOne-XXXX but local probing is flaky, don't dead-end
        // the flow. Let the user continue with manual Wi-Fi entry instead.
      }

      if (message.includes("Timed out waiting for the AddOne AP")) {
        setHasValidatedAp(true);
        setManualWifiEntry(true);
        resetApInfo();
        setStatusMessage(`If you're already on ${deviceApSsid}, type the network name and continue.`);
        return;
      }

      setStatusError(message);
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
      resetApInfo();
      resetProvisioning();
      console.log("[recovery] provisioning attempt", describeProvisioningAttemptDebug(draft));
      const response = await submitProvisioning(preparedRequest);
      if (!response.accepted) {
        setStatusError(response.message ?? "The AddOne AP rejected the Wi‑Fi payload.");
        return;
      }

      setIsAwaitingReconnectLocally(true);
      setWaitingSinceMs(Date.now());
      setStatusMessage("Connecting to Wi‑Fi…");
      void markWaiting(liveSession.id).catch(() => {
        // The device can accept provisioning while the phone is still on AddOne-XXXX.
        // If the cloud update races with that handoff, keep waiting locally instead of
        // surfacing a false failure.
      });
    } catch (error) {
      setIsAwaitingReconnectLocally(false);
      setStatusError(error instanceof Error ? error.message : "Failed to continue the recovery session.");
    }
  }

  const step = canStartFreshSession ? 1 : showWifiForm ? 3 : 2;
  const stepSubtitle =
    step === 1
      ? "Recovery only reconnects Wi‑Fi. It does not erase history or habit settings."
      : step === 2
        ? "Reconnect your phone to the board's temporary AddOne network first."
        : "Choose the Wi‑Fi the board should rejoin, then wait for it to come back online.";

  return (
    <>
      <ScreenScrollView contentMaxWidth={theme.layout.narrowContentWidth}>
        <WifiNetworkPicker
          isScanning={isScanningNetworks}
          networks={sortedNetworks}
          onClose={() => setPickerVisible(false)}
          onSelect={(network) => {
            setWifiSsid(network.ssid);
            setStatusError(null);
            setStatusMessage(null);
            setWaitingWarning(null);
            setPickerVisible(false);
          }}
          selectedSsid={draft.wifiSsid}
          visible={pickerVisible}
        />

        <View style={{ gap: RECOVERY_PAGE_GAP }}>
          <GlassCard
            style={{
              gap: RECOVERY_CARD_GAP,
              paddingBottom: RECOVERY_CARD_PADDING_BOTTOM,
              paddingHorizontal: 16,
              paddingTop: 20,
            }}
          >
            <View style={{ paddingBottom: RECOVERY_HEADER_BOTTOM_SPACE }}>
              <StepHeader step={step} title={step === 1 ? "Start recovery" : step === 2 ? "Join AddOne Wi‑Fi" : "Choose Wi‑Fi"} />
              <BodyText>{stepSubtitle}</BodyText>
            </View>

            {step === 1 ? (
              <>
                <View style={{ gap: RECOVERY_COPY_GAP }}>
                  <GuidanceCard body="Use this when the board changed networks or stopped reconnecting on its own." title="When to use recovery" />
                  {missingRecoveryClaimContext ? <BodyText>Start a fresh session on this phone to continue.</BodyText> : null}
                </View>
                <ActionButton
                  disabled={isBusy}
                  label={isBusy ? "Starting…" : missingRecoveryClaimContext ? "Restart recovery" : "Start recovery"}
                  onPress={() => void handleStartRecovery()}
                />
              </>
            ) : null}

            {step >= 2 ? (
              <>
                <View style={{ gap: RECOVERY_COPY_GAP }}>
                  <GuidanceCard
                    body={
                      showWifiForm
                        ? "Choose the network and password the board should use next. If the network does not appear, type it manually."
                        : `Join \`${deviceApSsid}\` in Wi‑Fi settings, then return here and confirm.`
                    }
                    title={showWifiForm ? "Next" : "Right now"}
                  />
                </View>

                {!showWifiForm ? (
                  <View
                    style={{
                      gap: RECOVERY_COPY_GAP,
                      paddingBottom: RECOVERY_ACTION_SECTION_BOTTOM_SPACE,
                      paddingTop: RECOVERY_ACTION_SECTION_TOP_SPACE,
                    }}
                  >
                    <View style={{ flexDirection: "row", gap: RECOVERY_ACTION_ROW_GAP }}>
                      <View style={{ flex: 1 }}>
                        <ActionButton
                          disabled={isCheckingAp || isScanningNetworks || isBusy}
                          label={isCheckingAp || isScanningNetworks ? "Checking…" : "I joined AddOne Wi‑Fi"}
                          onPress={() => void handleCheckDeviceAp()}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ActionButton
                          disabled={isBusy || isCheckingAp || isScanningNetworks}
                          label="Cancel recovery"
                          onPress={() => void handleCancelRecovery()}
                          secondary
                        />
                      </View>
                    </View>
                    {liveSession ? (
                      <View style={{ paddingTop: RECOVERY_META_TOP_SPACE }}>
                        <MetaText>{formatExpirationLabel(liveSession.expiresAt)}</MetaText>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <>
                    <View style={{ gap: RECOVERY_FIELD_GAP }}>
                      <FieldLabel>Wi‑Fi network</FieldLabel>
                      {manualWifiEntry ? (
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
                          placeholder="Type network name"
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
                      ) : (
                        <Pressable
                          disabled={isSubmittingProvisioning}
                          onPress={() => setPickerVisible(true)}
                          style={{
                            alignItems: "center",
                            backgroundColor: withAlpha(theme.colors.bgBase, 0.84),
                            borderColor: withAlpha(theme.colors.textPrimary, 0.08),
                            borderRadius: theme.radius.sheet,
                            borderWidth: 1,
                            flexDirection: "row",
                            justifyContent: "space-between",
                            minHeight: 56,
                            opacity: isSubmittingProvisioning ? 0.6 : 1,
                            paddingHorizontal: 16,
                          }}
                        >
                          <Text
                            style={{
                              color: draft.wifiSsid ? theme.colors.textPrimary : theme.colors.textTertiary,
                              flex: 1,
                              fontFamily: theme.typography.body.fontFamily,
                              fontSize: theme.typography.body.fontSize,
                              lineHeight: theme.typography.body.lineHeight,
                            }}
                          >
                            {draft.wifiSsid || "Choose Wi‑Fi"}
                          </Text>
                          <Ionicons color={theme.colors.textSecondary} name="chevron-down-outline" size={18} />
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => {
                          setManualWifiEntry((current) => !current);
                          setStatusError(null);
                          setStatusMessage(null);
                          setWaitingWarning(null);
                        }}
                        style={{ alignSelf: "flex-start" }}
                      >
                        <Text
                          style={{
                            color: theme.colors.textSecondary,
                            fontFamily: theme.typography.label.fontFamily,
                            fontSize: theme.typography.label.fontSize,
                            lineHeight: theme.typography.label.lineHeight,
                          }}
                        >
                          {manualWifiEntry ? "Choose scanned network" : "Type network manually"}
                        </Text>
                      </Pressable>
                      {selectedNetwork ? <BodyText>{authModeLabel(selectedNetwork.authMode, selectedNetwork.secure)}</BodyText> : null}
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

                    <View style={{ gap: RECOVERY_FIELD_GAP }}>
                      <FieldLabel>Password</FieldLabel>
                      <View
                        style={{
                          alignItems: "center",
                          backgroundColor: withAlpha(theme.colors.bgBase, 0.84),
                          borderColor: withAlpha(theme.colors.textPrimary, 0.08),
                          borderRadius: theme.radius.sheet,
                          borderWidth: 1,
                          flexDirection: "row",
                          minHeight: 56,
                          paddingLeft: 16,
                        }}
                      >
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
                          placeholder="Enter password"
                          placeholderTextColor={theme.colors.textTertiary}
                          secureTextEntry={!showWifiPassword}
                          style={{
                            color: theme.colors.textPrimary,
                            flex: 1,
                            fontFamily: theme.typography.body.fontFamily,
                            fontSize: theme.typography.body.fontSize,
                            lineHeight: theme.typography.body.lineHeight,
                            paddingVertical: 16,
                          }}
                          value={draft.wifiPassword}
                        />
                        <Pressable
                          disabled={isSubmittingProvisioning}
                          onPress={() => setShowWifiPassword((current) => !current)}
                          style={{
                            alignItems: "center",
                            height: 48,
                            justifyContent: "center",
                            opacity: isSubmittingProvisioning ? 0.45 : 1,
                            width: 48,
                          }}
                        >
                          <Ionicons
                            color={theme.colors.textSecondary}
                            name={showWifiPassword ? "eye-off-outline" : "eye-outline"}
                            size={18}
                          />
                        </Pressable>
                      </View>
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
                    </View>

                    <View
                      style={{
                        gap: RECOVERY_COPY_GAP,
                        paddingBottom: RECOVERY_ACTION_SECTION_BOTTOM_SPACE,
                        paddingTop: RECOVERY_ACTION_SECTION_TOP_SPACE,
                      }}
                    >
                      <View style={{ flexDirection: "row", gap: RECOVERY_ACTION_ROW_GAP }}>
                        <View style={{ flex: 1 }}>
                          <ActionButton
                            disabled={isSubmittingProvisioning || !preparedRequest || isAwaitingReconnect}
                            label={isSubmittingProvisioning ? "Sending…" : isAwaitingReconnect ? "Connecting…" : waitingWarning ? "Try again" : "Reconnect board"}
                            onPress={() => void handleProvisionDeviceAp()}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <ActionButton
                            disabled={isBusy || isSubmittingProvisioning}
                            label="Cancel recovery"
                            onPress={() => void handleCancelRecovery()}
                            secondary
                          />
                        </View>
                      </View>
                      {liveSession ? (
                        <View style={{ paddingTop: RECOVERY_META_TOP_SPACE }}>
                          <MetaText>{formatExpirationLabel(liveSession.expiresAt)}</MetaText>
                        </View>
                      ) : null}
                    </View>

                    {isAwaitingReconnect ? (
                      <GuidanceCard
                        body="Stay on this screen while the board tries to rejoin Wi‑Fi. If it falls back into setup mode, you can try again without losing the session."
                        title="Trying to join Wi‑Fi…"
                      />
                    ) : null}
                  </>
                )}

                {statusMessage ? <GuidanceCard body={statusMessage} title="Status" /> : null}

                {renderedRecoveryError ? (
                  <View
                    style={{
                      gap: 6,
                      borderRadius: theme.radius.sheet,
                      borderWidth: 1,
                      borderColor: withAlpha(theme.colors.statusErrorMuted, 0.2),
                      backgroundColor: withAlpha(theme.colors.statusErrorMuted, 0.08),
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                    }}
                  >
                    <FieldLabel>Trouble reconnecting</FieldLabel>
                    <Text
                      style={{
                        color: theme.colors.statusErrorMuted,
                        fontFamily: theme.typography.body.fontFamily,
                        fontSize: theme.typography.body.fontSize,
                        lineHeight: theme.typography.body.lineHeight,
                      }}
                    >
                      {renderedRecoveryError}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </GlassCard>
        </View>
      </ScreenScrollView>

      <Stack.Screen
        options={{
          headerTitle: "Recovery",
          headerTitleStyle: {
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.title.fontFamily,
            fontSize: theme.typography.title.fontSize,
          },
        }}
      />
    </>
  );
}
