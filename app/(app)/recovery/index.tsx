import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { ScreenFrame } from "@/components/layout/screen-frame";
import { ChoicePill } from "@/components/ui/choice-pill";
import { GlassCard } from "@/components/ui/glass-card";
import { IconButton } from "@/components/ui/icon-button";
import { theme } from "@/constants/theme";
import { useApProvisioning } from "@/hooks/use-ap-provisioning";
import { useDeviceAp } from "@/hooks/use-device-ap";
import { useDevices } from "@/hooks/use-devices";
import { useOnboarding } from "@/hooks/use-onboarding";
import { withAlpha } from "@/lib/color";
import { DeviceOnboardingSession } from "@/types/addone";

function currentPhoneTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

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
      return "Ready for Wi-Fi";
    case "awaiting_cloud":
      return "Reconnecting";
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

export default function RecoveryScreen() {
  const router = useRouter();
  const { activeDevice } = useDevices();
  const {
    claimToken,
    createSession,
    hasClaimToken,
    isBusy,
    isPolling,
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

  const currentStatusTone = useMemo(() => statusTone(session), [session]);
  const showDraftForm = session?.status === "awaiting_ap" && !session.isExpired && hasClaimToken;

  async function handleStartRecovery() {
    setStatusError(null);
    setStatusMessage(null);
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
      await scanNetworks();
      setStatusMessage(`Connected to ${info.device_ap_ssid}. Choose the new Wi-Fi network and reconnect the device.`);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Failed to reach the AddOne AP.");
    }
  }

  async function handleProvisionDeviceAp() {
    if (!session || !preparedRequest) {
      const firstError = Object.values(validation.errors)[0];
      setStatusError(firstError ?? "The Wi-Fi handoff is incomplete.");
      return;
    }

    try {
      setStatusError(null);
      setStatusMessage(null);
      const response = await submitProvisioning(preparedRequest);
      if (!response.accepted) {
        setStatusError(response.message ?? "The AddOne AP rejected the Wi-Fi payload.");
        return;
      }

      await markWaiting(session.id);
      setStatusMessage("Wi-Fi accepted. Waiting for the device to reconnect.");
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Failed to continue the recovery session.");
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
              Rejoin Wi-Fi
            </Text>
          </View>
          <IconButton icon="close-outline" onPress={() => router.back()} />
        </View>
      }
      scroll
    >
      <View style={{ gap: 14 }}>
        <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 18 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.title.fontFamily,
              fontSize: theme.typography.title.fontSize,
              lineHeight: theme.typography.title.lineHeight,
            }}
          >
            Recovery session
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            Rejoin the device to a new Wi-Fi network without resetting ownership or clearing history.
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
              {statusLabel(session)}
            </Text>
          </View>

          {session ? (
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              Session prefix: {session.claimTokenPrefix} · {formatExpirationLabel(session.expiresAt)}
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
              Recovering: {activeDevice.name}
            </Text>
          ) : null}

          {!session || session.isExpired || session.status === "cancelled" || session.status === "failed" || (session.status === "awaiting_ap" && !hasClaimToken) ? (
            <ActionButton
              disabled={isBusy}
              label={isBusy ? "Starting…" : "Start Wi-Fi recovery"}
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
              Choose the new network
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              Join the device network in system Wi-Fi settings first, then return here to scan and send the new credentials.
            </Text>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <ActionButton
                disabled={isCheckingAp || isScanningNetworks}
                label={isCheckingAp || isScanningNetworks ? "Scanning…" : "Check device AP"}
                onPress={() => {
                  void handleCheckDeviceAp();
                }}
                secondary
              />
              <ActionButton
                disabled={isSubmittingProvisioning || !preparedRequest}
                label={isSubmittingProvisioning ? "Sending…" : "Send Wi-Fi"}
                onPress={() => {
                  void handleProvisionDeviceAp();
                }}
              />
            </View>

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
              <FieldLabel>Nearby Wi-Fi</FieldLabel>
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
              {isScanningNetworks ? <ActivityIndicator color={theme.colors.textPrimary} /> : null}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {networks.map((network) => (
                  <ChoicePill
                    key={network.ssid}
                    disabled={isSubmittingProvisioning}
                    label={network.secure ? network.ssid : `${network.ssid} (open)`}
                    onPress={() => {
                      setWifiSsid(network.ssid);
                      setStatusError(null);
                      setStatusMessage(null);
                    }}
                    selected={draft.wifiSsid === network.ssid}
                  />
                ))}
              </View>
            </View>

            <View style={{ gap: 10 }}>
              <FieldLabel>Network name</FieldLabel>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmittingProvisioning}
                onChangeText={(value) => {
                  setWifiSsid(value);
                  setStatusError(null);
                  setStatusMessage(null);
                }}
                placeholder="Choose from the list or enter a hidden network"
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
          </GlassCard>
        ) : null}

        {session?.status === "awaiting_cloud" ? (
          <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 18 }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.title.fontFamily,
                fontSize: theme.typography.title.fontSize,
                lineHeight: theme.typography.title.lineHeight,
              }}
            >
              Waiting for the device
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              The device is reconnecting to Wi-Fi and cloud.
            </Text>
            <ActionButton
              disabled={isPolling}
              label={isPolling ? "Refreshing…" : "Refresh"}
              onPress={() => {
                void refreshSession();
              }}
              secondary
            />
          </GlassCard>
        ) : null}
      </View>
    </ScreenFrame>
  );
}
