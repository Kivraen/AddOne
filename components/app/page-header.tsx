import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";

interface PageHeaderProps {
  actions?: ReactNode;
  title: string;
  subtitle?: string;
}

export function PageHeader({ actions, title, subtitle }: PageHeaderProps) {
  const router = useRouter();

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14, paddingBottom: 8 }}>
      <Pressable
        onPress={() => router.back()}
        style={{
          alignItems: "center",
          justifyContent: "center",
          width: 42,
          height: 42,
          borderRadius: theme.radius.pill,
          borderWidth: 1,
          borderColor: withAlpha(theme.colors.textPrimary, 0.08),
          backgroundColor: withAlpha(theme.colors.bgElevated, 0.9),
        }}
      >
        <Ionicons color={theme.colors.textPrimary} name="arrow-back" size={18} />
      </Pressable>

      <View style={{ flex: 1, gap: 4, paddingTop: 2 }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.title.fontFamily,
            fontSize: 24,
            lineHeight: 28,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {actions ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 2 }}>
          {actions}
        </View>
      ) : null}
    </View>
  );
}
