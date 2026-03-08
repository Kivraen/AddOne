import PagerView from "react-native-pager-view";
import { ReactNode } from "react";

interface DevicePagerProps {
  children: ReactNode[];
  initialPage: number;
  onPageChange: (index: number) => void;
}

export function DevicePager({ children, initialPage, onPageChange }: DevicePagerProps) {
  return (
    <PagerView
      initialPage={initialPage}
      onPageSelected={(event) => onPageChange(event.nativeEvent.position)}
      style={{ flex: 1 }}
    >
      {children}
    </PagerView>
  );
}
