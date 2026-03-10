import { Text, View } from "react-native";

import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";
import { SyncState } from "@/types/addone";

const syncConfig: Record<SyncState, { label: string; dot: string; background: string }> = {
  online: {
    label: "Live",
    dot: "#8FD36A",
    background: withAlpha("#8FD36A", 0.1),
  },
  syncing: {
    label: "Applying",
    dot: "#C7904A",
    background: withAlpha("#C7904A", 0.1),
  },
  offline: {
    label: "Offline",
    dot: "#8F4E46",
    background: withAlpha("#8F4E46", 0.1),
  },
};

interface SyncBadgeProps {
  state: SyncState;
}

export function SyncBadge({ state }: SyncBadgeProps) {
  const config = syncConfig[state];

  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, 0.06),
        backgroundColor: config.background,
        paddingHorizontal: 10,
        paddingVertical: 6,
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
            fontFamily: theme.typography.micro.fontFamily,
            fontSize: theme.typography.micro.fontSize,
            lineHeight: theme.typography.micro.lineHeight,
            letterSpacing: theme.typography.micro.letterSpacing,
            textTransform: "uppercase",
          }}
        >
          {config.label}
        </Text>
      </View>
    </View>
  );
}
