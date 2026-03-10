import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { PropsWithChildren, ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";

interface ScreenFrameProps extends PropsWithChildren {
  header?: ReactNode;
  scroll?: boolean;
}

export function ScreenFrame({ children, header, scroll = false }: ScreenFrameProps) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 32 }}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View className="flex-1">{children}</View>
  );

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <StatusBar style="light" />
      <View className="absolute inset-0">
        <LinearGradient
          colors={[theme.colors.bgBase, "#090909", theme.colors.bgSurface]}
          end={{ x: 0.5, y: 1 }}
          start={{ x: 0.5, y: 0 }}
          style={{ flex: 1 }}
        />
        <LinearGradient
          colors={[withAlpha(theme.colors.textPrimary, 0.045), "transparent"]}
          end={{ x: 1, y: 0 }}
          start={{ x: 0, y: 0 }}
          style={{
            height: 1,
            left: 0,
            position: "absolute",
            right: 0,
            top: 0,
          }}
        />
        <LinearGradient
          colors={[withAlpha(theme.colors.accentAmber, 0.08), "transparent"]}
          end={{ x: 0.95, y: 0.8 }}
          start={{ x: 0.05, y: 0 }}
          style={{
            height: 220,
            left: 24,
            opacity: 0.55,
            position: "absolute",
            right: 24,
            top: 24,
          }}
        />
        <LinearGradient
          colors={["transparent", withAlpha(theme.colors.textPrimary, 0.03)]}
          end={{ x: 0.5, y: 1 }}
          start={{ x: 0.5, y: 0 }}
          style={{
            bottom: 0,
            height: 180,
            left: 0,
            position: "absolute",
            right: 0,
          }}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        style={{ flex: 1 }}
      >
        {header ? <View className="px-5 pt-3">{header}</View> : null}
        <View className="flex-1 px-5 pb-7">{content}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
