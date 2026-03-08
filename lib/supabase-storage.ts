import AsyncStorage from "@react-native-async-storage/async-storage";
import { SupportedStorage } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

async function setNativeItem(key: string, value: string) {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    await AsyncStorage.setItem(key, value);
  }
}

async function getNativeItem(key: string) {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return AsyncStorage.getItem(key);
  }
}

async function removeNativeItem(key: string) {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    await AsyncStorage.removeItem(key);
  }
}

export const supabaseStorage: SupportedStorage = {
  getItem(key) {
    if (Platform.OS === "web") {
      return AsyncStorage.getItem(key);
    }

    return getNativeItem(key);
  },
  removeItem(key) {
    if (Platform.OS === "web") {
      return AsyncStorage.removeItem(key);
    }

    return removeNativeItem(key);
  },
  setItem(key, value) {
    if (Platform.OS === "web") {
      return AsyncStorage.setItem(key, value);
    }

    return setNativeItem(key, value);
  },
};
