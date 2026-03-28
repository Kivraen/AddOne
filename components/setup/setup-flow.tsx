import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { ReactNode, useEffect } from "react";
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { GlassCard } from "@/components/ui/glass-card";
import { IconButton } from "@/components/ui/icon-button";
import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";

type SetupBodyTone = "muted" | "secondary";
type SetupProgressState = "active" | "complete" | "pending";
type SetupStatusTone = "error" | "neutral" | "success";

export const SETUP_STAGE_CARD_MIN_HEIGHT = 468;
export const SETUP_STAGE_FRAME_HEIGHT = 548;
const SETUP_STAGE_CARD_STATUS_MIN_HEIGHT = 88;
const SETUP_SCENE_ENTER_MS = 260;
const SETUP_SCENE_EXIT_MS = 180;
const SETUP_SCENE_LAYOUT_MS = 240;
const SETUP_SWAP_ENTER_MS = 180;
const SETUP_SWAP_EXIT_MS = 120;
const SETUP_SWAP_LAYOUT_MS = 180;
const SETUP_WIFI_SCAN_LOOP_MS = 1800;
const SETUP_WIFI_SCAN_RING_SIZE = 152;
const SETUP_WIFI_SCAN_ORBIT_RADIUS = 54;

export function SetupActionButton({
  disabled = false,
  label,
  onPress,
  secondary = false,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  secondary?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        justifyContent: "center",
        minHeight: 56,
        borderRadius: theme.radius.card,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: secondary
          ? withAlpha(theme.colors.textPrimary, pressed ? 0.14 : 0.1)
          : withAlpha(theme.colors.textPrimary, pressed ? 0.16 : 0.12),
        backgroundColor: secondary
          ? withAlpha(theme.colors.bgElevated, pressed ? 0.98 : 0.9)
          : pressed
            ? withAlpha(theme.colors.textPrimary, 0.92)
            : theme.colors.textPrimary,
        boxShadow: secondary
          ? `0px 14px 30px ${withAlpha(theme.colors.bgBase, 0.18)}`
          : `0px 18px 34px ${withAlpha(theme.colors.bgBase, 0.22)}`,
        opacity: disabled ? 0.45 : 1,
        paddingHorizontal: 18,
        transform: [{ scale: pressed ? 0.988 : 1 }],
      })}
    >
      <Text
        style={{
          color: secondary ? theme.colors.textPrimary : theme.colors.bgBase,
          fontFamily: theme.typography.label.fontFamily,
          fontSize: 18,
          lineHeight: 22,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function SetupInlineButton({
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
      style={({ pressed }) => ({
        alignItems: "center",
        justifyContent: "center",
        minHeight: 36,
        borderRadius: theme.radius.full,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, pressed ? 0.14 : 0.08),
        backgroundColor: withAlpha(theme.colors.bgBase, pressed ? 0.82 : 0.66),
        opacity: disabled ? 0.46 : 1,
        paddingHorizontal: 14,
      })}
    >
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontFamily: theme.typography.label.fontFamily,
          fontSize: 13,
          lineHeight: 16,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function SetupRouteHeader({
  label,
  onClose,
  title,
}: {
  label?: string;
  onClose: () => void;
  title?: string;
}) {
  const hasBrandContent = Boolean(label || title);
  const isTitleOnly = Boolean(title && !label);

  return (
    <View
      style={{
        alignItems: isTitleOnly ? "flex-start" : "center",
        flexDirection: "row",
        justifyContent: hasBrandContent ? "space-between" : "flex-end",
        paddingBottom: hasBrandContent ? 8 : 0,
      }}
    >
      {hasBrandContent ? (
        <View style={{ flex: 1, gap: label ? 6 : 0, paddingRight: 16 }}>
          {label ? (
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
              {label}
            </Text>
          ) : null}
          {title ? (
            <Text
              style={{
                color: isTitleOnly ? theme.colors.textPrimary : withAlpha(theme.colors.textPrimary, 0.82),
                fontFamily: isTitleOnly ? theme.typography.display.fontFamily : theme.typography.title.fontFamily,
                fontSize: isTitleOnly ? 26 : 22,
                lineHeight: isTitleOnly ? 30 : 24,
                letterSpacing: isTitleOnly ? -0.5 : -0.25,
              }}
            >
              {title}
            </Text>
          ) : null}
        </View>
      ) : null}
      <IconButton icon="close-outline" iconSize={16} onPress={onClose} size={36} />
    </View>
  );
}

export function SetupStageLayout({
  children,
  footer,
  minHeight = SETUP_STAGE_FRAME_HEIGHT,
}: {
  children: ReactNode;
  footer?: ReactNode;
  minHeight?: number;
}) {
  return (
    <View style={{ minHeight, justifyContent: "space-between" }}>
      <View style={{ flex: 1, gap: 28 }}>{children}</View>
      {footer ? <View style={{ paddingTop: 28 }}>{footer}</View> : null}
    </View>
  );
}

export function SetupStageScene({
  children,
  disableEnter = false,
  sceneKey,
}: {
  children: ReactNode;
  disableEnter?: boolean;
  sceneKey: string;
}) {
  return (
    <Animated.View
      entering={
        disableEnter
          ? undefined
          : FadeIn.duration(SETUP_SCENE_ENTER_MS).withInitialValues({
              opacity: 0,
              transform: [{ translateY: 18 }, { scale: 0.985 }],
            })
      }
      exiting={FadeOut.duration(SETUP_SCENE_EXIT_MS)}
      key={sceneKey}
      layout={LinearTransition.duration(SETUP_SCENE_LAYOUT_MS)}
      style={{ gap: 6 }}
    >
      {children}
    </Animated.View>
  );
}

export function SetupStageSwap({
  children,
  gap = 0,
  swapKey,
}: {
  children: ReactNode;
  gap?: number;
  swapKey: string;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(SETUP_SWAP_ENTER_MS).withInitialValues({
        opacity: 0,
        transform: [{ translateY: 12 }],
      })}
      exiting={FadeOut.duration(SETUP_SWAP_EXIT_MS)}
      key={swapKey}
      layout={LinearTransition.duration(SETUP_SWAP_LAYOUT_MS)}
      style={gap > 0 ? { gap } : undefined}
    >
      {children}
    </Animated.View>
  );
}

export function SetupBottomActionBar({
  children,
  maxWidth = theme.layout.narrowContentWidth,
}: {
  children: ReactNode;
  maxWidth?: number;
}) {
  return (
    <View
      pointerEvents="box-none"
      style={{
        paddingHorizontal: theme.layout.pagePadding,
        paddingBottom: theme.spacing[16],
      }}
    >
      <View style={{ alignSelf: "center", maxWidth, width: "100%" }}>
        <BlurView
          intensity={24}
          tint="dark"
          style={{
            overflow: "hidden",
            borderRadius: theme.radius.hero,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: withAlpha(theme.colors.textPrimary, 0.08),
            backgroundColor: withAlpha(theme.colors.bgBase, 0.42),
          }}
        >
          <View
            style={{
              gap: 12,
              paddingHorizontal: 14,
              paddingTop: 14,
              paddingBottom: 8,
            }}
          >
            {children}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

export function SetupWifiScanState({
  subtitle,
}: {
  subtitle?: string;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: SETUP_WIFI_SCAN_LOOP_MS,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [progress]);

  const outerRingStyle = useAnimatedStyle(() => {
    const scale = interpolate(progress.value, [0, 1], [0.78, 1.08]);
    const opacity = interpolate(progress.value, [0, 0.7, 1], [0.24, 0.08, 0]);

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const innerRingStyle = useAnimatedStyle(() => {
    const shifted = (progress.value + 0.35) % 1;
    const scale = interpolate(shifted, [0, 1], [0.68, 0.98]);
    const opacity = interpolate(shifted, [0, 0.7, 1], [0.18, 0.06, 0]);

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const centerPulseStyle = useAnimatedStyle(() => {
    const scale = interpolate(progress.value, [0, 0.5, 1], [0.96, 1.04, 0.96]);
    const opacity = interpolate(progress.value, [0, 0.5, 1], [0.82, 1, 0.82]);

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const orbitDotStyle = useAnimatedStyle(() => {
    const angle = progress.value * Math.PI * 2 - Math.PI / 2;
    const translateX = Math.cos(angle) * SETUP_WIFI_SCAN_ORBIT_RADIUS;
    const translateY = Math.sin(angle) * SETUP_WIFI_SCAN_ORBIT_RADIUS;

    return {
      transform: [{ translateX }, { translateY }],
    };
  });

  return (
    <View
      style={{
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
        paddingBottom: 4,
        paddingTop: 28,
      }}
    >
      <View
        style={{
          alignItems: "center",
          gap: subtitle ? 18 : 0,
          maxWidth: 260,
          width: "100%",
        }}
      >
        <View
          style={{
            alignItems: "center",
            height: 176,
            justifyContent: "center",
            width: 176,
          }}
        >
          <Animated.View
            style={[
              {
                position: "absolute",
                height: SETUP_WIFI_SCAN_RING_SIZE,
                width: SETUP_WIFI_SCAN_RING_SIZE,
                borderRadius: SETUP_WIFI_SCAN_RING_SIZE / 2,
                borderWidth: 1,
                borderColor: withAlpha(theme.colors.accentAmber, 0.22),
                backgroundColor: withAlpha(theme.colors.accentAmber, 0.03),
              },
              outerRingStyle,
            ]}
          />
          <Animated.View
            style={[
              {
                position: "absolute",
                height: SETUP_WIFI_SCAN_RING_SIZE - 28,
                width: SETUP_WIFI_SCAN_RING_SIZE - 28,
                borderRadius: (SETUP_WIFI_SCAN_RING_SIZE - 28) / 2,
                borderWidth: 1,
                borderColor: withAlpha(theme.colors.textPrimary, 0.12),
              },
              innerRingStyle,
            ]}
          />

          <Animated.View
            style={{
              alignItems: "center",
              justifyContent: "center",
              height: 96,
              width: 96,
              borderRadius: 48,
              backgroundColor: withAlpha(theme.colors.bgElevated, 0.72),
              borderWidth: 1,
              borderColor: withAlpha(theme.colors.textPrimary, 0.08),
              boxShadow: `0px 16px 36px ${withAlpha(theme.colors.bgBase, 0.24)}`,
            }}
            pointerEvents="none"
          >
            <Animated.View style={centerPulseStyle}>
              <Ionicons color={theme.colors.accentAmber} name="wifi" size={42} />
            </Animated.View>
          </Animated.View>

          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              alignItems: "center",
              justifyContent: "center",
              height: 176,
              width: 176,
            }}
          >
            <Animated.View
              style={[
                {
                  height: 12,
                  width: 12,
                  borderRadius: 6,
                  backgroundColor: theme.colors.accentAmber,
                  boxShadow: `0px 0px 18px ${withAlpha(theme.colors.accentAmber, 0.45)}`,
                },
                orbitDotStyle,
              ]}
            />
          </View>
        </View>

        {subtitle ? (
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
              textAlign: "center",
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function SetupFieldLabel({ children }: { children: string }) {
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

export function SetupFieldNote({ children }: { children: string }) {
  return (
    <Text
      style={{
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.body.fontFamily,
        fontSize: 13,
        lineHeight: 18,
      }}
    >
      {children}
    </Text>
  );
}

export function SetupMetaText({ children }: { children: string }) {
  return (
    <Text
      style={{
        color: theme.colors.textTertiary,
        fontFamily: theme.typography.label.fontFamily,
        fontSize: theme.typography.label.fontSize,
        lineHeight: theme.typography.label.lineHeight,
        textAlign: "center",
      }}
    >
      {children}
    </Text>
  );
}

export function SetupBodyText({
  children,
  tone = "secondary",
}: {
  children: string;
  tone?: SetupBodyTone;
}) {
  return (
    <Text
      style={{
        color: tone === "muted" ? theme.colors.textTertiary : theme.colors.textSecondary,
        fontFamily: theme.typography.body.fontFamily,
        fontSize: theme.typography.body.fontSize,
        lineHeight: theme.typography.body.lineHeight,
      }}
    >
      {children}
    </Text>
  );
}

function SetupStageChip({ label }: { label: string }) {
  return (
    <View
      style={{
        alignSelf: "center",
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: withAlpha(theme.colors.textPrimary, 0.05),
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
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
        {label}
      </Text>
    </View>
  );
}

export function SetupStatusCard({
  body,
  icon,
  title,
  tone = "neutral",
}: {
  body: string;
  icon?: ReactNode;
  title?: string;
  tone?: SetupStatusTone;
}) {
  const toneColors =
    tone === "success"
      ? {
          border: withAlpha(theme.colors.accentSuccess, 0.28),
          fill: withAlpha(theme.colors.accentSuccess, 0.12),
          icon: theme.colors.accentSuccess,
          title: theme.colors.textPrimary,
          body: withAlpha(theme.colors.textPrimary, 0.78),
        }
      : tone === "error"
        ? {
            border: withAlpha(theme.colors.statusErrorMuted, 0.28),
            fill: withAlpha(theme.colors.statusErrorMuted, 0.1),
            icon: theme.colors.statusErrorMuted,
            title: theme.colors.textPrimary,
            body: withAlpha(theme.colors.textPrimary, 0.75),
          }
        : {
            border: withAlpha(theme.colors.textPrimary, 0.08),
            fill: withAlpha(theme.colors.textPrimary, 0.04),
            icon: theme.colors.textSecondary,
            title: theme.colors.textPrimary,
            body: theme.colors.textSecondary,
          };

  return (
    <View
      style={{
        gap: 10,
        borderRadius: theme.radius.card,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: toneColors.border,
        backgroundColor: toneColors.fill,
        paddingHorizontal: 14,
        paddingVertical: 14,
      }}
    >
      {(icon || title) ? (
        <View style={{ alignItems: "center", flexDirection: "row", gap: 10 }}>
          {icon ? <View style={{ alignItems: "center", justifyContent: "center" }}>{icon}</View> : null}
          {title ? (
            <Text
              style={{
                color: toneColors.title,
                flex: 1,
                fontFamily: theme.typography.label.fontFamily,
                fontSize: theme.typography.label.fontSize,
                lineHeight: theme.typography.label.lineHeight,
              }}
            >
              {title}
            </Text>
          ) : null}
        </View>
      ) : null}
      <Text
        style={{
          color: toneColors.body,
          fontFamily: theme.typography.body.fontFamily,
          fontSize: theme.typography.body.fontSize,
          lineHeight: theme.typography.body.lineHeight,
        }}
      >
        {body}
      </Text>
    </View>
  );
}

export function SetupMessageSlot({
  body,
  icon,
  reserveSpace = true,
  title,
  tone = "neutral",
}: {
  body?: string | null;
  icon?: ReactNode;
  reserveSpace?: boolean;
  title?: string;
  tone?: SetupStatusTone;
}) {
  return (
    <View style={{ justifyContent: "flex-end", minHeight: reserveSpace ? SETUP_STAGE_CARD_STATUS_MIN_HEIGHT : undefined }}>
      {body ? (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} layout={LinearTransition.duration(180)}>
          <SetupStatusCard body={body} icon={icon} title={title} tone={tone} />
        </Animated.View>
      ) : reserveSpace ? (
        <View style={{ minHeight: SETUP_STAGE_CARD_STATUS_MIN_HEIGHT - 4 }} />
      ) : null}
    </View>
  );
}

export function SetupFeedbackOverlay({
  body,
  dismissible = false,
  onClose,
  title,
  tone = "error",
  visible,
}: {
  body?: string | null;
  dismissible?: boolean;
  onClose?: () => void;
  title: string;
  tone?: SetupStatusTone;
  visible: boolean;
}) {
  if (!visible || !body) {
    return null;
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View
        style={{
          alignItems: "center",
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 22,
          paddingVertical: 22,
        }}
      >
        <BlurView
          intensity={28}
          tint="dark"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: withAlpha(theme.colors.bgBase, 0.38),
          }}
        />
        <GlassCard
          style={{
            width: "100%",
            gap: 14,
            paddingHorizontal: 18,
            paddingVertical: 18,
            backgroundColor: withAlpha(theme.colors.bgElevated, 0.78),
            borderColor: withAlpha(theme.colors.textPrimary, 0.12),
            boxShadow: `0px 22px 64px ${withAlpha(theme.colors.bgBase, 0.34)}`,
          }}
        >
          {dismissible ? (
            <View style={{ alignItems: "flex-end" }}>
              <IconButton icon="close-outline" onPress={() => onClose?.()} />
            </View>
          ) : null}
          <SetupStatusCard body={body} title={title} tone={tone} />
        </GlassCard>
      </View>
    </Modal>
  );
}

export function SetupStageCard({
  children,
  footer,
  gap = 28,
  height,
  minHeight = SETUP_STAGE_CARD_MIN_HEIGHT,
}: {
  children: ReactNode;
  footer?: ReactNode;
  gap?: number;
  height?: number;
  minHeight?: number;
}) {
  return (
    <GlassCard
      style={{
        gap,
        height,
        minHeight: height ? undefined : minHeight,
        paddingHorizontal: 22,
        paddingVertical: 24,
      }}
    >
      <View style={{ flex: 1, gap }}>{children}</View>
      {footer}
    </GlassCard>
  );
}

function SetupProgressGlyph({ state }: { state: SetupProgressState }) {
  if (state === "active") {
    return <ActivityIndicator color={theme.colors.textPrimary} size="small" />;
  }

  if (state === "complete") {
    return <Ionicons color={theme.colors.accentSuccess} name="checkmark" size={16} />;
  }

  return (
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: withAlpha(theme.colors.textPrimary, 0.24),
      }}
    />
  );
}

export function SetupProgressList({
  steps,
}: {
  steps: Array<{ label: string; state: SetupProgressState }>;
}) {
  return (
    <View style={{ gap: 12 }}>
      {steps.map((step) => {
        const isActive = step.state === "active";
        const isComplete = step.state === "complete";

        return (
          <View
            key={step.label}
            style={{
              alignItems: "center",
              flexDirection: "row",
              gap: 12,
              minHeight: 52,
              borderRadius: theme.radius.card,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: withAlpha(
                isActive ? theme.colors.textPrimary : isComplete ? theme.colors.accentSuccess : theme.colors.textPrimary,
                isActive ? 0.12 : isComplete ? 0.18 : 0.06,
              ),
              backgroundColor: withAlpha(
                isActive ? theme.colors.textPrimary : isComplete ? theme.colors.accentSuccess : theme.colors.bgBase,
                isActive ? 0.05 : isComplete ? 0.1 : 0.42,
              ),
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                width: 18,
                height: 18,
              }}
            >
              <SetupProgressGlyph state={step.state} />
            </View>
            <Text
              style={{
                color: isActive || isComplete ? theme.colors.textPrimary : theme.colors.textSecondary,
                flex: 1,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function SetupSelectionCard({
  detail,
  label,
  value,
}: {
  detail?: string;
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        gap: 4,
        borderRadius: theme.radius.card,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: withAlpha(theme.colors.bgBase, 0.62),
        paddingHorizontal: 14,
        paddingVertical: 14,
      }}
    >
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
        {label}
      </Text>
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontFamily: theme.typography.title.fontFamily,
          fontSize: 18,
          lineHeight: 22,
          letterSpacing: -0.2,
        }}
      >
        {value}
      </Text>
      {detail ? <SetupFieldNote>{detail}</SetupFieldNote> : null}
    </View>
  );
}

export function SetupStepHeader({
  eyebrow,
  hideTitle = false,
  step,
  subtitle,
  title,
  totalSteps = 3,
}: {
  eyebrow?: string;
  hideTitle?: boolean;
  step?: number;
  subtitle?: string;
  title: string;
  totalSteps?: number;
}) {
  const headerLabel = step ? `Step ${step} of ${totalSteps}` : eyebrow;
  const headerGap = hideTitle ? 22 : 16;
  const chipSpacing = hideTitle
    ? {
        paddingTop: 18,
        paddingBottom: 26,
      }
    : {
        paddingBottom: 28,
      };

  return (
    <View style={{ gap: headerGap }}>
      {headerLabel ? (
        <View style={chipSpacing}>
          <SetupStageChip label={headerLabel} />
        </View>
      ) : null}
      {!hideTitle ? (
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.display.fontFamily,
            fontSize: 32,
            lineHeight: 36,
            letterSpacing: -0.9,
          }}
        >
          {title}
        </Text>
      ) : null}
      {subtitle ? <SetupBodyText>{subtitle}</SetupBodyText> : null}
    </View>
  );
}

export function SetupNumberedSteps({ steps }: { steps: string[] }) {
  return (
    <View style={{ gap: 18 }}>
      {steps.map((step, index) => (
        <View key={`${index + 1}-${step}`} style={{ alignItems: "flex-start", flexDirection: "row", gap: 14 }}>
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              borderRadius: theme.radius.full,
              backgroundColor: withAlpha(theme.colors.textPrimary, 0.08),
              borderWidth: 1,
              borderColor: withAlpha(theme.colors.textPrimary, 0.08),
              marginTop: 1,
            }}
          >
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.label.fontFamily,
                fontSize: 12,
                lineHeight: 14,
              }}
            >
              {index + 1}
            </Text>
          </View>
          <Text
            style={{
              color: theme.colors.textPrimary,
              flex: 1,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: 16,
              lineHeight: 24,
            }}
          >
            {step}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function SetupSelectionField({
  disabled = false,
  label,
  onPress,
  placeholder,
  value,
}: {
  disabled?: boolean;
  label?: string;
  onPress: () => void;
  placeholder: string;
  value: string;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        gap: label ? 6 : 0,
        borderRadius: theme.radius.card,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, pressed ? 0.18 : 0.14),
        backgroundColor: withAlpha(theme.colors.bgBase, pressed ? 0.84 : 0.78),
        opacity: disabled ? 0.6 : 1,
        paddingHorizontal: 16,
        paddingVertical: 16,
      })}
    >
      {label ? (
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
          {label}
        </Text>
      ) : null}
      <View style={{ alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" }}>
        <Text
          numberOfLines={1}
          style={{
            color: value ? theme.colors.textPrimary : theme.colors.textSecondary,
            flex: 1,
            fontFamily: theme.typography.body.fontFamily,
            fontSize: theme.typography.body.fontSize,
            lineHeight: theme.typography.body.lineHeight,
          }}
        >
          {value || placeholder}
        </Text>
        <Ionicons color={theme.colors.textSecondary} name="chevron-down-outline" size={18} />
      </View>
    </Pressable>
  );
}

export function SetupPasswordField({
  disabled = false,
  onChangeText,
  onToggleReveal,
  placeholder = "Enter the Wi‑Fi password",
  revealed,
  value,
}: {
  disabled?: boolean;
  onChangeText: (value: string) => void;
  onToggleReveal: () => void;
  placeholder?: string;
  revealed: boolean;
  value: string;
}) {
  return (
    <View
      style={{
        alignItems: "center",
        flexDirection: "row",
        gap: 12,
        minHeight: 58,
        borderRadius: theme.radius.card,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, 0.14),
        backgroundColor: withAlpha(theme.colors.bgBase, 0.78),
        boxShadow: `0px 12px 28px ${withAlpha(theme.colors.bgBase, 0.18)}`,
        opacity: disabled ? 0.6 : 1,
        paddingLeft: 16,
        paddingRight: 10,
      }}
    >
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textTertiary}
        secureTextEntry={!revealed}
        style={{
          color: theme.colors.textPrimary,
          flex: 1,
          fontFamily: theme.typography.body.fontFamily,
          fontSize: theme.typography.body.fontSize,
          lineHeight: theme.typography.body.lineHeight,
          paddingVertical: 17,
        }}
        value={value}
      />
      <Pressable
        disabled={disabled}
        onPress={onToggleReveal}
        style={({ pressed }) => ({
          alignItems: "center",
          justifyContent: "center",
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: withAlpha(theme.colors.textPrimary, pressed ? 0.12 : 0.06),
        })}
      >
        <Ionicons color={theme.colors.textPrimary} name={revealed ? "eye-off-outline" : "eye-outline"} size={18} />
      </Pressable>
    </View>
  );
}

export function SetupTextField({
  autoCapitalize = "none",
  disabled = false,
  maxLength,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  trailingAccessory,
  value,
}: {
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  disabled?: boolean;
  maxLength?: number;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  trailingAccessory?: ReactNode;
  value: string;
}) {
  if (trailingAccessory) {
    return (
      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          gap: 12,
          minHeight: 58,
          borderRadius: theme.radius.card,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: withAlpha(theme.colors.textPrimary, 0.14),
          backgroundColor: withAlpha(theme.colors.bgBase, 0.78),
          boxShadow: `0px 12px 28px ${withAlpha(theme.colors.bgBase, 0.18)}`,
          opacity: disabled ? 0.6 : 1,
          paddingLeft: 16,
          paddingRight: 10,
        }}
      >
        <TextInput
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          editable={!disabled}
          maxLength={maxLength}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textTertiary}
          secureTextEntry={secureTextEntry}
          style={{
            color: theme.colors.textPrimary,
            flex: 1,
            fontFamily: theme.typography.body.fontFamily,
            fontSize: theme.typography.body.fontSize,
            lineHeight: theme.typography.body.lineHeight,
            paddingVertical: 17,
          }}
          value={value}
        />
        {trailingAccessory}
      </View>
    );
  }

  return (
    <TextInput
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      editable={!disabled}
      maxLength={maxLength}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.textTertiary}
      secureTextEntry={secureTextEntry}
      style={{
        minHeight: 58,
        borderRadius: theme.radius.card,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, 0.14),
        backgroundColor: withAlpha(theme.colors.bgBase, 0.78),
        boxShadow: `0px 12px 28px ${withAlpha(theme.colors.bgBase, 0.18)}`,
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.body.fontFamily,
        fontSize: theme.typography.body.fontSize,
        lineHeight: theme.typography.body.lineHeight,
        opacity: disabled ? 0.6 : 1,
        paddingHorizontal: 16,
        paddingVertical: 17,
      }}
      value={value}
    />
  );
}
