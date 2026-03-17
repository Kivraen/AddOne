import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, Pressable, Text, TextInput, View, useWindowDimensions } from "react-native";
import ColorPicker, { HueSlider, Panel1 } from "reanimated-color-picker";

import { PixelGrid } from "@/components/board/pixel-grid";
import {
  SettingsDivider,
  SettingsFieldLabel,
  SettingsNote,
  SettingsSectionTitle,
  SettingsSurface,
} from "@/components/settings/device-settings-scaffold";
import { theme } from "@/constants/theme";
import { buildBoardCells } from "@/lib/board";
import {
  DeviceSettingsDraft,
  EditablePaletteRole,
  areSettingsDraftsEqual,
  getDraftPalette,
  getEditablePaletteRoleColor,
  getEditablePaletteRoleLabel,
  normalizeHexColor,
  resetEditablePaletteRoleToPreset,
  setEditablePaletteRoleColor,
} from "@/lib/device-settings";
import { withAlpha } from "@/lib/color";
import { usePaletteHistoryStore } from "@/store/palette-history-store";
import { AddOneDevice, BoardPalette } from "@/types/addone";

function PreviewBoard({ device, palette }: { device: AddOneDevice; palette: BoardPalette }) {
  const { width } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = useState(0);
  const cells = useMemo(() => buildBoardCells(device), [device]);

  function handleLayout(event: LayoutChangeEvent) {
    const next = event.nativeEvent.layout.width - 32;
    if (Math.abs(next - availableWidth) > 1) {
      setAvailableWidth(next);
    }
  }

  return (
    <SettingsSurface style={{ gap: 24, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}>
      <View style={{ paddingBottom: 2 }}>
        <SettingsSectionTitle>Live preview</SettingsSectionTitle>
      </View>
      <View
        onLayout={handleLayout}
        style={{
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          borderRadius: theme.radius.card,
          borderWidth: 1,
          borderColor: withAlpha(theme.colors.textPrimary, 0.06),
          backgroundColor: palette.socket,
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 12,
        }}
      >
        <PixelGrid
          availableWidth={Math.max(0, Math.min(availableWidth || width - 96, width - 96))}
          cells={cells}
          mode="preview"
          palette={palette}
          readOnly
          showFooterHint={false}
        />
      </View>
    </SettingsSurface>
  );
}

function QuickSwatches({
  activeColor,
  appliedColor,
  activeRole,
  onChange,
}: {
  activeColor: string;
  appliedColor: string;
  activeRole: EditablePaletteRole;
  onChange: (value: string) => void;
}) {
  const history = usePaletteHistoryStore((state) => state.appliedColorsByRole[activeRole] ?? []);
  const [availableWidth, setAvailableWidth] = useState(0);
  const swatchSize = 34;
  const swatchGap = 10;
  const visibleCount = availableWidth > 0 ? Math.max(1, Math.floor((availableWidth + swatchGap) / (swatchSize + swatchGap))) : 6;
  const swatches = useMemo(
    () => Array.from(new Set([appliedColor.toUpperCase(), ...history.map((color) => color.toUpperCase())])).slice(0, visibleCount),
    [appliedColor, history, visibleCount],
  );

  return (
    <View style={{ gap: 8 }}>
      <SettingsFieldLabel>Quick colors</SettingsFieldLabel>

      <View
        onLayout={(event) => {
          const nextWidth = event.nativeEvent.layout.width;
          if (Math.abs(nextWidth - availableWidth) > 1) {
            setAvailableWidth(nextWidth);
          }
        }}
        style={{ flexDirection: "row", gap: swatchGap }}
      >
        {swatches.map((swatch) => {
          const selected = swatch.toUpperCase() === activeColor.toUpperCase();
          return (
            <Pressable
              key={swatch}
              onPress={() => onChange(swatch)}
              style={{
                width: swatchSize,
                height: swatchSize,
                borderRadius: 17,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? theme.colors.textPrimary : withAlpha(theme.colors.textPrimary, 0.08),
                backgroundColor: swatch,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

export function PaletteColorEditor({
  activeRole,
  appliedDraft,
  draft,
  device,
  onChangeRoleColor,
  onResetRole,
  onSelectRole,
}: {
  activeRole: EditablePaletteRole;
  appliedDraft: DeviceSettingsDraft;
  draft: DeviceSettingsDraft;
  device: AddOneDevice;
  onChangeRoleColor: (role: EditablePaletteRole, color: string) => void;
  onResetRole: (role: EditablePaletteRole) => void;
  onSelectRole: (role: EditablePaletteRole) => void;
}) {
  const [liveDraft, setLiveDraft] = useState<DeviceSettingsDraft | null>(null);
  const editorDraft = liveDraft ?? draft;
  const deferredEditorDraft = useDeferredValue(editorDraft);
  const draftPalette = useMemo(() => getDraftPalette(deferredEditorDraft), [deferredEditorDraft]);
  const activeColor = getEditablePaletteRoleColor(editorDraft, activeRole);
  const appliedColor = getEditablePaletteRoleColor(appliedDraft, activeRole);
  const [hexInput, setHexInput] = useState(activeColor);
  const [pickerValue, setPickerValue] = useState(activeColor);
  const isPickerInteractingRef = useRef(false);

  useEffect(() => {
    setHexInput(activeColor);
    if (!isPickerInteractingRef.current) {
      setPickerValue(activeColor);
    }
  }, [activeColor, activeRole]);

  useEffect(() => {
    if (!liveDraft || isPickerInteractingRef.current) {
      return;
    }

    if (areSettingsDraftsEqual(liveDraft, draft)) {
      setLiveDraft(null);
    }
  }, [draft, liveDraft]);

  function applyRoleColorLocally(role: EditablePaletteRole, color: string) {
    const normalized = normalizeHexColor(color);
    if (!normalized) {
      return null;
    }

    setLiveDraft((current) => setEditablePaletteRoleColor(current ?? draft, role, normalized));
    return normalized;
  }

  function resetRoleLocally(role: EditablePaletteRole) {
    setLiveDraft((current) => resetEditablePaletteRoleToPreset(current ?? draft, role));
  }

  return (
    <View style={{ gap: 12 }}>
      <PreviewBoard
        device={{
          ...device,
          customPalette: deferredEditorDraft.customPalette,
          paletteId: deferredEditorDraft.paletteId,
        }}
        palette={draftPalette}
      />

      <SettingsSurface style={{ gap: 10, paddingVertical: 8 }}>
        <View style={{ gap: 4 }}>
          <SettingsFieldLabel>Board colors</SettingsFieldLabel>
          <SettingsNote>Pick the part of the board you want to edit, then fine-tune it below.</SettingsNote>
        </View>
        <SettingsDivider />

        {(["off", "on", "weekSuccess", "weekFail"] as EditablePaletteRole[]).map((role, index, list) => {
          const color = getEditablePaletteRoleColor(editorDraft, role);
          const selected = role === activeRole;

          return (
            <View key={role}>
              <Pressable
                onPress={() => onSelectRole(role)}
                style={{
                  minHeight: 52,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  borderRadius: theme.radius.card,
                  borderWidth: 1,
                  borderColor: selected ? withAlpha(theme.colors.textPrimary, 0.12) : "transparent",
                  backgroundColor: selected ? withAlpha(theme.colors.textPrimary, 0.06) : "transparent",
                  paddingHorizontal: 10,
                }}
              >
                <View style={{ gap: 2 }}>
                  <SettingsFieldLabel>{getEditablePaletteRoleLabel(role)}</SettingsFieldLabel>
                  <SettingsNote>{color}</SettingsNote>
                </View>

                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: withAlpha(theme.colors.textPrimary, 0.08),
                    backgroundColor: color,
                  }}
                />
              </Pressable>
              {index < list.length - 1 ? (
                <View style={{ marginVertical: 4, height: 1, backgroundColor: withAlpha(theme.colors.textPrimary, 0.06) }} />
              ) : null}
            </View>
          );
        })}
      </SettingsSurface>

      <SettingsSurface>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: withAlpha(theme.colors.textPrimary, 0.08),
                backgroundColor: activeColor,
              }}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <SettingsFieldLabel>{getEditablePaletteRoleLabel(activeRole)}</SettingsFieldLabel>
              <SettingsNote>Drag across the palette, then use hue and hex to dial the color in.</SettingsNote>
            </View>
          </View>

          <Pressable
            onPress={() => {
              resetRoleLocally(activeRole);
              onResetRole(activeRole);
            }}
            style={{
              minHeight: 36,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: theme.radius.pill,
              borderWidth: 1,
              borderColor: withAlpha(theme.colors.textPrimary, 0.08),
              backgroundColor: withAlpha(theme.colors.textPrimary, 0.04),
              paddingHorizontal: 12,
            }}
          >
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.label.fontFamily,
                fontSize: 12,
                lineHeight: 16,
              }}
            >
              Reset
            </Text>
          </Pressable>
        </View>

        <ColorPicker
          adaptSpectrum
          boundedThumb
          onChangeJS={(colors) => {
            isPickerInteractingRef.current = true;
            applyRoleColorLocally(activeRole, colors.hex.toUpperCase());
          }}
          onCompleteJS={(colors) => {
            isPickerInteractingRef.current = false;
            const normalized = applyRoleColorLocally(activeRole, colors.hex.toUpperCase());
            if (!normalized) {
              return;
            }

            setPickerValue(normalized);
            onChangeRoleColor(activeRole, normalized);
          }}
          style={{ gap: 14 }}
          thumbAnimationDuration={0}
          thumbScaleAnimationDuration={120}
          thumbSize={26}
          value={pickerValue}
        >
          <Panel1
            style={{
              width: "100%",
              height: 220,
              borderRadius: theme.radius.sheet,
            }}
          />
          <View style={{ gap: 6 }}>
            <SettingsFieldLabel>Hue</SettingsFieldLabel>
            <HueSlider
              style={{
                borderRadius: theme.radius.pill,
                width: "100%",
              }}
            />
          </View>
        </ColorPicker>

        <QuickSwatches
          activeColor={activeColor}
          appliedColor={appliedColor}
          activeRole={activeRole}
          onChange={(next) => {
            const normalized = applyRoleColorLocally(activeRole, next);
            if (!normalized) {
              return;
            }

            setPickerValue(normalized);
            onChangeRoleColor(activeRole, normalized);
          }}
        />

        <View style={{ gap: 6 }}>
          <SettingsFieldLabel>Hex</SettingsFieldLabel>
          <TextInput
            autoCapitalize="characters"
            autoCorrect={false}
            onChangeText={(value) => {
              setHexInput(value.toUpperCase());
              const normalized = normalizeHexColor(value);
              if (normalized) {
                applyRoleColorLocally(activeRole, normalized);
                setPickerValue(normalized);
                onChangeRoleColor(activeRole, normalized);
              }
            }}
            placeholder="#FFFFFF"
            placeholderTextColor={theme.colors.textTertiary}
            style={{
              borderRadius: theme.radius.sheet,
              borderWidth: 1,
              borderColor: withAlpha(theme.colors.textPrimary, 0.08),
              backgroundColor: withAlpha(theme.colors.bgBase, 0.84),
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
              paddingHorizontal: 14,
              paddingVertical: 14,
            }}
            value={hexInput}
          />
        </View>
      </SettingsSurface>
    </View>
  );
}
