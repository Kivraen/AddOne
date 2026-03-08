import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";

import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

export function IconButton({ icon, onPress }: IconButtonProps) {
  return (
    <Pressable
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
      }}
    >
      <Ionicons color={theme.colors.textPrimary} name={icon} size={18} />
    </Pressable>
  );
}
