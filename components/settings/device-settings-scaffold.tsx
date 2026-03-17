import { Stack } from "expo-router";
import { PropsWithChildren, ReactNode } from "react";
import { Pressable, StyleProp, Text, View, ViewStyle } from "react-native";

import { ScreenScrollView } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { theme } from "@/constants/theme";
import { useDeviceSettingsDraft } from "@/hooks/use-device-settings-draft";
import { withAlpha } from "@/lib/color";
import { AddOneDevice } from "@/types/addone";

function HeaderActionButton({
  disabled = false,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        opacity: disabled ? 0.4 : 1,
        paddingHorizontal: 2,
        paddingVertical: 6,
      }}
    >
      <Text
        style={{
          color: disabled ? theme.colors.textTertiary : theme.colors.accentAmber,
          fontFamily: theme.typography.label.fontFamily,
          fontSize: theme.typography.label.fontSize,
          lineHeight: theme.typography.label.lineHeight,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function SettingsFieldLabel({ children }: PropsWithChildren) {
  return (
    <Text
      style={{
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.label.fontFamily,
        fontSize: theme.typography.label.fontSize,
        lineHeight: theme.typography.label.lineHeight,
      }}
    >
      {children}
    </Text>
  );
}

export function SettingsSectionTitle({ children }: PropsWithChildren) {
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

export function SettingsNote({ children, tone = "secondary" }: PropsWithChildren<{ tone?: "error" | "secondary" }>) {
  return (
    <Text
      selectable
      style={{
        color: tone === "error" ? theme.colors.statusErrorMuted : theme.colors.textSecondary,
        fontFamily: theme.typography.body.fontFamily,
        fontSize: 13,
        lineHeight: 18,
      }}
    >
      {children}
    </Text>
  );
}

export function SettingsSurface({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <GlassCard
      style={[
        {
          gap: 14,
          paddingHorizontal: 16,
          paddingVertical: 16,
        },
        style,
      ]}
    >
      {children}
    </GlassCard>
  );
}

export function SettingsRow({
  detail,
  onPress,
  title,
  trailing,
}: {
  detail: ReactNode;
  onPress?: () => void;
  title: string;
  trailing?: ReactNode;
}) {
  const body = (
    <View
      style={{
        minHeight: 64,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <SettingsFieldLabel>{title}</SettingsFieldLabel>
        {typeof detail === "string" ? <SettingsNote>{detail}</SettingsNote> : detail}
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {trailing}
        {onPress ? (
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.title.fontFamily,
              fontSize: theme.typography.title.fontSize,
              lineHeight: theme.typography.title.lineHeight,
            }}
          >
            ›
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (!onPress) {
    return body;
  }

  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: theme.radius.card,
      }}
    >
      {body}
    </Pressable>
  );
}

export function SettingsSwatchStrip({ colors }: { colors: string[] }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      {colors.map((color, index) => (
        <View
          key={`${color}-${index}`}
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            borderWidth: 1,
            borderColor: withAlpha(theme.colors.textPrimary, 0.08),
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}

export function SettingsDivider() {
  return <View style={{ height: 1, backgroundColor: withAlpha(theme.colors.textPrimary, 0.06) }} />;
}

export function DeviceSettingsScaffold({
  children,
  device,
  headerLeft,
  largeTitle = false,
  subtitle,
  title,
}: {
  children: (settings: ReturnType<typeof useDeviceSettingsDraft>) => ReactNode;
  device: AddOneDevice;
  headerLeft?: () => ReactNode;
  largeTitle?: boolean;
  subtitle?: string;
  title: string;
}) {
  const settings = useDeviceSettingsDraft(device);

  return (
    <>
      <ScreenScrollView
        contentContainerStyle={{ paddingTop: 0 }}
        contentMaxWidth={theme.layout.narrowContentWidth}
        safeAreaEdges={["left", "right", "bottom"]}
      >
        <View style={{ gap: 14 }}>
          {subtitle ? <SettingsNote>{subtitle}</SettingsNote> : null}
          {settings.statusMessage ? <SettingsNote>{settings.statusMessage}</SettingsNote> : null}
          {settings.statusError ? <SettingsNote tone="error">{settings.statusError}</SettingsNote> : null}
          <View style={{ gap: 12 }}>{children(settings)}</View>
        </View>
      </ScreenScrollView>

      <Stack.Screen
        options={{
          headerLargeTitle: largeTitle,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.bgBase },
          headerTintColor: theme.colors.textPrimary,
          headerLeft,
          headerTitle: title,
          headerTitleStyle: {
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.title.fontFamily,
            fontSize: theme.typography.title.fontSize,
          },
          headerRight: () => (
            <HeaderActionButton
              disabled={!settings.canApply}
              label={settings.isSavingSettings ? "Applying…" : "Apply"}
              onPress={() => {
                void settings.apply();
              }}
            />
          ),
        }}
      />
    </>
  );
}
