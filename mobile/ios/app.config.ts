import type { ExpoConfig } from "expo/config";

type AppEnv = "development" | "test" | "production";

const appEnv = (process.env.EXPO_PUBLIC_APP_ENV ?? "development") as AppEnv;
const isProduction = appEnv === "production";
const isTest = appEnv === "test";

const config: ExpoConfig = {
  name: isProduction ? "Between" : isTest ? "Between Test" : "Between Dev",
  slug: "between-mobile-ios",
  version: "0.1.0",
  orientation: "portrait",
  scheme: isProduction ? "between" : isTest ? "between-test" : "between-dev",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: false,
    bundleIdentifier: isProduction
      ? "com.between.relationship"
      : isTest
        ? "com.between.relationship.test"
        : "com.between.relationship.dev",
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        "Between lets you select chat screenshots to analyze only when you choose to import them."
    }
  },
  experiments: {
    typedRoutes: true
  },
  plugins: ["expo-router", "expo-secure-store", "expo-sqlite"],
  extra: {
    appEnv,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8765",
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ""
  }
};

export default config;
