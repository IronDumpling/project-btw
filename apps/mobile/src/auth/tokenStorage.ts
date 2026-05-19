import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "between.mobile.authToken";

export async function readAuthToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function writeAuthToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function deleteAuthToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
