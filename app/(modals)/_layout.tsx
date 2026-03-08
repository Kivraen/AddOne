import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/hooks/use-auth";

export default function ModalLayout() {
  const { mode, status } = useAuth();

  if (mode === "cloud" && status !== "signedIn" && status !== "loading") {
    return <Redirect href="/sign-in" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
