import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { PropsWithChildren, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  View,
  ViewProps,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";

const IS_IOS = process.env.EXPO_OS === "ios";

interface ScreenFrameProps extends PropsWithChildren {
  bottomOverlay?: ReactNode;
  bottomInset?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  contentMaxWidth?: number;
  header?: ReactNode;
  scroll?: boolean;
}

function ScreenBackdrop() {
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
      <LinearGradient
        colors={[theme.colors.bgBase, theme.colors.bgCanvas, theme.colors.bgSurface]}
        end={{ x: 0.5, y: 1 }}
        start={{ x: 0.5, y: 0 }}
        style={{ flex: 1 }}
      />
      <LinearGradient
        colors={[theme.colors.overlayHighlight, "transparent"]}
        end={{ x: 0.85, y: 0.5 }}
        start={{ x: 0, y: 0 }}
        style={{ position: "absolute", top: 0, right: 0, left: 0, height: 220 }}
      />
    </View>
  );
}

function ScreenShell({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bgBase }}>
      <StatusBar style="light" />
      <ScreenBackdrop />
      {children}
    </SafeAreaView>
  );
}

function PageWidth({ children, maxWidth = theme.layout.maxContentWidth }: PropsWithChildren<{ maxWidth?: number }>) {
  return (
    <View style={{ width: "100%", maxWidth, alignSelf: "center" }}>
      {children}
    </View>
  );
}

interface ScreenViewProps extends PropsWithChildren {
  bottomOverlay?: ReactNode;
  bottomInset?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  contentMaxWidth?: number;
  header?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ScreenView({
  children,
  header,
  bottomOverlay,
  bottomInset,
  contentContainerStyle,
  contentMaxWidth,
  style,
}: ScreenViewProps) {
  const contentBottomInset = bottomOverlay ? theme.layout.tabScrollBottom : bottomInset ?? theme.layout.scrollBottom;

  return (
    <ScreenShell>
      <KeyboardAvoidingView
        behavior={IS_IOS ? "padding" : undefined}
        keyboardVerticalOffset={IS_IOS ? 8 : 0}
        style={[{ flex: 1 }, style]}
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: theme.layout.pagePadding,
            paddingTop: theme.layout.scrollTop,
            paddingBottom: contentBottomInset,
          }}
        >
          <PageWidth maxWidth={contentMaxWidth}>
            {header ? <View style={{ marginBottom: theme.spacing[16] }}>{header}</View> : null}
            <View style={[{ flex: 1 }, contentContainerStyle]}>{children}</View>
          </PageWidth>
        </View>
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
    </ScreenShell>
  );
}

interface ScreenScrollViewProps extends Omit<ScrollViewProps, "contentContainerStyle"> {
  bottomOverlay?: ReactNode;
  bottomInset?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  contentMaxWidth?: number;
  header?: ReactNode;
}

export function ScreenScrollView({
  children,
  header,
  bottomOverlay,
  bottomInset,
  contentContainerStyle,
  contentMaxWidth,
  keyboardDismissMode = "interactive",
  keyboardShouldPersistTaps = "handled",
  showsVerticalScrollIndicator = false,
  ...scrollViewProps
}: ScreenScrollViewProps) {
  const contentBottomInset = bottomOverlay ? theme.layout.tabScrollBottom : bottomInset ?? theme.layout.scrollBottom;

  return (
    <ScreenShell>
      <KeyboardAvoidingView
        behavior={IS_IOS ? "padding" : undefined}
        keyboardVerticalOffset={IS_IOS ? 8 : 0}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            {
              paddingHorizontal: theme.layout.pagePadding,
              paddingTop: theme.layout.scrollTop,
              paddingBottom: contentBottomInset,
            },
            contentContainerStyle,
          ]}
          keyboardDismissMode={keyboardDismissMode}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          {...scrollViewProps}
        >
          <PageWidth maxWidth={contentMaxWidth}>
            {header ? <View style={{ marginBottom: theme.spacing[16] }}>{header}</View> : null}
            {children}
          </PageWidth>
        </ScrollView>
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
    </ScreenShell>
  );
}

export function ScreenSection({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  return (
    <View style={[{ gap: theme.layout.sectionGap }, style]} {...props}>
      {children}
    </View>
  );
}

export function ScreenFrame({
  children,
  header,
  scroll = false,
  bottomOverlay,
  bottomInset,
  contentContainerStyle,
  contentMaxWidth,
}: ScreenFrameProps) {
  if (scroll) {
    return (
      <ScreenScrollView
        bottomInset={bottomInset}
        bottomOverlay={bottomOverlay}
        contentContainerStyle={contentContainerStyle}
        contentMaxWidth={contentMaxWidth}
        header={header}
      >
        {children}
      </ScreenScrollView>
    );
  }

  return (
    <ScreenView
      bottomInset={bottomInset}
      bottomOverlay={bottomOverlay}
      contentContainerStyle={contentContainerStyle}
      contentMaxWidth={contentMaxWidth}
      header={header}
    >
      {children}
    </ScreenView>
  );
}
