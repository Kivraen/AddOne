import { ActivityIndicator, FlatList, Modal, Pressable, Text, View } from "react-native";

import { theme } from "@/constants/theme";
import { withAlpha } from "@/lib/color";
import { DeviceApScannedNetwork } from "@/types/addone";

import { GlassCard } from "./glass-card";
import { IconButton } from "./icon-button";

function signalLabel(rssi: number | null) {
  if (rssi === null || !Number.isFinite(rssi)) {
    return "Unknown signal";
  }

  if (rssi >= -55) {
    return "Strong";
  }

  if (rssi >= -67) {
    return "Good";
  }

  if (rssi >= -75) {
    return "Fair";
  }

  return "Weak";
}

export function authModeLabel(authMode: string | null | undefined, secure: boolean) {
  if (!secure) {
    return "Open network";
  }

  switch (authMode) {
    case "wpa":
      return "WPA";
    case "wpa2":
      return "WPA2";
    case "wpa_wpa2":
      return "WPA/WPA2";
    case "wpa3":
      return "WPA3";
    case "wpa2_wpa3":
      return "WPA2/WPA3";
    case "enterprise":
      return "Enterprise";
    case "wep":
      return "WEP";
    default:
      return "Password required";
  }
}

function NetworkRow({
  disabled = false,
  network,
  onPress,
  selected,
}: {
  disabled?: boolean;
  network: DeviceApScannedNetwork;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        borderRadius: theme.radius.card,
        borderWidth: 1,
        borderColor: selected ? withAlpha(theme.colors.accentAmber, 0.5) : withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: selected ? withAlpha(theme.colors.accentAmber, 0.14) : withAlpha(theme.colors.bgBase, 0.76),
        opacity: disabled ? 0.5 : 1,
        paddingHorizontal: 14,
        paddingVertical: 14,
      }}
    >
      <View style={{ alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: theme.typography.label.fontSize,
              lineHeight: theme.typography.label.lineHeight,
            }}
          >
            {network.ssid}
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            {authModeLabel(network.authMode, network.secure)} · {signalLabel(network.rssi)}
          </Text>
        </View>
        {selected ? (
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.micro.fontFamily,
              fontSize: theme.typography.micro.fontSize,
              lineHeight: theme.typography.micro.lineHeight,
              letterSpacing: theme.typography.micro.letterSpacing,
              textTransform: "uppercase",
            }}
          >
            Selected
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function WifiNetworkList({
  isScanning = false,
  maxItems = 6,
  networks,
  onSelect,
  selectedSsid,
}: {
  isScanning?: boolean;
  maxItems?: number;
  networks: DeviceApScannedNetwork[];
  onSelect: (network: DeviceApScannedNetwork) => void;
  selectedSsid: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      {networks.slice(0, maxItems).map((network) => (
        <NetworkRow
          key={network.ssid}
          disabled={isScanning}
          network={network}
          onPress={() => onSelect(network)}
          selected={selectedSsid === network.ssid}
        />
      ))}
    </View>
  );
}

interface WifiNetworkPickerProps {
  isScanning: boolean;
  networks: DeviceApScannedNetwork[];
  onClose: () => void;
  onSelect: (network: DeviceApScannedNetwork) => void;
  selectedSsid: string;
  visible: boolean;
}

export function WifiNetworkPicker({
  isScanning,
  networks,
  onClose,
  onSelect,
  selectedSsid,
  visible,
}: WifiNetworkPickerProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
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
        <GlassCard style={{ gap: 14, height: "90%", paddingHorizontal: 16, paddingVertical: 18, width: "100%" }}>
          <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.title.fontFamily,
                fontSize: theme.typography.title.fontSize,
                lineHeight: theme.typography.title.lineHeight,
              }}
            >
              Choose Wi‑Fi
            </Text>
            <IconButton icon="close-outline" onPress={onClose} />
          </View>
          {isScanning ? <ActivityIndicator color={theme.colors.textPrimary} /> : null}
          {networks.length > 0 ? (
            <FlatList
              contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
              data={networks}
              keyExtractor={(item) => item.ssid}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <NetworkRow
                  disabled={isScanning}
                  network={item}
                  onPress={() => onSelect(item)}
                  selected={selectedSsid === item.ssid}
                />
              )}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.body.fontFamily,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
              }}
            >
              No networks showed up yet. You can type the Wi‑Fi name manually.
            </Text>
          )}
        </GlassCard>
      </View>
    </Modal>
  );
}
