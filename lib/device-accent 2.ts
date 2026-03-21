import { theme } from "@/constants/theme";
import { getMergedPalette } from "@/lib/board";
import { AddOneDevice } from "@/types/addone";

export function getDeviceAccentColor(device?: AddOneDevice | null) {
  if (!device) {
    return theme.colors.accentAmber;
  }

  return getMergedPalette(device.paletteId, device.customPalette).dayOn;
}
