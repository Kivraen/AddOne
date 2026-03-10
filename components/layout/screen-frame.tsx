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
          colors={[theme.colors.bgBase, theme.colors.bgSurface]}
          end={{ x: 0.5, y: 1 }}
          start={{ x: 0.5, y: 0 }}
          style={{ flex: 1 }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            right: -40,
            top: 36,
            height: 240,
            width: 240,
            borderRadius: 240,
            backgroundColor: withAlpha(theme.colors.accentAmber, 0.09),
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: -80,
            bottom: 120,
            height: 220,
            width: 220,
            borderRadius: 220,
            backgroundColor: withAlpha(theme.colors.textPrimary, 0.035),
          }}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        style={{ flex: 1 }}
      >
        {header ? <View className="px-4 pt-2">{header}</View> : null}
        <View className="flex-1 px-4 pb-6">{content}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
