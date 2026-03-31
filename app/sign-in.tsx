import { Redirect, Stack } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { ScreenScrollView, ScreenSection } from "@/components/layout/screen-frame";
import { AddOneLogoWordmark } from "@/components/branding/addone-logo";
import { GlassCard } from "@/components/ui/glass-card";
import { theme } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { withAlpha } from "@/lib/color";

const IS_IOS = process.env.EXPO_OS === "ios";
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_CODE_LENGTH = 6;
const OTP_PLACEHOLDER = "123456";

function SectionCopy({ children, tone = "secondary", textAlign = "left" }: { children: string; tone?: "primary" | "secondary" | "error"; textAlign?: "left" | "center" }) {
  const color =
    tone === "primary"
      ? theme.colors.textPrimary
      : tone === "error"
        ? theme.colors.statusErrorMuted
        : theme.colors.textSecondary;

  return (
    <Text
      selectable
      style={{
        color,
        fontFamily: theme.typography.body.fontFamily,
        fontSize: theme.typography.body.fontSize,
        lineHeight: theme.typography.body.lineHeight,
        textAlign,
      }}
    >
      {children}
    </Text>
  );
}

function FieldLabel({ children }: { children: string }) {
  return (
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
      {children}
    </Text>
  );
}

function formatOtpRequestError(error: string) {
  const normalized = error.toLowerCase();

  if (normalized.includes("email rate limit exceeded")) {
    return "Too many sign-in codes were requested. Wait a minute, then try again.";
  }

  if (normalized.includes("rate limit")) {
    return "Too many attempts right now. Wait a minute, then try again.";
  }

  if (normalized.includes("invalid email")) {
    return "Enter a valid email address.";
  }

  return error;
}

function formatOtpVerificationError(error: string) {
  const normalized = error.toLowerCase();

  if (normalized.includes("expired")) {
    return "That code expired. Request a new one and try again.";
  }

  if (normalized.includes("invalid")) {
    return "That code did not match. Check the 6-digit code and try again.";
  }

  return error;
}

function getAuthFieldStyle({ focused = false, readOnly = false }: { focused?: boolean; readOnly?: boolean }) {
  return {
    borderRadius: theme.radius.sheet,
    borderWidth: focused ? 1.5 : 1,
    borderColor: focused
      ? withAlpha(theme.colors.textPrimary, 0.28)
      : readOnly
        ? withAlpha(theme.colors.textPrimary, 0.14)
        : withAlpha(theme.colors.textPrimary, 0.18),
    backgroundColor: readOnly
      ? withAlpha(theme.colors.bgStrong, 0.78)
      : withAlpha(theme.colors.bgSurface, 0.86),
  };
}

export default function SignInScreen() {
  const { isSendingOtp, isVerifyingOtp, mode, pendingEmail, sendEmailOtp, status, verifyEmailOtp } = useAuth();
  const [email, setEmail] = useState(pendingEmail ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<"email" | "otp" | null>(null);
  const [step, setStep] = useState<"email" | "otp">("email");
  const [resendCooldown, setResendCooldown] = useState(0);
  const { height: windowHeight } = useWindowDimensions();

  const normalizedCode = useMemo(() => code.replace(/\s+/g, ""), [code]);
  const isOtpStep = step === "otp";
  const isResendBlocked = resendCooldown > 0;
  const trimmedEmail = email.trim().toLowerCase();
  const signInContentMinHeight = Math.max(560, windowHeight - 160);
  const emailButtonLabel = trimmedEmail ? "Send code" : "Type your email to continue";
  const isSubmitDisabled = isOtpStep
    ? normalizedCode.length < OTP_CODE_LENGTH || isVerifyingOtp
    : !trimmedEmail || isSendingOtp || isResendBlocked;
  const isPrimaryActionEnabled = !isSubmitDisabled;
  const primaryActionBackground = isPrimaryActionEnabled
    ? theme.colors.textPrimary
    : withAlpha(theme.colors.bgElevated, 0.94);
  const primaryActionBorderColor = isPrimaryActionEnabled
    ? "transparent"
    : withAlpha(theme.colors.textPrimary, 0.12);
  const primaryActionTextColor = isPrimaryActionEnabled
    ? theme.colors.textInverse
    : withAlpha(theme.colors.textPrimary, 0.68);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setResendCooldown((current) => {
        if (current <= 1) {
          clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [resendCooldown]);

  async function handleSendOtp() {
    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail || isSendingOtp || isResendBlocked) {
      return;
    }

    Keyboard.dismiss();
    setError(null);

    const nextError = await sendEmailOtp(nextEmail);
    if (nextError) {
      setError(formatOtpRequestError(nextError));
      return;
    }

    setEmail(nextEmail);
    setStep("otp");
    setCode("");
    setResendCooldown(OTP_RESEND_COOLDOWN_SECONDS);
  }

  async function handleVerifyOtp() {
    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail || normalizedCode.length < OTP_CODE_LENGTH || isVerifyingOtp) {
      return;
    }

    Keyboard.dismiss();
    setError(null);

    const nextError = await verifyEmailOtp({
      email: nextEmail,
      token: normalizedCode,
    });

    if (nextError) {
      setError(formatOtpVerificationError(nextError));
    }
  }

  if (mode === "demo" || status === "signedIn") {
    return <Redirect href="/" />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerLargeTitle: false,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.bgBase },
          headerTintColor: theme.colors.textPrimary,
          headerTitle: isOtpStep ? "Code" : "Account",
          headerTitleStyle: {
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.title.fontFamily,
            fontSize: theme.typography.title.fontSize,
          },
        }}
      />

      <ScreenScrollView
        bottomInset={theme.layout.scrollBottom}
        contentContainerStyle={{ flexGrow: 1 }}
        contentMaxWidth={theme.layout.narrowContentWidth}
      >
        <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
          <View style={{ flex: 1, minHeight: signInContentMinHeight }}>
            <ScreenSection style={{ flex: 1, gap: 0, paddingTop: 8, paddingBottom: 0 }}>
              <View style={{ flex: isOtpStep ? 0.18 : 0.24 }} />

              <View
                style={{
                  alignItems: "center",
                  paddingBottom: theme.spacing[20],
                }}
              >
                <AddOneLogoWordmark color="#FFFFFF" opacity={0.9} width={172} />
              </View>

              <View style={{ flex: isOtpStep ? 0.42 : 0.52 }} />

              <View
                style={{
                  paddingBottom: theme.spacing[24],
                }}
              >
                <View style={{ gap: 24 }}>
                  {isOtpStep ? (
                    <View style={{ alignItems: "center" }}>
                      <Text
                        style={{
                          color: theme.colors.textPrimary,
                          fontFamily: theme.typography.title.fontFamily,
                          fontSize: theme.typography.title.fontSize,
                          lineHeight: theme.typography.title.lineHeight,
                          maxWidth: 280,
                          textAlign: "center",
                        }}
                      >
                        Check your email
                      </Text>
                      <SectionCopy textAlign="center">{`Enter the ${OTP_CODE_LENGTH}-digit code sent to ${trimmedEmail}.`}</SectionCopy>
                    </View>
                    ) : null}

                  <GlassCard
                    style={
                      isOtpStep
                        ? { gap: 16, paddingHorizontal: 18, paddingVertical: 18 }
                        : {
                            gap: 12,
                            paddingHorizontal: 0,
                            paddingVertical: 0,
                            backgroundColor: "transparent",
                            borderWidth: 0,
                            boxShadow: "none",
                          }
                    }
                  >
                    {error ? (
                      <View
                        style={{
                          borderRadius: theme.radius.card,
                          borderWidth: 1,
                          borderColor: withAlpha(theme.colors.statusErrorMuted, 0.22),
                          backgroundColor: withAlpha(theme.colors.statusErrorMuted, 0.12),
                          paddingHorizontal: 14,
                          paddingVertical: 14,
                        }}
                      >
                        <SectionCopy tone="error">{error}</SectionCopy>
                      </View>
                    ) : null}

                    {!isOtpStep ? (
                      <TextInput
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect={false}
                        blurOnSubmit
                        keyboardType="email-address"
                        onChangeText={(value) => {
                          setEmail(value);
                          setError(null);
                        }}
                        onFocus={() => {
                          setFocusedField("email");
                        }}
                        onBlur={() => {
                          setFocusedField((current) => (current === "email" ? null : current));
                        }}
                        onSubmitEditing={() => {
                          void handleSendOtp();
                        }}
                        placeholder="Email"
                        placeholderTextColor={theme.colors.textMuted}
                        returnKeyType="send"
                        style={[
                          getAuthFieldStyle({ focused: focusedField === "email" }),
                          {
                            color: theme.colors.textPrimary,
                            fontFamily: theme.typography.body.fontFamily,
                            fontSize: theme.typography.body.fontSize,
                            lineHeight: theme.typography.body.lineHeight,
                            paddingHorizontal: 16,
                            paddingVertical: 18,
                            textAlign: "center",
                          },
                        ]}
                        value={email}
                      />
                    ) : (
                      <>
                        <View style={{ gap: 10 }}>
                          <FieldLabel>Email</FieldLabel>
                          <TextInput
                            autoCapitalize="none"
                            autoComplete="email"
                            autoCorrect={false}
                            blurOnSubmit
                            editable={false}
                            keyboardType="email-address"
                            placeholder="Email"
                            placeholderTextColor={theme.colors.textMuted}
                            style={[
                              getAuthFieldStyle({ readOnly: true }),
                              {
                                color: theme.colors.textPrimary,
                                fontFamily: theme.typography.body.fontFamily,
                                fontSize: theme.typography.body.fontSize,
                                lineHeight: theme.typography.body.lineHeight,
                                opacity: 0.72,
                                paddingHorizontal: 16,
                                paddingVertical: 16,
                                textAlign: "center",
                              },
                            ]}
                            value={email}
                          />
                        </View>

                        <TextInput
                          autoCapitalize="none"
                          autoComplete="one-time-code"
                          autoCorrect={false}
                          blurOnSubmit
                          inputAccessoryViewButtonLabel=""
                          inputMode="numeric"
                          keyboardType={IS_IOS ? "number-pad" : "numeric"}
                          maxLength={OTP_CODE_LENGTH}
                          onChangeText={(value) => {
                            setCode(value.replace(/\D+/g, "").slice(0, OTP_CODE_LENGTH));
                            setError(null);
                          }}
                          onFocus={() => {
                            setFocusedField("otp");
                          }}
                          onBlur={() => {
                            setFocusedField((current) => (current === "otp" ? null : current));
                          }}
                          placeholder={OTP_PLACEHOLDER}
                          placeholderTextColor={theme.colors.textMuted}
                          style={[
                            getAuthFieldStyle({ focused: focusedField === "otp" }),
                            {
                              color: theme.colors.textPrimary,
                              fontFamily: theme.typography.display.fontFamily,
                              fontSize: theme.typography.title.fontSize,
                              fontVariant: ["tabular-nums"],
                              letterSpacing: 2,
                              lineHeight: theme.typography.title.lineHeight,
                              paddingHorizontal: 16,
                              paddingVertical: 18,
                              textAlign: "center",
                            },
                          ]}
                          textContentType="oneTimeCode"
                          value={code}
                        />
                      </>
                    )}

                    <Pressable
                      disabled={isSubmitDisabled}
                      onPress={() => {
                        if (isOtpStep) {
                          void handleVerifyOtp();
                          return;
                        }

                        void handleSendOtp();
                      }}
                      style={{
                        alignItems: "center",
                        alignSelf: "stretch",
                        borderColor: primaryActionBorderColor,
                        borderWidth: isPrimaryActionEnabled ? 0 : 1,
                        justifyContent: "center",
                        minHeight: 58,
                        borderRadius: theme.radius.sheet,
                        backgroundColor: primaryActionBackground,
                        boxShadow: isPrimaryActionEnabled ? theme.shadows.panel : undefined,
                        paddingHorizontal: 0,
                      }}
                    >
                      {isSendingOtp || isVerifyingOtp ? (
                        <ActivityIndicator color={primaryActionTextColor} />
                      ) : (
                        <Text
                          style={{
                            color: primaryActionTextColor,
                            fontFamily: theme.typography.label.fontFamily,
                            fontSize: 18,
                            lineHeight: 22,
                          }}
                        >
                          {isOtpStep ? "Continue" : emailButtonLabel}
                        </Text>
                      )}
                    </Pressable>

                    {isOtpStep ? (
                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <Pressable
                          onPress={() => {
                            setStep("email");
                            setCode("");
                            setError(null);
                            setResendCooldown(0);
                          }}
                          style={{
                            alignItems: "center",
                            borderRadius: theme.radius.sheet,
                            borderWidth: 1,
                            borderColor: theme.materials.panel.border,
                            flex: 1,
                            justifyContent: "center",
                            minHeight: 52,
                          }}
                        >
                          <Text
                            style={{
                              color: theme.colors.textPrimary,
                              fontFamily: theme.typography.label.fontFamily,
                              fontSize: 18,
                              lineHeight: 22,
                            }}
                          >
                            Change email
                          </Text>
                        </Pressable>
                        <Pressable
                          disabled={isSendingOtp || isVerifyingOtp || isResendBlocked}
                          onPress={() => {
                            void handleSendOtp();
                          }}
                          style={{
                            alignItems: "center",
                            borderRadius: theme.radius.sheet,
                            borderWidth: 1,
                            borderColor: theme.materials.panel.border,
                            flex: 1,
                            justifyContent: "center",
                            minHeight: 52,
                            opacity: isSendingOtp || isVerifyingOtp || isResendBlocked ? 0.6 : 1,
                          }}
                        >
                          <Text
                            style={{
                              color: theme.colors.textPrimary,
                              fontFamily: theme.typography.label.fontFamily,
                              fontSize: 18,
                              lineHeight: 22,
                            }}
                          >
                            {isResendBlocked ? `Retry in ${resendCooldown}s` : "Resend"}
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </GlassCard>
                </View>
              </View>

              <View style={{ flex: isOtpStep ? 1.16 : 1.34 }} />

              <View
                style={{
                  alignItems: "center",
                  paddingBottom: theme.spacing[12],
                }}
              >
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: 13,
                    lineHeight: 18,
                    textAlign: "center",
                  }}
                >
                  Simple idea taken seriously
                </Text>
              </View>
            </ScreenSection>
          </View>
        </Pressable>
      </ScreenScrollView>
    </>
  );
}
