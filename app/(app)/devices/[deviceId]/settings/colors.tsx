import { useState } from "react";

import { useRoutedDevice } from "@/components/devices/device-route-context";
import { PaletteColorEditor } from "@/components/settings/palette-color-editor";
import { DeviceSettingsScaffold } from "@/components/settings/device-settings-scaffold";
import { EditablePaletteRole } from "@/lib/device-settings";

export default function DeviceSettingsColorsRoute() {
  const device = useRoutedDevice();
  const [activeRole, setActiveRole] = useState<EditablePaletteRole>("on");

  return (
    <DeviceSettingsScaffold device={device} title="Edit palette">
      {(settings) => (
        <PaletteColorEditor
          activeRole={activeRole}
          appliedDraft={settings.baseDraft}
          draft={settings.draft}
          device={settings.device}
          onChangeRoleColor={settings.setColorRole}
          onResetPalette={settings.resetPalette}
          onSelectRole={setActiveRole}
          paletteLabel={settings.summary.appearance.paletteLabel}
        />
      )}
    </DeviceSettingsScaffold>
  );
}
