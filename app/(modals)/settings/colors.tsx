import { useState } from "react";

import { PaletteColorEditor } from "@/components/settings/palette-color-editor";
import { DeviceSettingsScaffold } from "@/components/settings/device-settings-scaffold";
import { EditablePaletteRole } from "@/lib/device-settings";

export default function DeviceSettingsColorsScreen() {
  const [activeRole, setActiveRole] = useState<EditablePaletteRole>("on");

  return (
    <DeviceSettingsScaffold subtitle="Edit the four board colors that matter most." title="Colors">
      {(settings) => (
        <PaletteColorEditor
          activeRole={activeRole}
          appliedDraft={settings.baseDraft}
          draft={settings.draft}
          device={settings.device}
          onChangeRoleColor={settings.setColorRole}
          onResetRole={settings.resetColorRole}
          onSelectRole={setActiveRole}
        />
      )}
    </DeviceSettingsScaffold>
  );
}
