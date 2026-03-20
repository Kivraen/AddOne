import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";

import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";
import {
  SelectableDeviceTimezoneOption,
  getDeviceTimezoneStatus,
  getSupportedFixedOffsetTimezones,
  getSupportedRegionalTimezones,
  resolvePhoneTimezoneForDevice,
} from "@/lib/device-timezone";

type TimezonePickerMode = "fixed-offset" | "regional";

function TimezonePickerModeButton({
  disabled = false,
  label,
  onPress,
  selected,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: selected ? withAlpha(theme.colors.accentAmber, 0.4) : withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: selected ? withAlpha(theme.colors.accentAmber, 0.16) : withAlpha(theme.colors.textPrimary, 0.04),
        justifyContent: "center",
        minHeight: 36,
        opacity: disabled ? 0.45 : 1,
        paddingHorizontal: 14,
      }}
    >
      <Text
        style={{
          color: selected ? theme.colors.textPrimary : theme.colors.textSecondary,
          fontFamily: theme.typography.label.fontFamily,
          fontSize: theme.typography.label.fontSize,
          lineHeight: theme.typography.label.lineHeight,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TimezoneOptionRow({
  disabled = false,
  onPress,
  option,
  selected,
}: {
  disabled?: boolean;
  onPress: () => void;
  option: SelectableDeviceTimezoneOption;
  selected: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        borderRadius: theme.radius.card,
        borderWidth: 1,
        borderColor: selected ? withAlpha(theme.colors.accentAmber, 0.45) : withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: selected ? withAlpha(theme.colors.accentAmber, 0.14) : withAlpha(theme.colors.bgBase, 0.76),
        opacity: disabled ? 0.45 : 1,
        paddingHorizontal: 14,
        paddingVertical: 14,
      }}
    >
      <View style={{ alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: theme.typography.label.fontSize,
              lineHeight: theme.typography.label.lineHeight,
            }}
          >
            {option.label}
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: 13,
              lineHeight: 18,
            }}
          >
            {option.code}
          </Text>
        </View>
        {selected ? <Ionicons color={theme.colors.textPrimary} name="checkmark-circle" size={20} /> : null}
      </View>
    </Pressable>
  );
}

function pickerModeForValue(value: string): TimezonePickerMode {
  return getDeviceTimezoneStatus(value).kind === "fixed-offset" ? "fixed-offset" : "regional";
}

interface DeviceTimezonePickerProps {
  description?: string;
  disabled?: boolean;
  errorText?: string | null;
  label?: string;
  onChange: (value: string) => void;
  phoneTimezone: string;
  value: string;
}

export function DeviceTimezonePicker({
  description = "Sets the board's local day and reset timing.",
  disabled = false,
  errorText,
  label = "Timezone",
  onChange,
  phoneTimezone,
  value,
}: DeviceTimezonePickerProps) {
  const currentStatus = useMemo(() => getDeviceTimezoneStatus(value), [value]);
  const phoneResolution = useMemo(() => resolvePhoneTimezoneForDevice(phoneTimezone), [phoneTimezone]);
  const [isVisible, setIsVisible] = useState(false);
  const [mode, setMode] = useState<TimezonePickerMode>(pickerModeForValue(value));
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMode(pickerModeForValue(value));
  }, [value]);

  const options = useMemo(() => {
    const available = mode === "regional" ? getSupportedRegionalTimezones() : getSupportedFixedOffsetTimezones();
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return available;
    }

    return available.filter((option) => option.searchLabel.includes(query) || option.label.toLowerCase().includes(query));
  }, [mode, searchQuery]);

  const phoneDefaultIsSelected = currentStatus.value === phoneResolution.resolvedValue;
  const modeIntro =
    mode === "regional"
      ? "Regional zones follow local daylight-saving rules when they apply."
      : "Fixed UTC offsets keep one offset all year.";

  return (
    <>
      <View style={{ gap: 10 }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.label.fontFamily,
            fontSize: theme.typography.label.fontSize,
            lineHeight: theme.typography.label.lineHeight,
          }}
        >
          {label}
        </Text>
        <Text
          selectable
          style={{
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.body.fontFamily,
            fontSize: 13,
            lineHeight: 18,
          }}
        >
          {description}
        </Text>

        <Pressable
          disabled={disabled}
          onPress={() => setIsVisible(true)}
          style={{
            alignItems: "center",
            backgroundColor: withAlpha(theme.colors.bgBase, 0.84),
            borderColor: withAlpha(
              errorText ? theme.colors.statusErrorMuted : currentStatus.supportedInBeta ? theme.colors.textPrimary : theme.colors.accentAmber,
              errorText ? 0.35 : currentStatus.supportedInBeta ? 0.08 : 0.24,
            ),
            borderRadius: theme.radius.sheet,
            borderWidth: 1,
            flexDirection: "row",
            justifyContent: "space-between",
            minHeight: 60,
            opacity: disabled ? 0.6 : 1,
            paddingHorizontal: 16,
          }}
        >
          <View style={{ flex: 1, gap: 4, paddingRight: 12 }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.label.fontFamily,
                fontSize: theme.typography.label.fontSize,
                lineHeight: theme.typography.label.lineHeight,
              }}
            >
              {currentStatus.label}
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: 13,
                lineHeight: 18,
              }}
            >
              {currentStatus.code || "Choose a supported timezone or UTC offset"}
            </Text>
          </View>
          <Ionicons color={theme.colors.textSecondary} name="chevron-forward-outline" size={18} />
        </Pressable>

        {currentStatus.warning ? (
          <Text
            selectable
            style={{
              color: currentStatus.supportedInBeta ? theme.colors.textSecondary : theme.colors.accentAmber,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: 13,
              lineHeight: 18,
            }}
          >
            {currentStatus.warning}
          </Text>
        ) : null}

        <View style={{ alignItems: "flex-start", gap: 8 }}>
          <Pressable
            disabled={disabled || phoneDefaultIsSelected}
            onPress={() => onChange(phoneResolution.resolvedValue)}
            style={{
              alignItems: "center",
              borderRadius: theme.radius.pill,
              borderWidth: 1,
              borderColor: withAlpha(theme.colors.textPrimary, 0.08),
              backgroundColor: withAlpha(theme.colors.textPrimary, 0.04),
              justifyContent: "center",
              minHeight: 36,
              opacity: disabled || phoneDefaultIsSelected ? 0.45 : 1,
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
              Use phone timezone
            </Text>
          </Pressable>
          <Text
            selectable
            style={{
              color: phoneResolution.usesFallback ? theme.colors.accentAmber : theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: 13,
              lineHeight: 18,
            }}
          >
            {phoneResolution.note}
          </Text>
        </View>

        {errorText ? (
          <Text
            selectable
            style={{
              color: theme.colors.statusErrorMuted,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: 13,
              lineHeight: 18,
            }}
          >
            {errorText}
          </Text>
        ) : null}
      </View>

      <Modal animationType="fade" transparent visible={isVisible} onRequestClose={() => setIsVisible(false)}>
        <View
          style={{
            alignItems: "center",
            backgroundColor: theme.colors.overlayScrim,
            flex: 1,
            justifyContent: "center",
            paddingHorizontal: 16,
            paddingVertical: 16,
          }}
        >
          <View
            style={{
              backgroundColor: withAlpha(theme.colors.bgElevated, 0.98),
              borderColor: withAlpha(theme.colors.textPrimary, 0.08),
              borderRadius: theme.radius.sheet,
              borderWidth: 1,
              gap: 14,
              height: "90%",
              paddingHorizontal: 16,
              paddingVertical: 18,
              width: "100%",
            }}
          >
            <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontFamily: theme.typography.title.fontFamily,
                    fontSize: theme.typography.title.fontSize,
                    lineHeight: theme.typography.title.lineHeight,
                  }}
                >
                  Choose timezone
                </Text>
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: 13,
                    lineHeight: 18,
                  }}
                >
                  Pick a regional timezone or fixed UTC offset.
                </Text>
              </View>
              <Pressable
                hitSlop={10}
                onPress={() => setIsVisible(false)}
                style={{ alignItems: "center", height: 36, justifyContent: "center", width: 36 }}
              >
                <Ionicons color={theme.colors.textPrimary} name="close-outline" size={24} />
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <TimezonePickerModeButton
                disabled={disabled}
                label="Regional"
                onPress={() => setMode("regional")}
                selected={mode === "regional"}
              />
              <TimezonePickerModeButton
                disabled={disabled}
                label="Fixed UTC offset"
                onPress={() => setMode("fixed-offset")}
                selected={mode === "fixed-offset"}
              />
            </View>

            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: 13,
                lineHeight: 18,
              }}
            >
              {modeIntro}
            </Text>

            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setSearchQuery}
              placeholder={mode === "regional" ? "Search supported regions" : "Search offsets"}
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
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
              value={searchQuery}
            />

            {mode === "regional" ? (
              <Text
                selectable
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: 13,
                  lineHeight: 18,
                }}
                >
                  Beta regional list: major U.S. zones, Warsaw, and Kyiv.
                </Text>
            ) : null}

            {options.length > 0 ? (
              <FlatList
                contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                data={options}
                keyExtractor={(item) => item.value}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TimezoneOptionRow
                    disabled={disabled}
                    onPress={() => {
                      onChange(item.value);
                      setIsVisible(false);
                      setSearchQuery("");
                    }}
                    option={item}
                    selected={currentStatus.value === item.value}
                  />
                )}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View
                style={{
                  alignItems: "center",
                  borderRadius: theme.radius.sheet,
                  borderWidth: 1,
                  borderColor: withAlpha(theme.colors.textPrimary, 0.08),
                  paddingHorizontal: 16,
                  paddingVertical: 20,
                }}
              >
                <Text
                  selectable
                  style={{
                    color: theme.colors.textSecondary,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: theme.typography.body.fontSize,
                    lineHeight: theme.typography.body.lineHeight,
                    textAlign: "center",
                  }}
                >
                  No beta timezone matches that search yet.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
