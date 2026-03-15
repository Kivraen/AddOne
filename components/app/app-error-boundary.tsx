import { Component, PropsWithChildren, ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { ScreenFrame } from "@/components/layout/screen-frame";
import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";
import { resetPersistedAppUiState } from "@/store/app-ui-store";

function BoundaryAction({
  label,
  onPress,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: 48,
        borderRadius: theme.radius.pill,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 18,
        borderWidth: 1,
        borderColor: secondary ? withAlpha(theme.colors.textPrimary, 0.12) : withAlpha(theme.colors.accentAmber, 0.22),
        backgroundColor: secondary ? withAlpha(theme.colors.textPrimary, 0.08) : withAlpha(theme.colors.accentAmber, 0.16),
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

function Fallback(props: { error: Error; resetErrorBoundary: () => void }): ReactNode {
  return (
    <ScreenFrame>
      <View style={{ flex: 1, justifyContent: "center", gap: 18 }}>
        <View style={{ gap: 6 }}>
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
            App recovery
          </Text>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.display.fontFamily,
              fontSize: theme.typography.display.fontSize,
              lineHeight: theme.typography.display.lineHeight,
            }}
          >
            AddOne hit a launch problem
          </Text>
        </View>

        <Text
          style={{
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.body.fontFamily,
            fontSize: theme.typography.body.fontSize,
            lineHeight: theme.typography.body.lineHeight,
          }}
        >
          We can retry immediately or clear the app&apos;s local UI state if a stale saved screen caused this.
        </Text>

        <View
          style={{
            gap: 10,
            borderRadius: theme.radius.card,
            borderWidth: 1,
            borderColor: withAlpha(theme.colors.textPrimary, 0.08),
            backgroundColor: withAlpha(theme.colors.bgElevated, 0.92),
            paddingHorizontal: 16,
            paddingVertical: 16,
          }}
        >
          <Text
            numberOfLines={4}
            style={{
              color: theme.colors.statusErrorMuted,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: 13,
              lineHeight: 18,
            }}
          >
            {props.error.message || "Unknown launch error."}
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          <BoundaryAction label="Try again" onPress={props.resetErrorBoundary} />
          <BoundaryAction
            label="Reset local UI state"
            onPress={() => {
              void resetPersistedAppUiState().finally(() => {
                props.resetErrorBoundary();
              });
            }}
            secondary
          />
        </View>
      </View>
    </ScreenFrame>
  );
}

interface InternalBoundaryProps extends PropsWithChildren {
  children: ReactNode;
}

interface InternalBoundaryState {
  error: Error | null;
}

class InternalErrorBoundary extends Component<InternalBoundaryProps, InternalBoundaryState> {
  state: InternalBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): InternalBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("AppErrorBoundary", error);
  }

  resetErrorBoundary = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return <Fallback error={this.state.error} resetErrorBoundary={this.resetErrorBoundary} />;
    }

    return this.props.children;
  }
}

export function AppErrorBoundary({ children }: PropsWithChildren) {
  return <InternalErrorBoundary>{children}</InternalErrorBoundary>;
}
