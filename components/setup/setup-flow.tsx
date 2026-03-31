import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { ReactNode, useEffect } from "react";
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from "react-native";
import LottieView from "lottie-react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
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
        backgroundColor: secondary
          ? withAlpha(theme.colors.bgElevated, pressed ? 0.98 : 0.9)
          : pressed
            ? withAlpha(theme.colors.textPrimary, 0.92)
            : theme.colors.textPrimary,
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
  stepLabel,
  title,
}: {
  label?: string;
  onClose: () => void;
  stepLabel?: string;
  title?: string;
}) {
  const hasBrandContent = Boolean(stepLabel || label || title);
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
          {stepLabel ? (
            <SetupStageChip align="start" label={stepLabel} />
          ) : (
            <>
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
            </>
          )}
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
        <View
          style={{
            paddingBottom: 8,
          }}
        >
          <View
            style={{
              gap: 12,
            }}
          >
            {children}
          </View>
        </View>
      </View>
    </View>
  );
}

export function SetupWifiScanState({
  subtitle,
}: {
  subtitle?: string;
}) {
  return (
    <View
      style={{
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
        paddingBottom: 4,
        paddingTop: 52,
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
            height: 220,
            justifyContent: "center",
            width: 220,
          }}
        >
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              height: 220,
              width: 220,
              marginTop: 14,
            }}
            pointerEvents="none"
          >
            <LottieView
              autoPlay
              loop
              source={require("../../assets/animations/wifi-connection.json")}
              style={{
                height: 220,
                width: 220,
              }}
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
        textAlign: "center",
      }}
    >
      {children}
    </Text>
  );
}

function SetupStageChip({
  align = "center",
  label,
}: {
  align?: "center" | "start";
  label: string;
}) {
  return (
    <View
      style={{
        alignSelf: align === "start" ? "flex-start" : "center",
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
  trailingAccessory,
  title,
  tone = "neutral",
}: {
  body: string;
  icon?: ReactNode;
  trailingAccessory?: ReactNode;
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
            fill: withAlpha(theme.colors.bgElevated, 0.92),
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
          <View style={{ alignItems: "center", flex: 1, flexDirection: "row", gap: 10 }}>
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
          {trailingAccessory}
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
          justifyContent: "flex-start",
          paddingHorizontal: 22,
          paddingTop: 176,
          paddingBottom: 22,
        }}
      >
        <Pressable
          disabled={!dismissible}
          onPress={() => onClose?.()}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
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
        </Pressable>
        <View style={{ width: "100%", maxWidth: theme.layout.narrowContentWidth }}>
          <SetupStatusCard
            body={body}
            title={title}
            tone={tone}
            trailingAccessory={
              dismissible ? <IconButton icon="close-outline" onPress={() => onClose?.()} size={32} /> : undefined
            }
          />
        </View>
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
  const contextualLabel = step ? `Step ${step} of ${totalSteps}` : eyebrow;
  const titleSpacing = hideTitle || contextualLabel
    ? {
        paddingTop: 18,
        paddingBottom: subtitle ? 8 : 0,
      }
    : undefined;

  return (
    <View style={{ gap: subtitle ? 12 : 0 }}>
      <View style={titleSpacing}>
        {contextualLabel && !step ? (
          <Text
            style={{
              color: theme.colors.textTertiary,
              fontFamily: theme.typography.micro.fontFamily,
              fontSize: theme.typography.micro.fontSize,
              lineHeight: theme.typography.micro.lineHeight,
              letterSpacing: theme.typography.micro.letterSpacing,
              textAlign: "center",
              textTransform: "uppercase",
            }}
          >
            {contextualLabel}
          </Text>
        ) : null}
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.display.fontFamily,
            fontSize: 32,
            lineHeight: 36,
            letterSpacing: -0.9,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
      </View>
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
  invalid = false,
  maxLength,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  trailingAccessory,
  value,
}: {
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  disabled?: boolean;
  invalid?: boolean;
  maxLength?: number;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  trailingAccessory?: ReactNode;
  value: string;
}) {
  const borderColor = invalid ? withAlpha(theme.colors.statusErrorMuted, 0.76) : withAlpha(theme.colors.textPrimary, 0.14);
  const backgroundColor = invalid ? withAlpha(theme.colors.statusErrorMuted, 0.08) : withAlpha(theme.colors.bgBase, 0.78);

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
          borderColor,
          backgroundColor,
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
        borderColor,
        backgroundColor,
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
