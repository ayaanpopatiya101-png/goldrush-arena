import * as SecureStore from "expo-secure-store";
export const readCredential = (key: string) => SecureStore.getItemAsync(key);
export const writeCredential = (key: string, value: string) => SecureStore.setItemAsync(key, value);
