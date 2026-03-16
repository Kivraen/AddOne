import * as Haptics from "expo-haptics";

let primaryActionSequenceInFlight = false;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function triggerPrimaryActionHaptic() {
  if (primaryActionSequenceInFlight) {
    return;
  }

  primaryActionSequenceInFlight = true;

  void (async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await wait(120);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await wait(130);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
      await wait(150);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      // Ignore haptic failures on unsupported devices.
    } finally {
      primaryActionSequenceInFlight = false;
    }
  })();
}

export function triggerNavigationHaptic() {
  Haptics.selectionAsync().catch(() => undefined);
}
