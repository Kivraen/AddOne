import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { ScreenFrame } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { IconButton } from "@/components/ui/icon-button";
import { theme } from "@/constants/theme";
import { buildDeviceApInfoUrl, buildDeviceApProvisioningEndpoint, maskProvisioningSecret } from "@/lib/ap-provisioning";
import { withAlpha } from "@/lib/color";
import { useApProvisioning } from "@/hooks/use-ap-provisioning";
import { useDeviceAp } from "@/hooks/use-device-ap";
import { useDevices } from "@/hooks/use-devices";
import { useOnboarding } from "@/hooks/use-onboarding";
import { DeviceOnboardingSession } from "@/types/addone";

function formatExpirationLabel(expiresAt: string) {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  const diffMinutes = Math.max(0, Math.ceil(diffMs / 60000));

  if (diffMinutes <= 1) {
    return "Expires in under a minute";
  }

  return `Expires in ${diffMinutes} minutes`;
}

function currentPhoneTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
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
      return "Ready for AP";
    case "awaiting_cloud":
      return "Waiting for device";
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

export default function RecoveryScreen() {
  const router = useRouter();
  const { activeDevice } = useDevices();
  const {
    claimToken,
    createSession,
    hasClaimToken,
    isBusy,
    isLoading,
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
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const {
    apInfo,
    apInfoError,
    checkAp,
    isCheckingAp,
    isSubmittingProvisioning,
    provisioningError,
    provisioningResponse,
    submitProvisioning,
  } = useDeviceAp();

  const currentStatusTone = useMemo(() => statusTone(session), [session]);

  async function handleStartRecovery() {
    setStatusError(null);
    setStatusMessage(null);
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
      setStatusMessage(
        `Connected to ${info.device_ap_ssid}${info.firmware_version ? ` · firmware ${info.firmware_version}` : ""}${
          info.hardware_profile ? ` · ${info.hardware_profile}` : ""
        }.`,
      );
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Failed to reach the AddOne AP.");
    }
  }

  async function handleProvisionDeviceAp() {
    if (!session) {
      return;
    }

    try {
      setStatusError(null);
      setStatusMessage(null);

      if (!preparedRequest) {
        const firstError = Object.values(validation.errors)[0];
        setStatusError(firstError ?? "The AP handoff is incomplete.");
        return;
      }

      const response = await submitProvisioning(preparedRequest);
      if (!response.accepted) {
        setStatusError(response.message ?? "The AddOne AP rejected the provisioning payload.");
        return;
      }

      await markWaiting(session.id);
      setStatusMessage(response.message ?? "Wi-Fi accepted. Waiting for the device to rejoin cloud.");
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Failed to continue the recovery session.");
    }
  }

  const showDraftForm = session?.status === "awaiting_ap" && !session.isExpired && hasClaimToken;

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
            Live recovery session
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            This uses the same temporary AddOne AP flow as first boot. It does not factory reset the device or transfer ownership. It only helps the
            current owner save new Wi-Fi and let the device reconnect.
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

          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            Join the device network in system Wi‑Fi settings first, then return here and send the new home Wi‑Fi credentials.
          </Text>

          {!session || session.isExpired || session.status === "cancelled" || session.status === "failed" || (session.status === "awaiting_ap" && !hasClaimToken) ? (
            <Pressable
              disabled={isBusy}
              onPress={() => {
                void handleStartRecovery();
              }}
              style={{
                alignItems: "center",
                justifyContent: "center",
                minHeight: 56,
                borderRadius: theme.radius.sheet,
                backgroundColor: isBusy ? withAlpha(theme.colors.textPrimary, 0.12) : theme.colors.textPrimary,
                opacity: isBusy ? 0.6 : 1,
              }}
            >
              {isBusy ? (
                <ActivityIndicator color={theme.colors.bgBase} />
              ) : (
                <Text
                  style={{
                    color: theme.colors.bgBase,
                    fontFamily: theme.typography.label.fontFamily,
                    fontSize: theme.typography.label.fontSize,
                    lineHeight: theme.typography.label.lineHeight,
                  }}
                >
                  Start recovery session
                </Text>
              )}
            </Pressable>
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

          {showDraftForm ? (
            <View style={{ gap: 10 }}>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={(value) => {
                  setWifiSsid(value);
                  setStatusError(null);
                  setStatusMessage(null);
                }}
                placeholder="Home Wi‑Fi name"
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

              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={(value) => {
                  setWifiPassword(value);
                  setStatusError(null);
                  setStatusMessage(null);
                }}
                placeholder="Home Wi‑Fi password"
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

              <GlassCard style={{ gap: 8, paddingHorizontal: 14, paddingVertical: 14 }}>
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
                  Local AP handoff
                </Text>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: theme.typography.body.fontSize,
                    lineHeight: theme.typography.body.lineHeight,
                  }}
                >
                  Device info endpoint: {buildDeviceApInfoUrl()}
                </Text>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: theme.typography.body.fontSize,
                    lineHeight: theme.typography.body.lineHeight,
                  }}
                >
                  Device provisioning endpoint: {buildDeviceApProvisioningEndpoint()}
                </Text>
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: theme.typography.body.fontSize,
                    lineHeight: theme.typography.body.lineHeight,
                  }}
                >
                  Payload preview: session {session.claimTokenPrefix} · Wi‑Fi {draft.wifiSsid.trim() || "Not set"} · password{" "}
                  {maskProvisioningSecret(draft.wifiPassword)}
                </Text>
                {apInfo ? (
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontFamily: theme.typography.body.fontFamily,
                      fontSize: theme.typography.body.fontSize,
                      lineHeight: theme.typography.body.lineHeight,
                    }}
                  >
                    Last device probe: {apInfo.device_ap_ssid} · {apInfo.provisioning_state}
                    {apInfo.firmware_version ? ` · firmware ${apInfo.firmware_version}` : ""}
                    {apInfo.hardware_profile ? ` · ${apInfo.hardware_profile}` : ""}
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
                {provisioningResponse ? (
                  <Text
                    style={{
                      color: provisioningResponse.accepted ? theme.colors.textSecondary : theme.colors.statusErrorMuted,
                      fontFamily: theme.typography.body.fontFamily,
                      fontSize: theme.typography.body.fontSize,
                      lineHeight: theme.typography.body.lineHeight,
                    }}
                  >
                    Device response: {provisioningResponse.next_step}
                    {provisioningResponse.reboot_required ? " · reboot required" : ""}
                    {provisioningResponse.message ? ` · ${provisioningResponse.message}` : ""}
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
              </GlassCard>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  disabled={isCheckingAp}
                  onPress={() => {
                    void handleCheckDeviceAp();
                  }}
                  style={{
                    alignItems: "center",
                    borderRadius: theme.radius.sheet,
                    borderWidth: 1,
                    borderColor: withAlpha(theme.colors.textPrimary, 0.12),
                    flex: 1,
                    justifyContent: "center",
                    minHeight: 52,
                    opacity: isCheckingAp ? 0.6 : 1,
                  }}
                >
                  {isCheckingAp ? (
                    <ActivityIndicator color={theme.colors.textPrimary} />
                  ) : (
                    <Text
                      style={{
                        color: theme.colors.textPrimary,
                        fontFamily: theme.typography.label.fontFamily,
                        fontSize: theme.typography.label.fontSize,
                        lineHeight: theme.typography.label.lineHeight,
                      }}
                    >
                      Check AddOne AP
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  disabled={isBusy || !preparedRequest || isSubmittingProvisioning}
                  onPress={() => {
                    void handleProvisionDeviceAp();
                  }}
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 52,
                    borderRadius: theme.radius.sheet,
                    backgroundColor:
                      isBusy || !preparedRequest || isSubmittingProvisioning
                        ? withAlpha(theme.colors.textPrimary, 0.12)
                        : theme.colors.textPrimary,
                    flex: 1,
                    opacity: isBusy || !preparedRequest || isSubmittingProvisioning ? 0.6 : 1,
                  }}
                >
                  {isBusy || isSubmittingProvisioning ? (
                    <ActivityIndicator color={theme.colors.bgBase} />
                  ) : (
                    <Text
                      style={{
                        color: theme.colors.bgBase,
                        fontFamily: theme.typography.label.fontFamily,
                        fontSize: theme.typography.label.fontSize,
                        lineHeight: theme.typography.label.lineHeight,
                      }}
                    >
                      Save Wi‑Fi
                    </Text>
                  )}
                </Pressable>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={() => {
                    clearDraft();
                    setStatusError(null);
                    setStatusMessage(null);
                  }}
                  style={{
                    alignItems: "center",
                    borderRadius: theme.radius.sheet,
                    borderWidth: 1,
                    borderColor: withAlpha(theme.colors.textPrimary, 0.12),
                    flex: 1,
                    justifyContent: "center",
                    minHeight: 50,
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontFamily: theme.typography.label.fontFamily,
                      fontSize: theme.typography.label.fontSize,
                      lineHeight: theme.typography.label.lineHeight,
                    }}
                  >
                    Clear Wi‑Fi
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void handleStartRecovery();
                  }}
                  style={{
                    alignItems: "center",
                    borderRadius: theme.radius.sheet,
                    borderWidth: 1,
                    borderColor: withAlpha(theme.colors.textPrimary, 0.12),
                    flex: 1,
                    justifyContent: "center",
                    minHeight: 50,
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontFamily: theme.typography.label.fontFamily,
                      fontSize: theme.typography.label.fontSize,
                      lineHeight: theme.typography.label.lineHeight,
                    }}
                  >
                    Start fresh session
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {session?.status === "awaiting_cloud" && !session.isExpired ? (
            <View style={{ gap: 10 }}>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: theme.typography.body.fontSize,
                  lineHeight: theme.typography.body.lineHeight,
                }}
              >
                Waiting for the device to reconnect, rejoin cloud, and confirm the recovery session.
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  disabled={isBusy || isLoading}
                  onPress={() => {
                    void refreshSession();
                  }}
                  style={{
                    alignItems: "center",
                    borderRadius: theme.radius.sheet,
                    borderWidth: 1,
                    borderColor: withAlpha(theme.colors.textPrimary, 0.12),
                    flex: 1,
                    justifyContent: "center",
                    minHeight: 52,
                    opacity: isBusy || isLoading ? 0.6 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontFamily: theme.typography.label.fontFamily,
                      fontSize: theme.typography.label.fontSize,
                      lineHeight: theme.typography.label.lineHeight,
                    }}
                  >
                    {isPolling ? "Checking..." : "Refresh status"}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={isBusy}
                  onPress={() => {
                    void handleStartRecovery();
                  }}
                  style={{
                    alignItems: "center",
                    borderRadius: theme.radius.sheet,
                    borderWidth: 1,
                    borderColor: withAlpha(theme.colors.textPrimary, 0.12),
                    flex: 1,
                    justifyContent: "center",
                    minHeight: 52,
                    opacity: isBusy ? 0.6 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontFamily: theme.typography.label.fontFamily,
                      fontSize: theme.typography.label.fontSize,
                      lineHeight: theme.typography.label.lineHeight,
                    }}
                  >
                    Start fresh session
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {session?.status === "claimed" && !session.isExpired ? (
            <View style={{ gap: 10 }}>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: theme.typography.body.fontSize,
                  lineHeight: theme.typography.body.lineHeight,
                }}
              >
                The device is back online and the recovery session is confirmed. You can return to the board.
              </Text>
              <Pressable
                onPress={() => router.replace("/")}
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 56,
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
                  Return to board
                </Text>
              </Pressable>
            </View>
          ) : null}
        </GlassCard>

        <GlassCard style={{ gap: 10, paddingHorizontal: 16, paddingVertical: 18 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.title.fontFamily,
              fontSize: theme.typography.title.fontSize,
              lineHeight: theme.typography.title.lineHeight,
            }}
          >
            When to use recovery
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            Use this when the device moved to a different Wi‑Fi network, the router credentials changed, or the device is stuck in AddOne AP mode after
            failing to rejoin the saved network.
          </Text>
        </GlassCard>
      </View>
    </ScreenFrame>
  );
}
