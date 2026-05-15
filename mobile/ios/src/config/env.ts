import Constants from "expo-constants";

export type AppEnv = "development" | "test" | "production";

type ExtraConfig = {
  appEnv?: AppEnv;
  apiBaseUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

export const appConfig = {
  appEnv: extra.appEnv ?? (process.env.EXPO_PUBLIC_APP_ENV as AppEnv | undefined) ?? "development",
  apiBaseUrl:
    extra.apiBaseUrl ??
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    "http://127.0.0.1:8765",
  supabaseUrl: extra.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: extra.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ""
};

export const isProduction = appConfig.appEnv === "production";
