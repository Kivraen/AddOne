import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { ScreenFrame } from "@/components/layout/screen-frame";
import { ChoicePill } from "@/components/ui/choice-pill";
import { GlassCard } from "@/components/ui/glass-card";
import { IconButton } from "@/components/ui/icon-button";
import { WifiNetworkPicker } from "@/components/ui/wifi-network-picker";
import { theme } from "@/constants/theme";
import { useApProvisioning } from "@/hooks/use-ap-provisioning";
import { useDeviceActions, useDevices } from "@/hooks/use-devices";
import { useDeviceAp } from "@/hooks/use-device-ap";
import { useOnboarding } from "@/hooks/use-onboarding";
import { withAlpha } from "@/lib/color";

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

function StepHeader({
  step,
  title,
}: {
  step: number;
  title: string;
}) {
  return (
    <View style={{ gap: 8 }}>
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
        Step {step} of 4
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

function TextField({
  disabled = false,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  value,
}: {
  disabled?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  value: string;
}) {
  return (
    <TextInput
      autoCapitalize="none"
      autoCorrect={false}
      editable={!disabled}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.textTertiary}
      secureTextEntry={secureTextEntry}
      style={{
        borderRadius: theme.radius.sheet,
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: withAlpha(theme.colors.bgBase, 0.84),
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.body.fontFamily,
        fontSize: theme.typography.body.fontSize,
        lineHeight: theme.typography.body.lineHeight,
        opacity: disabled ? 0.6 : 1,
        paddingHorizontal: 16,
        paddingVertical: 16,
      }}
      value={value}
    />
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { activeDevice } = useDevices();
  const { applySettingsDraft, isSavingSettings } = useDeviceActions();
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

  const [pickerVisible, setPickerVisible] = useState(false);
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

  const sessionReadyForAp = session?.status === "awaiting_ap" && !session.isExpired && hasClaimToken;
  const claimedDeviceReady = session?.status === "claimed" && !!activeDevice && activeDevice.id === session.deviceId;
  const sortedNetworks = useMemo(
    () =>
      [...networks].sort((left, right) => {
        const leftRssi = left.rssi ?? -999;
        const rightRssi = right.rssi ?? -999;
        return rightRssi - leftRssi;
      }),
    [networks],
  );
  const onboardingPatch =
    claimedDeviceReady && activeDevice
      ? {
          ...(paletteId !== activeDevice.paletteId ? { palette_preset: paletteId } : {}),
          ...(timezoneInput.trim() !== activeDevice.timezone ? { timezone: timezoneInput.trim() } : {}),
          ...(weeklyTarget !== activeDevice.weeklyTarget ? { weekly_target: weeklyTarget } : {}),
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
      const response = await scanNetworks();
      if (response.networks.length > 0) {
        setPickerVisible(true);
      }
      setSetupMessage(`Connected to ${info.device_ap_ssid}. Choose your Wi‑Fi and continue.`);
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Failed to reach the AddOne AP.");
    }
  }

  async function handleProvisionDeviceAp() {
    if (!session || !preparedRequest) {
      const firstError = Object.values(validation.errors)[0];
      setSetupError(firstError ?? "The Wi‑Fi details are incomplete.");
      return;
    }

    try {
      setSetupError(null);
      setSetupMessage(null);
      const response = await submitProvisioning(preparedRequest);
      if (!response.accepted) {
        setSetupError(response.message ?? "The device rejected the Wi‑Fi payload.");
        return;
      }

      await markWaiting(session.id);
      setSetupMessage("Connecting the device to your Wi‑Fi…");
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Failed to continue setup.");
    }
  }

  async function handleFinishSetup() {
    if (!claimedDeviceReady || !activeDevice) {
      return;
    }

    try {
      setSetupError(null);
      setSetupMessage(null);
      if (onboardingPatch && Object.keys(onboardingPatch).length > 0) {
        await applySettingsDraft(onboardingPatch, activeDevice.id);
      }
      router.replace("/");
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Failed to finish setup.");
    }
  }

  let step = 1;
  if (sessionReadyForAp) {
    step = 2;
  } else if (session?.status === "awaiting_cloud") {
    step = 3;
  } else if (session?.status === "claimed") {
    step = 4;
  }

  return (
    <ScreenFrame
      header={
        <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingBottom: 20 }}>
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
              Setup
            </Text>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.display.fontFamily,
                fontSize: theme.typography.display.fontSize,
                lineHeight: theme.typography.display.lineHeight,
              }}
            >
              AddOne
            </Text>
          </View>
          <IconButton icon="close-outline" onPress={() => router.back()} />
        </View>
      }
      scroll
    >
      <WifiNetworkPicker
        isScanning={isScanningNetworks}
        networks={sortedNetworks}
        onClose={() => setPickerVisible(false)}
        onSelect={(network) => {
          setWifiSsid(network.ssid);
          setSetupError(null);
          setSetupMessage(null);
          setPickerVisible(false);
        }}
        selectedSsid={draft.wifiSsid}
        visible={pickerVisible}
      />

      <View style={{ gap: 16 }}>
        <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 18 }}>
          <StepHeader
            step={step}
            title={
              step === 1
                ? "Start setup"
                : step === 2
                  ? "Join AddOne Wi‑Fi"
                  : step === 3
                    ? "Connect the device"
                    : "Finish setup"
            }
          />

          {step === 1 ? (
            <>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: theme.typography.body.fontSize,
                  lineHeight: theme.typography.body.lineHeight,
                }}
              >
                Start a local setup session, join the device Wi‑Fi, then connect AddOne to your home network.
              </Text>
              <ActionButton disabled={isBusy} label={isBusy ? "Starting…" : "Start setup"} onPress={() => void handleStartSession()} />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: theme.typography.body.fontSize,
                  lineHeight: theme.typography.body.lineHeight,
                }}
              >
                In system Wi‑Fi settings, join `AddOne-XXXX`. Then return here, pick your home network, and enter the password.
              </Text>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <ActionButton
                  disabled={isCheckingAp || isScanningNetworks}
                  label={isCheckingAp || isScanningNetworks ? "Checking…" : "Check AddOne Wi‑Fi"}
                  onPress={() => void handleCheckDeviceAp()}
                  secondary
                />
                <ActionButton
                  disabled={isSubmittingProvisioning || !preparedRequest}
                  label={isSubmittingProvisioning ? "Sending…" : "Continue"}
                  onPress={() => void handleProvisionDeviceAp()}
                />
              </View>

              <View style={{ gap: 10 }}>
                <FieldLabel>Wi‑Fi network</FieldLabel>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <TextField
                      disabled={isSubmittingProvisioning}
                      onChangeText={(value) => {
                        setWifiSsid(value);
                        setSetupError(null);
                        setSetupMessage(null);
                      }}
                      placeholder="Choose or type the network"
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
                <TextField
                  disabled={isSubmittingProvisioning}
                  onChangeText={(value) => {
                    setWifiPassword(value);
                    setSetupError(null);
                    setSetupMessage(null);
                  }}
                  placeholder="Enter the Wi‑Fi password"
                  secureTextEntry
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
              </View>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: theme.typography.body.fontSize,
                  lineHeight: theme.typography.body.lineHeight,
                }}
              >
                The device is joining Wi‑Fi, claiming itself in cloud, and publishing its first live snapshot.
              </Text>
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
                  Waiting for the device…
                </Text>
              </View>
              <ActionButton
                disabled={isPolling}
                label={isPolling ? "Refreshing…" : "Refresh"}
                onPress={() => void refreshSession()}
                secondary
              />
            </>
          ) : null}

          {step === 4 ? (
            <>
              {!claimedDeviceReady || !activeDevice ? (
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: theme.typography.body.fontSize,
                    lineHeight: theme.typography.body.lineHeight,
                  }}
                >
                  Waiting for the first live device snapshot…
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
                    Set the few things that matter now. Reset time stays at midnight and brightness stays on auto-adjust.
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
                    <TextField onChangeText={setTimezoneInput} placeholder="America/Los_Angeles" value={timezoneInput} />
                    <View style={{ alignItems: "flex-start" }}>
                      <ActionButton
                        disabled={timezoneInput === currentPhoneTimezone()}
                        label="Use phone timezone"
                        onPress={() => setTimezoneInput(currentPhoneTimezone())}
                        secondary
                      />
                    </View>
                  </View>

                  <View style={{ gap: 10 }}>
                    <FieldLabel>Palette</FieldLabel>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {[
                        { id: "classic", label: "Classic" },
                        { id: "amber", label: "Amber" },
                        { id: "ice", label: "Ice" },
                        { id: "rose", label: "Rose" },
                      ].map((palette) => (
                        <ChoicePill
                          key={palette.id}
                          disabled={isSavingSettings}
                          label={palette.label}
                          onPress={() => setPaletteId(palette.id)}
                          selected={paletteId === palette.id}
                        />
                      ))}
                    </View>
                  </View>

                  <ActionButton
                    disabled={isSavingSettings}
                    label={isSavingSettings ? "Finishing…" : "Open my board"}
                    onPress={() => void handleFinishSetup()}
                  />
                </>
              )}
            </>
          ) : null}

          {session ? (
            <Text
              style={{
                color: theme.colors.textTertiary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              {formatExpirationLabel(session.expiresAt)}
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

          {apInfo ? (
            <Text
              style={{
                color: theme.colors.textTertiary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              Device AP: {apInfo.device_ap_ssid}
            </Text>
          ) : null}

          {setupError || apInfoError || networksError || provisioningError || provisioningResponse?.message ? (
            <Text
              style={{
                color: theme.colors.statusErrorMuted,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              {setupError ?? apInfoError ?? networksError ?? provisioningError ?? provisioningResponse?.message}
            </Text>
          ) : null}
        </GlassCard>
      </View>
    </ScreenFrame>
  );
}
