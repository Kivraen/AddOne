import { Redirect, useLocalSearchParams } from "expo-router";

import { HomeScreen } from "@/components/app/home-screen";

export default function HomeRoute() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  if (tab === "friends") {
    return <Redirect href="/friends" />;
  }

  if (tab === "profile") {
    return <Redirect href="/profile" />;
  }

  return <HomeScreen />;
}
