import { Redirect } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenFrame } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { theme } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { withAlpha } from "@/lib/color";

function SectionCopy({ children }: { children: string }) {
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

const OTP_RESEND_COOLDOWN_SECONDS = 60;

function formatOtpRequestError(error: string) {
  const normalized = error.toLowerCase();

  if (normalized.includes("email rate limit exceeded")) {
    return "Supabase returned \"Email rate limit exceeded\" for this staging project. This is the project's built-in auth email quota, not a sign that your address is invalid. Earlier auth emails, including magic-link tests, count toward the same quota. Wait for the limit window to reset or switch the project to custom SMTP.";
  }

  if (normalized.includes("rate limit")) {
    return "Supabase throttled auth email delivery for this staging project. This is a project-level limit, and earlier magic-link tests can count toward it too. Wait for the limit window to reset, then try again.";
  }

  return error;
}

export default function SignInScreen() {
  const { isSendingOtp, isVerifyingOtp, mode, pendingEmail, sendEmailOtp, status, verifyEmailOtp } = useAuth();
  const [email, setEmail] = useState(pendingEmail ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [step, setStep] = useState<"email" | "otp">("email");
  const [resendCooldown, setResendCooldown] = useState(0);

  const normalizedCode = useMemo(() => code.replace(/\s+/g, ""), [code]);
  const isOtpStep = step === "otp";
  const isResendBlocked = resendCooldown > 0;
  const isSubmitDisabled = isOtpStep
    ? normalizedCode.length < 6 || isVerifyingOtp
    : !email.trim() || isSendingOtp || isResendBlocked;

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
    setMessage(null);

    const nextError = await sendEmailOtp(nextEmail);
    if (nextError) {
      const formattedError = formatOtpRequestError(nextError);
      setError(formattedError);
      Alert.alert("Code request failed", formattedError);
      return;
    }

    setEmail(nextEmail);
    setStep("otp");
    setCode("");
    setResendCooldown(OTP_RESEND_COOLDOWN_SECONDS);

    const nextMessage = `Enter the email code from Supabase. You can request another code in ${OTP_RESEND_COOLDOWN_SECONDS} seconds. If the email still contains a magic link instead of a code, update the Supabase email template to use {{ .Token }}.`;
    setMessage(nextMessage);
    Alert.alert("Code sent", nextMessage);
  }

  async function handleVerifyOtp() {
    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail || normalizedCode.length < 6 || isVerifyingOtp) {
      return;
    }

    Keyboard.dismiss();
    setError(null);
    setMessage(null);

    const nextError = await verifyEmailOtp({
      email: nextEmail,
      token: normalizedCode,
    });

    if (nextError) {
      setError(nextError);
      Alert.alert("Code verification failed", nextError);
      return;
    }
  }

  if (mode === "demo" || status === "signedIn") {
    return <Redirect href="/" />;
  }

  return (
    <ScreenFrame
      scroll
      header={
        <View style={{ gap: 4, paddingBottom: 18 }}>
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
            AddOne account
          </Text>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.display.fontFamily,
              fontSize: theme.typography.display.fontSize,
              lineHeight: theme.typography.display.lineHeight,
            }}
          >
            {isOtpStep ? "Enter your email code" : "Sign in with email code"}
          </Text>
        </View>
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={16}
        style={{ flex: 1, justifyContent: "center" }}
      >
        <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: "center", gap: 20, minHeight: "100%" }}>
            <GlassCard style={{ gap: 18, paddingHorizontal: 18, paddingVertical: 18 }}>
              <SectionCopy>
                Cloud mode is enabled. Use your email to unlock syncing, shared boards, remote fallback completion, and automatic backups.
              </SectionCopy>

              {message ? <SectionCopy>{message}</SectionCopy> : null}

              {error ? (
                <Text
                  style={{
                    color: theme.colors.statusErrorMuted,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: theme.typography.body.fontSize,
                    lineHeight: theme.typography.body.lineHeight,
                  }}
                >
                  {error}
                </Text>
              ) : null}

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
                  Email
                </Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  blurOnSubmit
                  editable={!isOtpStep}
                  keyboardType="email-address"
                  onChangeText={(value) => {
                    setEmail(value);
                    setError(null);
                    setMessage(null);
                  }}
                  onSubmitEditing={() => {
                    if (!isOtpStep) {
                      void handleSendOtp();
                    }
                  }}
                  placeholder="you@example.com"
                  placeholderTextColor={theme.colors.textTertiary}
                  returnKeyType={isOtpStep ? "done" : "send"}
                  style={{
                    borderRadius: theme.radius.sheet,
                    borderWidth: 1,
                    borderColor: withAlpha(theme.colors.textPrimary, 0.08),
                    backgroundColor: withAlpha(theme.colors.bgElevated, 0.92),
                    color: theme.colors.textPrimary,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: theme.typography.body.fontSize,
                    lineHeight: theme.typography.body.lineHeight,
                    opacity: isOtpStep ? 0.72 : 1,
                    paddingHorizontal: 16,
                    paddingVertical: 16,
                  }}
                  value={email}
                />
              </View>

              {isOtpStep ? (
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
                    Email code
                  </Text>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="one-time-code"
                    autoCorrect={false}
                    blurOnSubmit
                    keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                    onChangeText={(value) => {
                      setCode(value);
                      setError(null);
                    }}
                    onSubmitEditing={() => {
                      void handleVerifyOtp();
                    }}
                    placeholder="123456"
                    placeholderTextColor={theme.colors.textTertiary}
                    returnKeyType="done"
                    style={{
                      borderRadius: theme.radius.sheet,
                      borderWidth: 1,
                      borderColor: withAlpha(theme.colors.textPrimary, 0.08),
                      backgroundColor: withAlpha(theme.colors.bgElevated, 0.92),
                      color: theme.colors.textPrimary,
                      fontFamily: theme.typography.display.fontFamily,
                      fontSize: theme.typography.title.fontSize,
                      letterSpacing: 2,
                      lineHeight: theme.typography.title.lineHeight,
                      paddingHorizontal: 16,
                      paddingVertical: 16,
                    }}
                    textContentType="oneTimeCode"
                    value={code}
                  />
                </View>
              ) : null}

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
                  justifyContent: "center",
                  minHeight: 58,
                  borderRadius: theme.radius.sheet,
                  backgroundColor: isSubmitDisabled ? withAlpha(theme.colors.textPrimary, 0.12) : theme.colors.textPrimary,
                  opacity: isSubmitDisabled ? 0.6 : 1,
                }}
              >
                {isSendingOtp || isVerifyingOtp ? (
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
                    {isOtpStep ? "Verify code" : "Send email code"}
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
                      setMessage(null);
                      setResendCooldown(0);
                    }}
                    style={{
                      alignItems: "center",
                      borderRadius: theme.radius.sheet,
                      borderWidth: 1,
                      borderColor: withAlpha(theme.colors.textPrimary, 0.12),
                      flex: 1,
                      justifyContent: "center",
                      minHeight: 52,
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
                      borderColor: withAlpha(theme.colors.textPrimary, 0.12),
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
                        fontSize: theme.typography.label.fontSize,
                        lineHeight: theme.typography.label.lineHeight,
                      }}
                    >
                      {isResendBlocked ? `Retry in ${resendCooldown}s` : "Resend code"}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </GlassCard>

            <Text
              style={{
                color: theme.colors.textTertiary,
                fontFamily: theme.typography.micro.fontFamily,
                fontSize: theme.typography.micro.fontSize,
                lineHeight: theme.typography.micro.lineHeight,
                letterSpacing: theme.typography.micro.letterSpacing,
                textAlign: "center",
                textTransform: "uppercase",
              }}
            >
              Current dev flow uses email OTP. Branded auth emails come later.
            </Text>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </ScreenFrame>
  );
}
