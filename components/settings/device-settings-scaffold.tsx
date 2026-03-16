import { useNavigation } from "@react-navigation/native";
import { usePreventRemove } from "@react-navigation/native";
import { PropsWithChildren, ReactNode } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { PageHeader } from "@/components/app/page-header";
import { ScreenFrame } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { theme } from "@/constants/theme";
import { useDeviceSettingsDraft } from "@/hooks/use-device-settings-draft";
import { withAlpha } from "@/lib/color";

function ActionBarButton({
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
        minHeight: 36,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, 0.12),
        backgroundColor: withAlpha(theme.colors.bgElevated, 0.84),
        opacity: disabled ? 0.38 : 1,
        paddingHorizontal: 14,
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

export function SettingsSurface({ children, style }: { children: ReactNode; style?: object }) {
  return (
    <GlassCard style={[{ gap: 14, paddingHorizontal: 16, paddingVertical: 16 }, style]}>
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

export function DeviceSettingsScaffold({
  children,
  subtitle,
  title,
}: {
  children: (settings: ReturnType<typeof useDeviceSettingsDraft>) => ReactNode;
  subtitle?: string;
  title: string;
}) {
  const navigation = useNavigation();
  const settings = useDeviceSettingsDraft();

  usePreventRemove(settings.isSavingSettings || settings.isDirty, ({ data }) => {
    if (settings.isSavingSettings) {
      Alert.alert("Applying changes", "AddOne is still waiting for the device to confirm these settings.");
      return;
    }

    if (!settings.isDirty) {
      return;
    }

    const continueAction = () => navigation.dispatch(data.action);

    Alert.alert(
      "Keep your changes?",
      settings.validation.isValid
        ? "You have unpublished device changes."
        : "You have unpublished changes, but some values still need to be fixed.",
      settings.validation.isValid
        ? [
            { style: "cancel", text: "Stay" },
            {
              style: "destructive",
              text: "Discard",
              onPress: () => {
                settings.clearDraft();
                continueAction();
              },
            },
            {
              text: settings.isSavingSettings ? "Applying…" : "Apply",
              onPress: () => {
                void settings.apply().then((success) => {
                  if (!success) {
                    return;
                  }

                  settings.clearDraft();
                  continueAction();
                });
              },
            },
          ]
        : [
            { style: "cancel", text: "Stay" },
            {
              style: "destructive",
              text: "Discard",
              onPress: () => {
                settings.clearDraft();
                continueAction();
              },
            },
          ],
    );
  });

  return (
    <ScreenFrame
      header={
        <View style={{ gap: 12 }}>
          <PageHeader
            actions={
              <ActionBarButton
                disabled={!settings.canApply}
                label={settings.isSavingSettings ? "Applying…" : "Apply"}
                onPress={() => {
                  void settings.apply();
                }}
              />
            }
            subtitle={subtitle}
            title={title}
          />

          {settings.statusMessage ? <SettingsNote>{settings.statusMessage}</SettingsNote> : null}
          {settings.statusError ? <SettingsNote tone="error">{settings.statusError}</SettingsNote> : null}
        </View>
      }
      scroll
    >
      <View style={{ gap: 12 }}>{children(settings)}</View>
    </ScreenFrame>
  );
}
