import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { ScreenFrame } from "@/components/layout/screen-frame";
import { ChoicePill } from "@/components/ui/choice-pill";
import { GlassCard } from "@/components/ui/glass-card";
import { IconButton } from "@/components/ui/icon-button";
import { theme } from "@/constants/theme";
import { useApProvisioning } from "@/hooks/use-ap-provisioning";
import { useAuth } from "@/hooks/use-auth";
import { useDeviceActions, useDevices } from "@/hooks/use-devices";
import { useDeviceAp } from "@/hooks/use-device-ap";
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
      return "Connecting";
    case "claimed":
      return "Connected";
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

export default function OnboardingScreen() {
  const router = useRouter();
  const { mode } = useAuth();
  const { activeDevice } = useDevices();
  const { applySettingsDraft, isSavingSettings } = useDeviceActions();
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
    hardwareProfileHint: session?.hardwareProfileHint ?? null,
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

  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [weeklyTarget, setWeeklyTarget] = useState(activeDevice?.weeklyTarget ?? 5);
  const [timezoneInput, setTimezoneInput] = useState(currentPhoneTimezone());
  const [paletteId, setPaletteId] = useState(activeDevice?.paletteId ?? "classic");

  useEffect(() => {
    if (!activeDevice || session?.status !== "claimed") {
      return;
    }

    setWeeklyTarget(activeDevice.weeklyTarget);
    setTimezoneInput(activeDevice.timezone || currentPhoneTimezone());
    setPaletteId(activeDevice.paletteId);
  }, [activeDevice, session?.status]);

  const currentStatusTone = useMemo(() => statusTone(session), [session]);
  const sessionReadyForAp = session?.status === "awaiting_ap" && !session.isExpired && hasClaimToken;
  const claimedDeviceReady = session?.status === "claimed" && !!activeDevice && activeDevice.id === session.deviceId;
  const onboardingPatch =
    claimedDeviceReady && activeDevice
      ? {
          palette_preset: paletteId !== activeDevice.paletteId ? paletteId : undefined,
          timezone: timezoneInput.trim() !== activeDevice.timezone ? timezoneInput.trim() : undefined,
          weekly_target: weeklyTarget !== activeDevice.weeklyTarget ? weeklyTarget : undefined,
        }
      : null;

  async function handleStartSession() {
    setSetupError(null);
    setSetupMessage(null);
    clearDraft();
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
      await scanNetworks();
      setSetupMessage(
        `Connected to ${info.device_ap_ssid}. Choose your Wi-Fi network, then send the password to the device.`,
      );
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Failed to reach the AddOne AP.");
    }
  }

  async function handleProvisionDeviceAp() {
    if (!session || !preparedRequest) {
      const firstError = Object.values(validation.errors)[0];
      setSetupError(firstError ?? "The Wi-Fi handoff is incomplete.");
      return;
    }

    try {
      setSetupError(null);
      setSetupMessage(null);
      const response = await submitProvisioning(preparedRequest);
      if (!response.accepted) {
        setSetupError(response.message ?? "The AddOne AP rejected the Wi-Fi payload.");
        return;
      }

      await markWaiting(session.id);
      setSetupMessage("Wi-Fi accepted. Waiting for the device to connect and publish its first live snapshot.");
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Failed to continue onboarding.");
    }
  }

  async function handleFinishSetup() {
    if (!claimedDeviceReady || !activeDevice) {
      return;
    }

    try {
      setSetupError(null);
      setSetupMessage(null);
      await applySettingsDraft(onboardingPatch ?? {}, activeDevice.id);
      router.replace("/");
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Failed to finish setup.");
    }
  }

  const networkListVisible = sessionReadyForAp && (isScanningNetworks || networks.length > 0 || !!networksError);

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
            Start setup
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            Connect to `AddOne-XXXX`, join your Wi‑Fi, then finish the few settings that matter.
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
              Setup session · {formatExpirationLabel(session.expiresAt)}
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
            <ActionButton
              disabled={isBusy}
              label={isBusy ? "Starting…" : "Start setup"}
              onPress={() => {
                void handleStartSession();
              }}
            />
          ) : null}
        </GlassCard>

        {sessionReadyForAp ? (
          <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 18 }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.title.fontFamily,
                fontSize: theme.typography.title.fontSize,
                lineHeight: theme.typography.title.lineHeight,
              }}
          >
            Connect Wi-Fi
          </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
          >
              First join the device network in system Wi‑Fi settings, then come back here and choose your network.
            </Text>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <ActionButton
                disabled={isCheckingAp || isScanningNetworks}
                label={isCheckingAp || isScanningNetworks ? "Scanning…" : "Check device"}
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
                  Device AP · {apInfo.device_ap_ssid}
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

            {networkListVisible ? (
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
                        setSetupError(null);
                        setSetupMessage(null);
                      }}
                      selected={draft.wifiSsid === network.ssid}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <View style={{ gap: 10 }}>
              <FieldLabel>Network name</FieldLabel>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmittingProvisioning}
                onChangeText={(value) => {
                  setWifiSsid(value);
                  setSetupError(null);
                  setSetupMessage(null);
                }}
                placeholder="Choose or type a network"
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
                  setSetupError(null);
                  setSetupMessage(null);
                }}
                placeholder="Enter password"
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
              The device is joining Wi‑Fi and publishing its first live board.
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <ActionButton
                disabled={isPolling}
                label={isPolling ? "Refreshing…" : "Refresh"}
                onPress={() => {
                  void refreshSession();
                }}
                secondary
              />
            </View>
          </GlassCard>
        ) : null}

        {session?.status === "claimed" ? (
          <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 18 }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.title.fontFamily,
                fontSize: theme.typography.title.fontSize,
                lineHeight: theme.typography.title.lineHeight,
              }}
            >
              Finish setup
            </Text>
            {!claimedDeviceReady || !activeDevice ? (
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: theme.typography.body.fontSize,
                  lineHeight: theme.typography.body.lineHeight,
                }}
              >
                Waiting for the first live board…
              </Text>
            ) : (
              <>
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: theme.typography.body.fontSize,
                    lineHeight: theme.typography.body.lineHeight,
                  }}
                >
                  Set the few things that matter now. Reset time stays at midnight and brightness stays on auto-adjust by default.
                </Text>

                <View style={{ gap: 10 }}>
                  <FieldLabel>Weekly target</FieldLabel>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {Array.from({ length: 7 }, (_, index) => index + 1).map((target) => (
                      <ChoicePill
                        key={`weekly-target-${target}`}
                        disabled={isSavingSettings}
                        label={String(target)}
                        onPress={() => setWeeklyTarget(target)}
                        selected={weeklyTarget === target}
                      />
                    ))}
                  </View>
                </View>

                <View style={{ gap: 10 }}>
                  <FieldLabel>Timezone</FieldLabel>
                  <TextInput
                    autoCapitalize="none"
                    editable={!isSavingSettings}
                    onChangeText={setTimezoneInput}
                    placeholder="America/Los_Angeles"
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
                    value={timezoneInput}
                  />
                </View>

                <View style={{ gap: 10 }}>
                  <FieldLabel>Board palette</FieldLabel>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {["classic", "amber", "ice", "rose"].map((option) => (
                      <ChoicePill
                        key={option}
                        disabled={isSavingSettings}
                        label={option.charAt(0).toUpperCase() + option.slice(1)}
                        onPress={() => setPaletteId(option)}
                        selected={paletteId === option}
                      />
                    ))}
                  </View>
                </View>

                <ActionButton
                  disabled={isSavingSettings}
                  label={isSavingSettings ? "Applying…" : "Finish setup"}
                  onPress={() => {
                    void handleFinishSetup();
                  }}
                />
              </>
            )}
          </GlassCard>
        ) : null}

        {mode === "demo" ? (
          <GlassCard style={{ gap: 8, paddingHorizontal: 16, paddingVertical: 14 }}>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              Demo mode skips real cloud/device ownership. Use cloud mode for the first-user build.
            </Text>
          </GlassCard>
        ) : null}
      </View>
    </ScreenFrame>
  );
}
