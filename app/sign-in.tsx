import { Image } from "expo-image";
import { Redirect, Stack } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { ScreenScrollView, ScreenSection } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { theme } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { withAlpha } from "@/lib/color";

const IS_IOS = process.env.EXPO_OS === "ios";
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const SIGN_IN_LOGO = require("../assets/branding/sign-in-logo.png");

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

export default function SignInScreen() {
  const { isSendingOtp, isVerifyingOtp, mode, pendingEmail, sendEmailOtp, status, verifyEmailOtp } = useAuth();
  const [email, setEmail] = useState(pendingEmail ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"email" | "otp">("email");
  const [resendCooldown, setResendCooldown] = useState(0);
  const { height: windowHeight } = useWindowDimensions();

  const normalizedCode = useMemo(() => code.replace(/\s+/g, ""), [code]);
  const isOtpStep = step === "otp";
  const isResendBlocked = resendCooldown > 0;
  const trimmedEmail = email.trim().toLowerCase();
  const emailStepTopOffset = Math.max(theme.spacing[40], Math.round((windowHeight - 120) * 0.18));
  const emailButtonLabel = trimmedEmail ? "Send code" : "Type your email to continue";
  const isSubmitDisabled = isOtpStep
    ? normalizedCode.length < 6 || isVerifyingOtp
    : !trimmedEmail || isSendingOtp || isResendBlocked;

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
    if (!nextEmail || normalizedCode.length < 6 || isVerifyingOtp) {
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

  const logo = (
    <View
      style={{
        alignItems: "center",
        paddingBottom: 12,
        paddingHorizontal: theme.layout.pagePadding,
      }}
    >
      <Image
        contentFit="contain"
        source={SIGN_IN_LOGO}
        style={{
          height: 44,
          opacity: 0.92,
          width: 220,
        }}
      />
    </View>
  );

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
        bottomInset={120}
        bottomOverlay={logo}
        contentContainerStyle={{ flexGrow: 1 }}
        contentMaxWidth={theme.layout.narrowContentWidth}
      >
        <KeyboardAvoidingView behavior={IS_IOS ? "padding" : undefined} keyboardVerticalOffset={16} style={{ flex: 1 }}>
          <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
            <View style={{ flex: 1, minHeight: "100%" }}>
              <ScreenSection style={{ flex: 1, justifyContent: "center", gap: 24, paddingTop: 24, paddingBottom: 0 }}>
                <View style={{ gap: 24, paddingTop: isOtpStep ? 0 : emailStepTopOffset }}>
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
                      <SectionCopy textAlign="center">{`Enter the 6-digit code sent to ${trimmedEmail}.`}</SectionCopy>
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
                        onSubmitEditing={() => {
                          void handleSendOtp();
                        }}
                        placeholder="Email"
                        placeholderTextColor={theme.colors.textMuted}
                        returnKeyType="send"
                        style={{
                          borderRadius: theme.radius.sheet,
                          borderWidth: 1,
                          borderColor: theme.materials.panel.border,
                          backgroundColor: withAlpha(theme.colors.bgBase, 0.2),
                          color: theme.colors.textPrimary,
                          fontFamily: theme.typography.body.fontFamily,
                          fontSize: theme.typography.body.fontSize,
                          lineHeight: theme.typography.body.lineHeight,
                          paddingHorizontal: 16,
                          paddingVertical: 18,
                          textAlign: "center",
                        }}
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
                            style={{
                              borderRadius: theme.radius.sheet,
                              borderWidth: 1,
                              borderColor: theme.materials.panel.border,
                              backgroundColor: withAlpha(theme.colors.bgBase, 0.2),
                            color: theme.colors.textPrimary,
                            fontFamily: theme.typography.body.fontFamily,
                            fontSize: theme.typography.body.fontSize,
                            lineHeight: theme.typography.body.lineHeight,
                            opacity: 0.72,
                            paddingHorizontal: 16,
                            paddingVertical: 16,
                            textAlign: "center",
                          }}
                          value={email}
                        />
                        </View>

                        <TextInput
                          autoCapitalize="none"
                          autoComplete="one-time-code"
                          autoCorrect={false}
                          blurOnSubmit
                          keyboardType={IS_IOS ? "number-pad" : "numeric"}
                          onChangeText={(value) => {
                            setCode(value);
                            setError(null);
                          }}
                          onSubmitEditing={() => {
                            void handleVerifyOtp();
                          }}
                          placeholder="123456"
                          placeholderTextColor={theme.colors.textMuted}
                          returnKeyType="done"
                          style={{
                            borderRadius: theme.radius.sheet,
                            borderWidth: 1,
                            borderColor: theme.materials.panel.border,
                            backgroundColor: withAlpha(theme.colors.bgBase, 0.2),
                            color: theme.colors.textPrimary,
                            fontFamily: theme.typography.display.fontFamily,
                            fontSize: theme.typography.title.fontSize,
                            letterSpacing: 2,
                            lineHeight: theme.typography.title.lineHeight,
                            paddingHorizontal: 16,
                            paddingVertical: 18,
                            textAlign: "center",
                          }}
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
                        borderColor: isOtpStep ? "transparent" : theme.materials.panel.border,
                        borderWidth: isOtpStep ? 0 : 1,
                        justifyContent: "center",
                        minHeight: 58,
                        borderRadius: theme.radius.sheet,
                        backgroundColor: isOtpStep
                          ? isSubmitDisabled
                            ? withAlpha(theme.colors.textPrimary, 0.12)
                            : theme.colors.textPrimary
                          : "transparent",
                        opacity: isSubmitDisabled ? 0.6 : 1,
                        paddingHorizontal: 0,
                      }}
                    >
                      {isSendingOtp || isVerifyingOtp ? (
                        <ActivityIndicator color={isOtpStep ? theme.colors.textInverse : theme.colors.textPrimary} />
                      ) : (
                        <Text
                          style={{
                            color: isOtpStep ? theme.colors.textInverse : theme.colors.textPrimary,
                            fontFamily: theme.typography.label.fontFamily,
                            fontSize: isOtpStep ? 18 : 18,
                            lineHeight: isOtpStep ? 22 : 22,
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
              </ScreenSection>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </ScreenScrollView>
    </>
  );
}
