import { Pressable, Text } from "react-native";

import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";

interface ChoicePillProps {
  disabled?: boolean;
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function ChoicePill({ disabled = false, label, selected, onPress }: ChoicePillProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: selected ? withAlpha(theme.colors.accentAmber, 0.72) : withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: selected ? withAlpha(theme.colors.accentAmber, 0.24) : withAlpha(theme.colors.bgElevated, 0.86),
        boxShadow: selected ? `0px 10px 24px ${withAlpha(theme.colors.accentAmber, 0.16)}` : undefined,
        opacity: disabled ? 0.45 : 1,
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
