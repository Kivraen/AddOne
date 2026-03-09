import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { ScreenFrame } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { IconButton } from "@/components/ui/icon-button";
import { theme } from "@/constants/theme";
import {
  buildDeviceApInfoUrl,
  buildDeviceApProvisioningEndpoint,
  maskProvisioningSecret,
} from "@/lib/ap-provisioning";
import { useApProvisioning } from "@/hooks/use-ap-provisioning";
import { useDeviceAp } from "@/hooks/use-device-ap";
import { useAuth } from "@/hooks/use-auth";
import { useOnboarding } from "@/hooks/use-onboarding";
import { withAlpha } from "@/lib/color";
import { DeviceOnboardingSession } from "@/types/addone";

const ONBOARDING_STEPS = [
  {
    detail: "The QR on the back sends people to addone.studio/start for setup instructions and app handoff.",
    step: "Step 1",
    title: "Open the start page",
  },
  {
    detail: "On first boot or after a recovery reset, the device opens its temporary AddOne Wi-Fi access point.",
    step: "Step 2",
    title: "Join the device access point",
  },
  {
    detail: "The app sends home Wi-Fi credentials and a one-time claim token during the AP session. Wi-Fi stays local to the device.",
    step: "Step 3",
    title: "Provision Wi-Fi and claim context",
  },
  {
    detail: "The device connects to cloud, redeems the claim, and the app finishes onboarding after ownership is confirmed.",
    step: "Step 4",
    title: "Confirm ownership in cloud",
  },
] as const;

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
      return "Claimed";
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

function StepCard({
  detail,
  isActive,
  step,
  title,
}: (typeof ONBOARDING_STEPS)[number] & {
  isActive: boolean;
}) {
  return (
    <GlassCard
      style={{
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 18,
      }}
    >
      <Text
        style={{
          color: isActive ? theme.colors.textPrimary : theme.colors.textTertiary,
          fontFamily: theme.typography.micro.fontFamily,
          fontSize: theme.typography.micro.fontSize,
          lineHeight: theme.typography.micro.lineHeight,
          letterSpacing: theme.typography.micro.letterSpacing,
          textTransform: "uppercase",
        }}
      >
        {step}
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
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontFamily: theme.typography.body.fontFamily,
          fontSize: theme.typography.body.fontSize,
          lineHeight: theme.typography.body.lineHeight,
        }}
      >
        {detail}
      </Text>
    </GlassCard>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { mode } = useAuth();
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
    simulateRedeemForTesting,
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
    hardwareProfileHint: session?.hardwareProfileHint ?? null,
    onboardingSessionId: session?.id ?? null,
  });
  const [devError, setDevError] = useState<string | null>(null);
  const [devMessage, setDevMessage] = useState<string | null>(null);
  const [hardwareUid, setHardwareUid] = useState("");
  const [habitName, setHabitName] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [showDevTools, setShowDevTools] = useState(false);
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
  const activeStepIndex = useMemo(() => {
    if (!session) {
      return 0;
    }

    if (session.status === "claimed") {
      return 3;
    }

    if (session.status === "awaiting_cloud") {
      return 3;
    }

    return 2;
  }, [session]);

  async function handleStartSession() {
    setSetupError(null);
    setSetupMessage(null);
    await createSession({
      bootstrapDayResetTime: "00:00:00",
      bootstrapTimezone: currentPhoneTimezone(),
      hardwareProfileHint: "addone-v1",
    });
  }

  async function handleCheckDeviceAp() {
    try {
      setSetupError(null);
      setSetupMessage(null);

      const info = await checkAp();
      setSetupMessage(
        `Connected to ${info.device_ap_ssid}${info.firmware_version ? ` · firmware ${info.firmware_version}` : ""}${
          info.hardware_profile ? ` · ${info.hardware_profile}` : ""
        }.`,
      );
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Failed to reach the AddOne AP.");
    }
  }

  async function handleProvisionDeviceAp() {
    if (!session) {
      return;
    }

    try {
      setSetupError(null);
      setSetupMessage(null);

      if (!preparedRequest) {
        const firstError = Object.values(validation.errors)[0];
        setSetupError(firstError ?? "The AP handoff is incomplete.");
        return;
      }

      const response = await submitProvisioning(preparedRequest);

      if (!response.accepted) {
        setSetupError(response.message ?? "The AddOne AP rejected the provisioning payload.");
        return;
      }

      await markWaiting(session.id);
      setSetupMessage(response.message ?? "Provisioning accepted. Waiting for the device to reconnect and claim in cloud.");
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Failed to continue the onboarding session.");
    }
  }

  async function handleDeveloperBypassAp() {
    if (!session) {
      return;
    }

    try {
      setSetupError(null);
      setSetupMessage(null);
      await markWaiting(session.id);
      setSetupMessage("Developer bypass used. The session moved to cloud waiting without a local AP request.");
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Failed to move the onboarding session forward.");
    }
  }

  async function handleSimulateRedeem() {
    if (!claimToken || !session) {
      return;
    }

    try {
      setDevError(null);
      setDevMessage(null);

      const nextSession = await simulateRedeemForTesting({
        claimToken,
        firmwareVersion: "staging-sim",
        hardwareProfile: session.hardwareProfileHint ?? "addone-v1",
        hardwareUid: hardwareUid.trim(),
        name: habitName.trim() || undefined,
      });

      if (nextSession.status === "claimed") {
        setDevMessage("Staging device redeemed through the onboarding session.");
        return;
      }

      setDevError(nextSession.lastError ?? "The onboarding session did not reach claimed status.");
    } catch (error) {
      setDevError(error instanceof Error ? error.message : "Failed to simulate device redemption.");
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
              Nearby setup
            </Text>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.display.fontFamily,
                fontSize: theme.typography.display.fontSize,
                lineHeight: theme.typography.display.lineHeight,
              }}
            >
              First boot
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
            Setup session
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            This is the real cloud-side onboarding contract for AddOne v1: generic QR, temporary AP, one-time claim token, then cloud
            confirmation.
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
            <View style={{ gap: 8 }}>
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
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: theme.typography.body.fontSize,
                  lineHeight: theme.typography.body.lineHeight,
                }}
              >
                {hasClaimToken
                  ? "The one-time claim token is stored locally in the app for the AP handoff."
                  : "This runtime no longer has the one-time claim token in memory. Start a fresh session before provisioning the device."}
              </Text>
            </View>
          ) : (
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              Start a setup session before sending Wi-Fi credentials to the device. The session is what binds the eventual cloud connection to the
              signed-in owner.
            </Text>
          )}

          {session?.lastError ? (
            <Text
              style={{
                color: theme.colors.statusErrorMuted,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              {session.lastError}
            </Text>
          ) : null}

          {setupMessage ? (
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              {setupMessage}
            </Text>
          ) : null}

          {setupError ? (
            <Text
              style={{
                color: theme.colors.statusErrorMuted,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              {setupError}
            </Text>
          ) : null}

          {!session || session.isExpired || session.status === "cancelled" || session.status === "failed" || (session.status === "awaiting_ap" && !hasClaimToken) ? (
            <Pressable
              disabled={isBusy}
              onPress={() => {
                void handleStartSession();
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
                  {session?.status === "awaiting_ap" && !hasClaimToken ? "Start fresh session" : "Start setup session"}
                </Text>
              )}
            </Pressable>
          ) : null}

          {session?.status === "awaiting_ap" && !session.isExpired && hasClaimToken ? (
            <View style={{ gap: 10 }}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontFamily: theme.typography.label.fontFamily,
                  fontSize: theme.typography.label.fontSize,
                  lineHeight: theme.typography.label.lineHeight,
                }}
              >
                Home Wi-Fi details
              </Text>

              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={(value) => {
                  setWifiSsid(value);
                  setSetupError(null);
                  setSetupMessage(null);
                }}
                placeholder="Home Wi-Fi name"
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
                  setSetupError(null);
                  setSetupMessage(null);
                }}
                placeholder="Home Wi-Fi password"
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

              <GlassCard
                style={{
                  gap: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 14,
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
                  Payload preview: session {session.claimTokenPrefix} · Wi-Fi {draft.wifiSsid.trim() || "Not set"} · password{" "}
                  {maskProvisioningSecret(draft.wifiPassword)}
                </Text>
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: theme.typography.body.fontSize,
                    lineHeight: theme.typography.body.lineHeight,
                  }}
                >
                  Wi-Fi credentials stay in app-local state and the temporary AP handoff. They are not stored in Supabase.
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
                    Local device response: {provisioningResponse.next_step}
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
                      Send to device
                    </Text>
                  )}
                </Pressable>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={() => {
                    clearDraft();
                    setSetupError(null);
                    setSetupMessage(null);
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
                    Clear Wi-Fi
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void handleStartSession();
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

              {mode === "cloud" && typeof __DEV__ !== "undefined" && __DEV__ ? (
                <Pressable
                  disabled={isBusy}
                  onPress={() => {
                    void handleDeveloperBypassAp();
                  }}
                  style={{
                    alignItems: "center",
                    borderRadius: theme.radius.sheet,
                    borderWidth: 1,
                    borderColor: withAlpha(theme.colors.accentAmber, 0.18),
                    backgroundColor: withAlpha(theme.colors.accentAmber, 0.08),
                    justifyContent: "center",
                    minHeight: 50,
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
                    Developer bypass AP request
                  </Text>
                </Pressable>
              ) : null}

              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: theme.typography.body.fontSize,
                  lineHeight: theme.typography.body.lineHeight,
                }}
              >
                The app now targets the real AP endpoints. Until firmware exposes them, the developer bypass keeps staging usable without pretending the
                local device request succeeded.
              </Text>
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
                Waiting for the device to come online and redeem the claim token. The app polls cloud for confirmation.
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
                    void handleStartSession();
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
                Cloud ownership is confirmed. Continue into the main board and finish habit-specific setup there.
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
                  Open my board
                </Text>
              </Pressable>
            </View>
          ) : null}
        </GlassCard>

        {ONBOARDING_STEPS.map((step, index) => (
          <StepCard key={step.step} {...step} isActive={index <= activeStepIndex} />
        ))}

        <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 18 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.title.fontFamily,
              fontSize: theme.typography.title.fontSize,
              lineHeight: theme.typography.title.lineHeight,
            }}
          >
            Recovery and support
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            The same AP path handles first boot, Wi-Fi reset, and recovery. LAN discovery can come later as a support convenience, but it is not
            the primary setup dependency.
          </Text>
          <Pressable
            onPress={() => router.push("/recovery")}
            style={{
              alignItems: "center",
              borderRadius: theme.radius.sheet,
              borderWidth: 1,
              borderColor: withAlpha(theme.colors.textPrimary, 0.12),
              backgroundColor: withAlpha(theme.colors.textPrimary, 0.08),
              marginTop: 4,
              paddingHorizontal: 20,
              paddingVertical: 18,
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
              Open recovery flow
            </Text>
          </Pressable>
        </GlassCard>

        {mode === "cloud" && typeof __DEV__ !== "undefined" && __DEV__ ? (
          <GlassCard style={{ gap: 14, paddingHorizontal: 16, paddingVertical: 18 }}>
            <Pressable
              onPress={() => {
                setShowDevTools((current) => !current);
                setDevError(null);
                setDevMessage(null);
              }}
              style={{ gap: 8 }}
            >
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontFamily: theme.typography.title.fontFamily,
                  fontSize: theme.typography.title.fontSize,
                  lineHeight: theme.typography.title.lineHeight,
                }}
              >
                Developer staging tools
              </Text>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: theme.typography.body.fontSize,
                  lineHeight: theme.typography.body.lineHeight,
                }}
              >
                {showDevTools
                  ? "Hide the staging simulation tools."
                  : "Show the temporary tools used to simulate firmware-side claim redemption."}
              </Text>
            </Pressable>

            {showDevTools ? (
              <View style={{ gap: 14 }}>
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
                  Simulate device redemption
                </Text>
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: theme.typography.body.fontSize,
                    lineHeight: theme.typography.body.lineHeight,
                  }}
                >
                  This simulates the future firmware step where the device reaches cloud and redeems the claim token after AP provisioning.
                </Text>

                <TextInput
                  autoCapitalize="characters"
                  onChangeText={(value) => {
                    setHardwareUid(value);
                    setDevError(null);
                    setDevMessage(null);
                  }}
                  placeholder="Hardware UID"
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
                  value={hardwareUid}
                />

                <TextInput
                  onChangeText={(value) => {
                    setHabitName(value);
                    setDevError(null);
                    setDevMessage(null);
                  }}
                  placeholder="Habit name (optional)"
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
                  value={habitName}
                />

                <Pressable
                  disabled={!hardwareUid.trim() || !session || !claimToken || isBusy}
                  onPress={() => {
                    void handleSimulateRedeem();
                  }}
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 54,
                    borderRadius: theme.radius.sheet,
                    backgroundColor:
                      !hardwareUid.trim() || !session || !claimToken || isBusy
                        ? withAlpha(theme.colors.textPrimary, 0.12)
                        : theme.colors.textPrimary,
                    opacity: !hardwareUid.trim() || !session || !claimToken || isBusy ? 0.6 : 1,
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
                      Simulate device online
                    </Text>
                  )}
                </Pressable>

                {!claimToken && session ? (
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontFamily: theme.typography.body.fontFamily,
                      fontSize: theme.typography.body.fontSize,
                      lineHeight: theme.typography.body.lineHeight,
                    }}
                  >
                    Start a fresh setup session if you need a new claim token for testing in this app runtime.
                  </Text>
                ) : null}

                {devMessage ? (
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontFamily: theme.typography.body.fontFamily,
                      fontSize: theme.typography.body.fontSize,
                      lineHeight: theme.typography.body.lineHeight,
                    }}
                  >
                    {devMessage}
                  </Text>
                ) : null}

                {devError ? (
                  <Text
                    style={{
                      color: theme.colors.statusErrorMuted,
                      fontFamily: theme.typography.body.fontFamily,
                      fontSize: theme.typography.body.fontSize,
                      lineHeight: theme.typography.body.lineHeight,
                    }}
                  >
                    {devError}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </GlassCard>
        ) : null}
      </View>
    </ScreenFrame>
  );
}
