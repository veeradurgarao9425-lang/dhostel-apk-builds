import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Safe check for expo-secure-store if present, otherwise fallback to AsyncStorage
let SecureStoreModule: any = null;
try {
  SecureStoreModule = require('expo-secure-store');
} catch {
  SecureStoreModule = null;
}

const isNativeSecureAvailable =
  (Platform.OS === 'ios' || Platform.OS === 'android') &&
  SecureStoreModule !== null &&
  typeof SecureStoreModule.setItemAsync === 'function';

export const setSecureItem = async (key: string, value: string): Promise<void> => {
  try {
    if (isNativeSecureAvailable) {
      await SecureStoreModule.setItemAsync(key, value);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  } catch (error) {
    console.error(`Error setting secure item ${key}:`, error);
  }
};

export const getSecureItem = async (key: string): Promise<string | null> => {
  try {
    if (isNativeSecureAvailable) {
      return await SecureStoreModule.getItemAsync(key);
    } else {
      return await AsyncStorage.getItem(key);
    }
  } catch (error) {
    console.error(`Error getting secure item ${key}:`, error);
    return null;
  }
};

export const removeSecureItem = async (key: string): Promise<void> => {
  try {
    if (isNativeSecureAvailable) {
      await SecureStoreModule.deleteItemAsync(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  } catch (error) {
    console.error(`Error removing secure item ${key}:`, error);
  }
};

export const multiRemoveSecureItems = async (keys: string[]): Promise<void> => {
  try {
    for (const key of keys) {
      await removeSecureItem(key);
    }
  } catch (error) {
    console.error(`Error removing multiple secure items:`, error);
  }
};
