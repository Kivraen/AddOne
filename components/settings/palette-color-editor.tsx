import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import ColorPicker, { HueSlider, Panel1 } from "reanimated-color-picker";

import { DeviceBoardStage } from "@/components/board/device-board-stage";
import {
  SettingsDivider,
  SettingsFieldLabel,
  SETTINGS_HEADER_GAP,
  SettingsNote,
  SETTINGS_PAGE_GAP,
  SettingsSectionTitle,
  SettingsSurface,
} from "@/components/settings/device-settings-scaffold";
import { theme } from "@/constants/theme";
import { buildBoardCells, getMergedPalette } from "@/lib/board";
import {
  DeviceSettingsDraft,
  EditablePaletteRole,
  areSettingsDraftsEqual,
  getDraftPalette,
  getEditablePaletteRoleColor,
  getEditablePaletteRoleLabel,
  normalizeHexColor,
  resetPaletteToPreset,
  setEditablePaletteRoleColor,
} from "@/lib/device-settings";
import { withAlpha } from "@/lib/color";
import { usePaletteHistoryStore } from "@/store/palette-history-store";
import { AddOneDevice, BoardPalette } from "@/types/addone";

const COLOR_CARD_INNER_GAP = 16;
const COLOR_FIELD_LABEL_GAP = 10;
const COLOR_FIELD_TOP_SPACE = 12;
const COLOR_SUBSECTION_TOP_SPACE = 16;
const COLOR_HUE_BOTTOM_SPACE = 10;
const COLOR_ACTION_DIVIDER_TOP_SPACE = 18;
const COLOR_ACTION_DIVIDER_GAP = 16;

const PALETTE_PREVIEW_TODAY = {
  weekIndex: 0,
  dayIndex: 4,
} as const;

const PALETTE_PREVIEW_WEEKLY_TARGET = 3;

const PALETTE_PREVIEW_WEEKS: boolean[][] = [
  [true, false, true, true, false, false, false],
  [true, true, false, true, false, false, true],
  [false, true, true, false, true, false, true],
  [true, false, true, false, true, true, false],
  [true, true, false, false, true, false, true],
  [false, true, true, true, false, true, false],
  [true, false, false, true, true, false, true],
  [true, true, true, false, true, false, true],
  [false, true, false, true, true, true, false],
  [true, false, true, true, false, false, false],
  [false, true, true, false, true, false, false],
  [true, false, false, true, false, true, true],
  [false, true, false, true, true, true, true],
  [true, true, false, false, true, true, false],
  [false, false, true, true, false, true, false],
  [true, false, false, false, true, false, false],
  [false, true, true, false, false, true, false],
  [true, false, true, false, false, false, true],
  [false, true, false, false, false, false, false],
  [true, false, false, true, false, true, false],
  [false, false, true, false, true, false, true],
];

function buildPalettePreviewDevice(device: AddOneDevice): AddOneDevice {
  const recordedDaysTotal = PALETTE_PREVIEW_WEEKS.reduce(
    (total, week) => total + week.filter(Boolean).length,
    0,
  );
  const successfulWeeksTotal = PALETTE_PREVIEW_WEEKS.slice(1).filter(
    (week) => week.filter(Boolean).length >= PALETTE_PREVIEW_WEEKLY_TARGET,
  ).length;

  return {
    ...device,
    dateGrid: undefined,
    days: PALETTE_PREVIEW_WEEKS.map((week) => [...week]),
    habitStartedOnLocal: null,
    historyEraStartedAt: null,
    isProjectedBeyondSnapshot: false,
    logicalToday: "2026-03-13",
    needsSnapshotRefresh: false,
    recordedDaysTotal,
    successfulWeeksTotal,
    today: { ...PALETTE_PREVIEW_TODAY },
    weeklyTarget: PALETTE_PREVIEW_WEEKLY_TARGET,
    weekTargets: Array.from({ length: 21 }, () => PALETTE_PREVIEW_WEEKLY_TARGET),
  };
}

export function PalettePreviewBoard({
  device,
  palette,
  title = "Live preview",
}: {
  device: AddOneDevice;
  palette: BoardPalette;
  title?: string;
}) {
  const previewDevice = useMemo(() => buildPalettePreviewDevice(device), [device]);
  const cells = useMemo(() => buildBoardCells(previewDevice), [previewDevice]);
  const accentColor = useMemo(() => getMergedPalette(previewDevice.paletteId, previewDevice.customPalette).dayOn, [previewDevice]);

  return (
    <View style={{ gap: title ? SETTINGS_HEADER_GAP : 0 }}>
      {title ? (
        <View style={{ gap: SETTINGS_HEADER_GAP }}>
          <SettingsSectionTitle>{title}</SettingsSectionTitle>
        </View>
      ) : null}
      <DeviceBoardStage accentColor={accentColor} cells={cells} palette={palette} />
    </View>
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
    <View style={{ gap: COLOR_FIELD_LABEL_GAP, paddingTop: COLOR_SUBSECTION_TOP_SPACE }}>
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
  onResetPalette,
  onSelectRole,
  paletteLabel,
}: {
  activeRole: EditablePaletteRole;
  appliedDraft: DeviceSettingsDraft;
  draft: DeviceSettingsDraft;
  device: AddOneDevice;
  onChangeRoleColor: (role: EditablePaletteRole, color: string) => void;
  onResetPalette: () => void;
  onSelectRole: (role: EditablePaletteRole) => void;
  paletteLabel: string;
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

  function resetPaletteLocally() {
    setLiveDraft((current) => resetPaletteToPreset(current ?? draft));
  }

  return (
    <View style={{ gap: SETTINGS_PAGE_GAP }}>
      <PalettePreviewBoard
        device={{
          ...device,
          customPalette: deferredEditorDraft.customPalette,
          paletteId: deferredEditorDraft.paletteId,
        }}
        palette={draftPalette}
      />

      <SettingsSurface>
        <View style={{ gap: SETTINGS_HEADER_GAP }}>
          <SettingsFieldLabel>Board colors</SettingsFieldLabel>
          <SettingsNote>Pick a color to edit.</SettingsNote>
        </View>

        <View style={{ gap: 12 }}>
          {(["on", "weekSuccess", "weekFail"] as EditablePaletteRole[]).map((role) => {
            const color = getEditablePaletteRoleColor(editorDraft, role);
            const selected = role === activeRole;

            return (
              <Pressable
                key={role}
                onPress={() => onSelectRole(role)}
                style={{
                  minHeight: 56,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  borderRadius: theme.radius.card,
                  borderWidth: 1,
                  borderColor: selected ? withAlpha(theme.colors.textPrimary, 0.12) : withAlpha(theme.colors.textPrimary, 0.06),
                  backgroundColor: selected ? withAlpha(theme.colors.textPrimary, 0.06) : withAlpha(theme.colors.bgBase, 0.34),
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                }}
              >
                <View style={{ gap: 3 }}>
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
            );
          })}
        </View>
      </SettingsSurface>

      <SettingsSurface style={{ paddingVertical: 20 }}>
        <View style={{ gap: SETTINGS_HEADER_GAP }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
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
            <SettingsFieldLabel>{getEditablePaletteRoleLabel(activeRole)}</SettingsFieldLabel>
          </View>

          <SettingsNote>Adjust with palette, hue, or hex.</SettingsNote>
        </View>

        <SettingsDivider />

        <View style={{ gap: COLOR_CARD_INNER_GAP, paddingTop: 16 }}>
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
            style={{ gap: COLOR_CARD_INNER_GAP }}
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
            <View style={{ gap: COLOR_FIELD_LABEL_GAP, paddingTop: COLOR_FIELD_TOP_SPACE, paddingBottom: COLOR_HUE_BOTTOM_SPACE }}>
              <SettingsFieldLabel>Hue</SettingsFieldLabel>
              <HueSlider
                style={{
                  borderRadius: theme.radius.pill,
                  width: "100%",
                }}
              />
            </View>
          </ColorPicker>
        </View>

        <View style={{ gap: COLOR_CARD_INNER_GAP }}>
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
        </View>

        <View style={{ gap: COLOR_FIELD_LABEL_GAP, paddingTop: COLOR_SUBSECTION_TOP_SPACE }}>
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

        <View style={{ gap: COLOR_ACTION_DIVIDER_GAP, paddingTop: COLOR_ACTION_DIVIDER_TOP_SPACE }}>
          <SettingsDivider />

          <Pressable
            onPress={() => {
              resetPaletteLocally();
              onResetPalette();
            }}
            style={{
              minHeight: 46,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: theme.radius.sheet,
              borderWidth: 1,
              borderColor: withAlpha(theme.colors.textPrimary, 0.08),
              backgroundColor: withAlpha(theme.colors.textPrimary, 0.04),
              paddingHorizontal: 16,
            }}
          >
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.label.fontFamily,
                fontSize: theme.typography.label.fontSize,
                lineHeight: theme.typography.label.lineHeight,
              }}
            >
              {`Reset ${paletteLabel}`}
            </Text>
          </Pressable>
        </View>
      </SettingsSurface>
    </View>
  );
}
