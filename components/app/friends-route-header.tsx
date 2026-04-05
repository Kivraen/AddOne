import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { theme } from "@/constants/theme";

interface FriendsRouteHeaderProps {
  onBack: () => void;
  title: string;
}

export function FriendsRouteHeader({ onBack, title }: FriendsRouteHeaderProps) {
  return (
    <View
      style={{
        minHeight: 44,
        justifyContent: "center",
        marginBottom: 12,
        position: "relative",
      }}
    >
      <View
        pointerEvents="box-none"
        style={{
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          minHeight: 44,
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.title.fontFamily,
            fontSize: theme.typography.title.fontSize,
            lineHeight: theme.typography.title.lineHeight,
            maxWidth: "72%",
            textAlign: "center",
          }}
        >
          {title}
        </Text>
      </View>

      <Pressable
        hitSlop={10}
        onPress={onBack}
        style={{
          alignItems: "center",
          justifyContent: "center",
          minHeight: 32,
          minWidth: 28,
          alignSelf: "flex-start",
          marginLeft: -4,
          paddingRight: 2,
        }}
      >
        <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={28} />
      </Pressable>
    </View>
  );
}
