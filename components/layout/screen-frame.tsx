import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { PropsWithChildren, ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";

interface ScreenFrameProps extends PropsWithChildren {
  bottomOverlay?: ReactNode;
  bottomInset?: number;
  header?: ReactNode;
  scroll?: boolean;
}

export function ScreenFrame({ children, header, scroll = false, bottomOverlay, bottomInset }: ScreenFrameProps) {
  const contentBottomInset = bottomOverlay ? 120 : bottomInset ?? 32;
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={{ paddingBottom: contentBottomInset }}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View className="flex-1" style={{ paddingBottom: contentBottomInset }}>
      {children}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <StatusBar style="light" />
      <View className="absolute inset-0">
        <LinearGradient
          colors={[theme.colors.bgBase, "#0B0B0B", theme.colors.bgSurface]}
          end={{ x: 0.5, y: 1 }}
          start={{ x: 0.5, y: 0 }}
          style={{ flex: 1 }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            left: 0,
            height: 180,
            backgroundColor: "rgba(255,255,255,0.015)",
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
        {bottomOverlay ? (
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              left: 0,
            }}
          >
            {bottomOverlay}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
