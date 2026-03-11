import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";

import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";

interface IconButtonProps {
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

export function IconButton({ disabled = false, icon, onPress }: IconButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        justifyContent: "center",
        height: 42,
        width: 42,
        borderRadius: 21,
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: withAlpha(theme.colors.bgElevated, 0.9),
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Ionicons color={theme.colors.textPrimary} name={icon} size={18} />
    </Pressable>
  );
}
