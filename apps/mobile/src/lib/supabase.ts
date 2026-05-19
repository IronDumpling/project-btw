import "react-native-url-polyfill/auto";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import { appConfig } from "@/config/env";

const supabaseStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key)
};

export const authRedirectUrl = Linking.createURL("auth/callback");

export const supabase = createClient(
  appConfig.supabaseUrl || "https://example.supabase.co",
  appConfig.supabaseAnonKey || "missing-supabase-anon-key",
  {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: supabaseStorage
    }
  }
);

export function isSupabaseConfigured() {
  return Boolean(appConfig.supabaseUrl && appConfig.supabaseAnonKey);
}
