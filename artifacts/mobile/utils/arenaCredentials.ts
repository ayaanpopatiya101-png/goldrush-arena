import AsyncStorage from "@react-native-async-storage/async-storage";
export const readCredential = (key: string) => AsyncStorage.getItem(key);
export const writeCredential = (key: string, value: string) => AsyncStorage.setItem(key, value);
