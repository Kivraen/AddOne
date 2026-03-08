import { Session, User } from "@supabase/supabase-js";
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";

import { AppRuntimeMode, appRuntimeMode } from "@/lib/env";
import { getSupabaseClient } from "@/lib/supabase";

type AuthStatus = "loading" | "signedOut" | "signedIn" | "demo";

interface AuthContextValue {
  mode: AppRuntimeMode;
  status: AuthStatus;
  isConfigured: boolean;
  isSendingOtp: boolean;
  isVerifyingOtp: boolean;
  isAuthenticated: boolean;
  pendingEmail: string | null;
  session: Session | null;
  user: User | null;
  userEmail: string | null;
  sendEmailOtp: (email: string) => Promise<string | null>;
  verifyEmailOtp: (params: { email: string; token: string }) => Promise<string | null>;
  consumeAuthCallback: (url: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeParam(value: string | null) {
  return value?.trim() ? value.trim() : null;
}

function parseAuthCallbackUrl(url: string) {
  const normalized = url.includes("#") ? url.replace("#", "?") : url;
  const parsed = new URL(normalized);

  return {
    accessToken: normalizeParam(parsed.searchParams.get("access_token")),
    code: normalizeParam(parsed.searchParams.get("code")),
    error: normalizeParam(parsed.searchParams.get("error_description")) ?? normalizeParam(parsed.searchParams.get("error")),
    refreshToken: normalizeParam(parsed.searchParams.get("refresh_token")),
    tokenHash: normalizeParam(parsed.searchParams.get("token_hash")),
    type: normalizeParam(parsed.searchParams.get("type")),
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [status, setStatus] = useState<AuthStatus>(supabase ? "loading" : "demo");
  const [session, setSession] = useState<Session | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setStatus("demo");
      return;
    }

    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) {
          return;
        }

        setSession(data.session ?? null);
        setPendingEmail(data.session?.user.email ?? null);
        setStatus(data.session ? "signedIn" : "signedOut");
      })
      .catch(() => {
        if (mounted) {
          setStatus("signedOut");
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) {
        return;
      }

      setSession(nextSession);
      setPendingEmail(nextSession?.user.email ?? null);
      setStatus(nextSession ? "signedIn" : "signedOut");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value: AuthContextValue = {
    mode: appRuntimeMode,
    status,
    isConfigured: appRuntimeMode === "cloud",
    isSendingOtp,
    isVerifyingOtp,
    isAuthenticated: status === "signedIn" || status === "demo",
    pendingEmail,
    session,
    user: session?.user ?? null,
    userEmail: session?.user.email ?? pendingEmail,
    async consumeAuthCallback(url) {
      if (!supabase) {
        return "Supabase is not configured. The app is running in demo mode.";
      }

      try {
        const { accessToken, code, error, refreshToken, tokenHash, type } = parseAuthCallbackUrl(url);

        if (error) {
          return error;
        }

        if (accessToken && refreshToken) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          return setSessionError?.message ?? null;
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          return exchangeError?.message ?? null;
        }

        if (tokenHash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "email" | "email_change" | "invite" | "magiclink" | "recovery" | "signup",
          });

          return verifyError?.message ?? null;
        }

        return "Authentication link is missing the required session information.";
      } catch (error) {
        return error instanceof Error ? error.message : "Failed to complete sign-in.";
      }
    },
    async sendEmailOtp(email) {
      if (!supabase) {
        return "Supabase is not configured. The app is running in demo mode.";
      }

      setIsSendingOtp(true);
      setPendingEmail(email);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      setIsSendingOtp(false);

      if (error) {
        return error.message;
      }

      return null;
    },
    async verifyEmailOtp({ email, token }) {
      if (!supabase) {
        return "Supabase is not configured. The app is running in demo mode.";
      }

      const normalizedEmail = email.trim();
      const normalizedToken = token.trim();

      if (!normalizedEmail || !normalizedToken) {
        return "Email and code are required.";
      }

      setIsVerifyingOtp(true);

      const attemptTypes = ["email", "signup"] as const;
      let lastError: string | null = null;

      for (const type of attemptTypes) {
        const { error } = await supabase.auth.verifyOtp({
          email: normalizedEmail,
          token: normalizedToken,
          type,
        });

        if (!error) {
          setPendingEmail(normalizedEmail);
          setIsVerifyingOtp(false);
          return null;
        }

        lastError = error.message;
      }

      setIsVerifyingOtp(false);
      return lastError ?? "Failed to verify the email code.";
    },
    async signOut() {
      if (!supabase) {
        return;
      }

      await supabase.auth.signOut();
      setPendingEmail(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used inside AuthProvider.");
  }

  return context;
}
