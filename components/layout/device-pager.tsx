import { ReactNode } from "react";
import { NativeSyntheticEvent, ScrollView, Text, View, type NativeScrollEvent, useWindowDimensions } from "react-native";

import { theme } from "@/constants/theme";

interface DevicePagerProps {
  children: ReactNode[];
  initialPage: number;
  onPageChange: (index: number) => void;
}

export function DevicePager({ children, initialPage, onPageChange }: DevicePagerProps) {
  const { width } = useWindowDimensions();

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const pageWidth = event.nativeEvent.layoutMeasurement.width;
    const pageIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    onPageChange(pageIndex);
  };

  return (
    <View style={{ flex: 1, gap: 12 }}>
      <Text
        style={{
          color: theme.colors.textTertiary,
          fontFamily: theme.typography.micro.fontFamily,
          fontSize: theme.typography.micro.fontSize,
          lineHeight: theme.typography.micro.lineHeight,
          letterSpacing: theme.typography.micro.letterSpacing,
          textTransform: "uppercase",
        }}
      >
        Web preview uses a horizontal scroll fallback.
      </Text>
      <ScrollView
        contentOffset={{ x: initialPage * width, y: 0 }}
        horizontal
        onMomentumScrollEnd={handleMomentumEnd}
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {children.map((child, index) => (
          <View key={`page-${index}`} style={{ width, paddingRight: 16 }}>
            {child}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
