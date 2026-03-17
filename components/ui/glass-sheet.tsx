import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { PropsWithChildren, useMemo, useRef } from "react";
import { Text, View } from "react-native";

import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";

type GlassSheetVariant = "peek" | "full" | "destructiveConfirm";

interface GlassSheetProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  variant?: GlassSheetVariant;
}

export function GlassSheet({ children, subtitle, title, variant = "full" }: GlassSheetProps) {
  const router = useRouter();
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => {
    switch (variant) {
      case "peek":
        return ["52%"];
      case "destructiveConfirm":
        return ["36%"];
      default:
        return ["92%"];
    }
  }, [variant]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.overlayScrim }}>
      <BottomSheet
        ref={sheetRef}
        index={0}
        enablePanDownToClose
        handleIndicatorStyle={{ backgroundColor: withAlpha(theme.colors.textPrimary, 0.32), width: 54 }}
        backgroundStyle={{
          backgroundColor: withAlpha(theme.colors.bgElevated, 0.98),
          borderColor: withAlpha(theme.colors.textPrimary, 0.1),
          borderWidth: 1,
          borderTopLeftRadius: theme.radius.sheet,
          borderTopRightRadius: theme.radius.sheet,
        }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
        )}
        onClose={() => router.back()}
        snapPoints={snapPoints}
      >
        <View style={{ gap: 8, paddingHorizontal: 20, paddingBottom: 12, paddingTop: 4 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.title.fontFamily,
              fontSize: theme.typography.title.fontSize,
              lineHeight: theme.typography.title.lineHeight,
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
        <BottomSheetScrollView contentContainerStyle={{ gap: 16, paddingBottom: 36, paddingHorizontal: 20 }}>
          {children}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}
