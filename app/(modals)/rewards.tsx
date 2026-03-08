import { Switch, Text, View } from "react-native";

import { ChoicePill } from "@/components/ui/choice-pill";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassSheet } from "@/components/ui/glass-sheet";
import { theme } from "@/constants/theme";
import { useActiveDevice } from "@/hooks/use-active-device";
import { useDeviceActions } from "@/hooks/use-devices";
import { withAlpha } from "@/lib/color";

export default function RewardsModal() {
  const device = useActiveDevice();
  const { setRewardTrigger, setRewardType, toggleReward } = useDeviceActions();

  return (
    <GlassSheet
      subtitle="Rewards stay optional. By default AddOne remains only the board."
      title="Rewards"
      variant="full"
    >
      <GlassCard style={{ gap: 14, paddingHorizontal: 16, paddingVertical: 16 }}>
        <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.title.fontFamily,
                fontSize: theme.typography.title.fontSize,
                lineHeight: theme.typography.title.lineHeight,
              }}
            >
              Rewards enabled
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              Auto-show after confirmation, then return to the grid.
            </Text>
          </View>
          <Switch
            onValueChange={() => {
              void toggleReward();
            }}
            thumbColor={device.rewardEnabled ? theme.colors.textPrimary : theme.colors.textSecondary}
            trackColor={{ false: withAlpha(theme.colors.textPrimary, 0.12), true: withAlpha(theme.colors.accentAmber, 0.34) }}
            value={device.rewardEnabled}
          />
        </View>
      </GlassCard>

      <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 16 }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.label.fontFamily,
            fontSize: theme.typography.label.fontSize,
            lineHeight: theme.typography.label.lineHeight,
          }}
        >
          Trigger
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <ChoicePill label="Daily completion" onPress={() => void setRewardTrigger("daily")} selected={device.rewardTrigger === "daily"} />
          <ChoicePill label="Weekly success" onPress={() => void setRewardTrigger("weekly")} selected={device.rewardTrigger === "weekly"} />
        </View>
      </GlassCard>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <GlassCard style={{ flex: 1, gap: 12, paddingHorizontal: 16, paddingVertical: 16 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: theme.typography.label.fontSize,
              lineHeight: theme.typography.label.lineHeight,
            }}
          >
            Clock
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            Quiet ambient reward.
          </Text>
          <ChoicePill label="Select" onPress={() => void setRewardType("clock")} selected={device.rewardType === "clock"} />
        </GlassCard>

        <GlassCard style={{ flex: 1, gap: 12, paddingHorizontal: 16, paddingVertical: 16 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: theme.typography.label.fontSize,
              lineHeight: theme.typography.label.lineHeight,
            }}
          >
            Paint
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            Saved art or AI-generated static reward.
          </Text>
          <ChoicePill label="Select" onPress={() => void setRewardType("paint")} selected={device.rewardType === "paint"} />
        </GlassCard>
      </View>

      <GlassCard style={{ gap: 12, paddingHorizontal: 16, paddingVertical: 16 }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.label.fontFamily,
            fontSize: theme.typography.label.fontSize,
            lineHeight: theme.typography.label.lineHeight,
          }}
        >
          Saved art
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <ChoicePill label="Breathe" onPress={() => undefined} selected={device.rewardType === "paint"} />
          <ChoicePill label="Forward" onPress={() => undefined} selected={false} />
          <ChoicePill label="Steady" onPress={() => undefined} selected={false} />
        </View>
      </GlassCard>

      <GlassCard style={{ gap: 10, paddingHorizontal: 16, paddingVertical: 16 }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.label.fontFamily,
            fontSize: theme.typography.label.fontSize,
            lineHeight: theme.typography.label.lineHeight,
          }}
        >
          AI prompt
        </Text>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.body.fontFamily,
            fontSize: theme.typography.body.fontSize,
            lineHeight: theme.typography.body.lineHeight,
          }}
        >
          Static 8x21 art only in v1. Animation stays template-based.
        </Text>
        <View
          style={{
            borderRadius: theme.radius.card,
            borderWidth: 1,
            borderColor: withAlpha(theme.colors.textPrimary, 0.08),
            backgroundColor: withAlpha(theme.colors.bgBase, 0.84),
            paddingHorizontal: 14,
            paddingVertical: 16,
          }}
        >
          <Text
            style={{
              color: theme.colors.textTertiary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            “Create a warm abstract sunrise with a clear center line.”
          </Text>
        </View>
      </GlassCard>
    </GlassSheet>
  );
}
