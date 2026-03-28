import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";

import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";

interface IconButtonProps {
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  onPress: () => void;
  size?: number;
}

export function IconButton({
  disabled = false,
  icon,
  iconSize = 18,
  onPress,
  size = 42,
}: IconButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        justifyContent: "center",
        height: size,
        width: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: withAlpha(theme.colors.bgElevated, 0.9),
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Ionicons color={theme.colors.textPrimary} name={icon} size={iconSize} />
    </Pressable>
  );
}
