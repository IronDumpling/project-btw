import * as SecureStore from "expo-secure-store";

const IMPORT_CONSENT_KEY = "between.mobile.importConsent.v1";

export async function hasImportConsent() {
  return (await SecureStore.getItemAsync(IMPORT_CONSENT_KEY)) === "accepted";
}

export async function saveImportConsent() {
  await SecureStore.setItemAsync(IMPORT_CONSENT_KEY, "accepted");
}

export async function clearImportConsent() {
  await SecureStore.deleteItemAsync(IMPORT_CONSENT_KEY);
}
