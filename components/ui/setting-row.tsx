import { PropsWithChildren, ReactNode } from "react";
import { Text, View } from "react-native";

import { GlassCard } from "@/components/ui/glass-card";
import { theme } from "@/constants/theme";

interface SettingRowProps extends PropsWithChildren {
  label: string;
  value?: string;
  trailing?: ReactNode;
}

export function SettingRow({ children, label, trailing, value }: SettingRowProps) {
  return (
    <GlassCard style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
      <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: theme.typography.label.fontSize,
              lineHeight: theme.typography.label.lineHeight,
            }}
          >
            {label}
          </Text>
          {value ? (
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              {value}
            </Text>
          ) : null}
          {children}
        </View>
        {trailing}
      </View>
    </GlassCard>
  );
}
