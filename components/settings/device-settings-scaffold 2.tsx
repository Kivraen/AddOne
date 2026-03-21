import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Stack, useRouter } from "expo-router";
import { PropsWithChildren, ReactNode } from "react";
import { Pressable, StyleProp, Text, View, ViewStyle } from "react-native";

import { ScreenScrollView } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { theme } from "@/constants/theme";
import { useDeviceSettingsDraft } from "@/hooks/use-device-settings-draft";
import { withAlpha } from "@/lib/color";
import { deviceSettingsPath } from "@/lib/device-routes";
import { AddOneDevice } from "@/types/addone";

const isIOS = process.env.EXPO_OS === "ios";
const IOS_HEADER_CONTROL_SIZE = 46;
const IOS_HEADER_APPLY_MIN_WIDTH = 78;
const IOS_HEADER_TITLE_SIDE_PADDING = 96;
const SETTINGS_SURFACE_PADDING_HORIZONTAL = 18;
const SETTINGS_SURFACE_PADDING_VERTICAL = 18;
const SETTINGS_LIST_GAP = 12;
const SETTINGS_LIST_PADDING_VERTICAL = 14;
const SETTINGS_ROW_MIN_HEIGHT = 68;
const SETTINGS_ROW_TEXT_GAP = 6;

export const SETTINGS_PAGE_GAP = 16;
export const SETTINGS_SURFACE_GAP = 18;
export const SETTINGS_HEADER_GAP = 6;
export const SETTINGS_HEADER_BOTTOM_SPACE = 16;
export const SETTINGS_FIELD_GAP = 10;

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

function HeaderBackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      hitSlop={10}
      onPress={onPress}
    >
      {({ pressed }) => (
        <BlurView
          intensity={60}
          style={{
            width: IOS_HEADER_CONTROL_SIZE,
            height: IOS_HEADER_CONTROL_SIZE,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: theme.radius.full,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: withAlpha(theme.colors.textPrimary, pressed ? 0.12 : 0.08),
            backgroundColor: withAlpha(theme.colors.bgElevated, pressed ? 0.76 : 0.56),
            boxShadow: `0px 10px 24px ${withAlpha(theme.colors.bgBase, 0.18)}`,
          }}
          tint="systemUltraThinMaterial"
        >
          <View
            style={{
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: withAlpha(theme.colors.textPrimary, pressed ? 0.08 : 0.02),
            }}
          >
            <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={24} />
          </View>
        </BlurView>
      )}
    </Pressable>
  );
}

function HeaderCapsuleActionButton({
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
        opacity: disabled ? 0.58 : 1,
      }}
    >
      {({ pressed }) => (
        <BlurView
          intensity={60}
          style={{
            minHeight: IOS_HEADER_CONTROL_SIZE,
            minWidth: IOS_HEADER_APPLY_MIN_WIDTH,
            overflow: "hidden",
            borderRadius: theme.radius.full,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: withAlpha(theme.colors.textPrimary, disabled ? 0.04 : pressed ? 0.12 : 0.08),
            backgroundColor: withAlpha(theme.colors.bgElevated, pressed && !disabled ? 0.8 : 0.58),
            boxShadow: `0px 10px 24px ${withAlpha(theme.colors.bgBase, 0.18)}`,
          }}
          tint="systemUltraThinMaterial"
        >
          <View
            style={{
              minHeight: IOS_HEADER_CONTROL_SIZE,
              minWidth: IOS_HEADER_APPLY_MIN_WIDTH,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: withAlpha(theme.colors.textPrimary, pressed && !disabled ? 0.08 : 0.02),
              paddingHorizontal: 14,
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
          </View>
        </BlurView>
      )}
    </Pressable>
  );
}

function DeviceSettingsPageHeader({
  left,
  onApply,
  showApply = true,
  title,
  applyDisabled = false,
  applyLabel,
}: {
  left?: ReactNode;
  onApply: () => void;
  showApply?: boolean;
  title: string;
  applyDisabled?: boolean;
  applyLabel: string;
}) {
  return (
    <View
      style={{
        minHeight: IOS_HEADER_CONTROL_SIZE,
        justifyContent: "center",
      }}
    >
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          justifyContent: "center",
        }}
      >
        {left}
      </View>

      {showApply ? (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            justifyContent: "center",
          }}
        >
          <HeaderCapsuleActionButton disabled={applyDisabled} label={applyLabel} onPress={onApply} />
        </View>
      ) : null}

      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: showApply ? IOS_HEADER_TITLE_SIDE_PADDING : 72,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.title.fontFamily,
            fontSize: theme.typography.title.fontSize,
            lineHeight: theme.typography.title.lineHeight,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
      </View>
    </View>
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
        lineHeight: 19,
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
          gap: SETTINGS_SURFACE_GAP,
          paddingHorizontal: SETTINGS_SURFACE_PADDING_HORIZONTAL,
          paddingVertical: SETTINGS_SURFACE_PADDING_VERTICAL,
        },
        style,
      ]}
    >
      {children}
    </GlassCard>
  );
}

export function SettingsListSurface({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <SettingsSurface
      style={[
        {
          gap: SETTINGS_LIST_GAP,
          paddingVertical: SETTINGS_LIST_PADDING_VERTICAL,
        },
        style,
      ]}
    >
      {children}
    </SettingsSurface>
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
        minHeight: SETTINGS_ROW_MIN_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
      }}
    >
      <View style={{ flex: 1, gap: SETTINGS_ROW_TEXT_GAP }}>
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
  showHeaderApply = true,
  subtitle,
  title,
}: {
  children: (settings: ReturnType<typeof useDeviceSettingsDraft>) => ReactNode;
  device: AddOneDevice;
  headerLeft?: () => ReactNode;
  largeTitle?: boolean;
  showHeaderApply?: boolean;
  subtitle?: string;
  title: string;
}) {
  const router = useRouter();
  const settings = useDeviceSettingsDraft(device);
  const applyLabel = settings.isSavingSettings ? "Applying…" : "Apply";
  const resolvedHeaderLeft =
    headerLeft ??
    (isIOS
      ? () => (
          <HeaderBackButton
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
                return;
              }

              router.replace(deviceSettingsPath(device.id));
            }}
          />
        )
      : undefined);
  const content = (
    <View style={{ gap: SETTINGS_PAGE_GAP }}>
      {subtitle || settings.statusError ? (
        <View style={{ gap: SETTINGS_FIELD_GAP }}>
          {subtitle ? <SettingsNote>{subtitle}</SettingsNote> : null}
          {settings.statusError ? <SettingsNote tone="error">{settings.statusError}</SettingsNote> : null}
        </View>
      ) : null}
      <View style={{ gap: SETTINGS_PAGE_GAP }}>{children(settings)}</View>
    </View>
  );

  if (isIOS) {
    return (
      <>
        <ScreenScrollView
          contentContainerStyle={{ paddingTop: 0 }}
          contentMaxWidth={theme.layout.narrowContentWidth}
          header={
            <DeviceSettingsPageHeader
              applyDisabled={!settings.canApply}
              applyLabel={applyLabel}
              left={resolvedHeaderLeft ? resolvedHeaderLeft() : null}
              onApply={() => {
                void settings.apply();
              }}
              showApply={showHeaderApply}
              title={title}
            />
          }
          safeAreaEdges={["top", "left", "right", "bottom"]}
        >
          {content}
        </ScreenScrollView>

        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
      </>
    );
  }

  return (
    <>
      <ScreenScrollView
        contentContainerStyle={{ paddingTop: 0 }}
        contentMaxWidth={theme.layout.narrowContentWidth}
        safeAreaEdges={["left", "right", "bottom"]}
      >
        {content}
      </ScreenScrollView>

      <Stack.Screen
        options={{
          headerBackVisible: headerLeft ? undefined : !isIOS,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.bgBase },
          headerTintColor: theme.colors.textPrimary,
          headerLeft: resolvedHeaderLeft,
          headerRight: !isIOS && showHeaderApply
            ? () => (
                <HeaderActionButton
                  disabled={!settings.canApply}
                  label={applyLabel}
                  onPress={() => {
                    void settings.apply();
                  }}
                />
              )
            : undefined,
        }}
      />

      <Stack.Screen.Title
        large={largeTitle}
        largeStyle={
          largeTitle
            ? {
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.display.fontFamily,
                fontSize: theme.typography.display.fontSize,
              }
            : undefined
        }
        style={{
          color: theme.colors.textPrimary,
          fontFamily: theme.typography.title.fontFamily,
          fontSize: theme.typography.title.fontSize,
          textAlign: "left",
        }}
      >
        {title}
      </Stack.Screen.Title>
    </>
  );
}
