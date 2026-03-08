import { Pressable, Text } from "react-native";

import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";

interface ChoicePillProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function ChoicePill({ label, selected, onPress }: ChoicePillProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: selected ? withAlpha(theme.colors.textPrimary, 0.18) : withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: selected ? withAlpha(theme.colors.textPrimary, 0.1) : withAlpha(theme.colors.bgElevated, 0.86),
        paddingHorizontal: 12,
        paddingVertical: 9,
      }}
    >
      <Text
        style={{
          color: selected ? theme.colors.textPrimary : theme.colors.textSecondary,
          fontFamily: selected ? theme.typography.label.fontFamily : theme.typography.body.fontFamily,
          fontSize: theme.typography.label.fontSize,
          lineHeight: theme.typography.label.lineHeight,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
