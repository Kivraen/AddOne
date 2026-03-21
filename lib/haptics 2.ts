import * as Haptics from "expo-haptics";

export function triggerPrimaryActionSuccessHaptic() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

export function triggerPrimaryActionFailureHaptic() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
}

export function triggerNavigationHaptic() {
  Haptics.selectionAsync().catch(() => undefined);
}
