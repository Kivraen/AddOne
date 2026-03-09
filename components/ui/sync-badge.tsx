import { Pressable, Text, View } from "react-native";

import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";
import { SyncState } from "@/types/addone";

const syncConfig: Record<SyncState, { label: string; dot: string; background: string }> = {
  online: {
    label: "Online",
    dot: "#8FD36A",
    background: withAlpha("#8FD36A", 0.12),
  },
  syncing: {
    label: "Applying",
    dot: "#C7904A",
    background: withAlpha("#C7904A", 0.12),
  },
  offline: {
    label: "Offline",
    dot: "#8F4E46",
    background: withAlpha("#8F4E46", 0.12),
  },
};

interface SyncBadgeProps {
  state: SyncState;
  onPress?: () => void;
}

export function SyncBadge({ state, onPress }: SyncBadgeProps) {
  const config = syncConfig[state];

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      style={{
        alignSelf: "flex-start",
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: config.background,
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      <View style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
        <View
          style={{
            height: 7,
            width: 7,
            borderRadius: 7,
            backgroundColor: config.dot,
          }}
        />
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.label.fontFamily,
            fontSize: theme.typography.label.fontSize,
            lineHeight: theme.typography.label.lineHeight,
          }}
        >
          {config.label}
        </Text>
      </View>
    </Pressable>
  );
}
