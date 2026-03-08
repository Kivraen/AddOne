import * as Linking from "expo-linking";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";

import { ScreenFrame } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { theme } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const incomingUrl = Linking.useURL();
  const { consumeAuthCallback, mode, status } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [handled, setHandled] = useState(false);

  const fallbackUrl = useMemo(() => {
    const accessToken = firstValue(params.access_token);
    const code = firstValue(params.code);
    const refreshToken = firstValue(params.refresh_token);
    const tokenHash = firstValue(params.token_hash);
    const type = firstValue(params.type);
    const errorDescription = firstValue(params.error_description);
    const nextError = firstValue(params.error);

    if (!accessToken && !code && !refreshToken && !tokenHash && !type && !errorDescription && !nextError) {
      return null;
    }

    return Linking.createURL("/auth/callback", {
      queryParams: {
        access_token: accessToken,
        code,
        error: nextError,
        error_description: errorDescription,
        refresh_token: refreshToken,
        token_hash: tokenHash,
        type,
      },
    });
  }, [params.access_token, params.code, params.error, params.error_description, params.refresh_token, params.token_hash, params.type]);

  useEffect(() => {
    if (mode === "demo") {
      return;
    }

    if (status === "signedIn") {
      router.replace("/");
      return;
    }

    if (handled) {
      return;
    }

    const nextUrl =
      incomingUrl ??
      fallbackUrl ??
      (Platform.OS === "web" && typeof window !== "undefined" ? window.location.href : null);

    if (!nextUrl) {
      setError("The authentication callback did not include a usable sign-in URL.");
      setHandled(true);
      return;
    }

    setHandled(true);

    consumeAuthCallback(nextUrl).then((nextError) => {
      if (nextError) {
        setError(nextError);
        return;
      }

      router.replace("/");
    });
  }, [consumeAuthCallback, fallbackUrl, handled, incomingUrl, mode, router, status]);

  if (mode === "demo") {
    return <Redirect href="/" />;
  }

  return (
    <ScreenFrame>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <GlassCard style={{ gap: 16, paddingHorizontal: 18, paddingVertical: 18 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.title.fontFamily,
              fontSize: theme.typography.title.fontSize,
              lineHeight: theme.typography.title.lineHeight,
            }}
          >
            Completing sign-in
          </Text>

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
          ) : (
            <View style={{ alignItems: "center", flexDirection: "row", gap: 12 }}>
              <ActivityIndicator color={theme.colors.textPrimary} />
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: theme.typography.body.fontSize,
                  lineHeight: theme.typography.body.lineHeight,
                }}
              >
                Returning to your board…
              </Text>
            </View>
          )}
        </GlassCard>
      </View>
    </ScreenFrame>
  );
}
