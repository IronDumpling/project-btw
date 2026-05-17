import { appConfig } from "@/config/env";
import { localizeOnboardingForm } from "@/i18n/i18n";
import { useAppStore } from "@/state/useAppStore";
import type {
  AnalysisResult,
  AuthResponse,
  AuthUser,
  Contact,
  ContactInput,
  ImportAnalysisResponse,
  ImportedConversation,
  MemoryPatch,
  OnboardingForm,
  OnboardingGenerationResponse,
  PrivacyExport,
  ReplyGenerationResponse,
  ReplyStyle,
} from "./types";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = useAppStore.getState().authToken;
  if (options.auth !== false && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  if (!response.ok) {
    const text = await response.text();
    let localizedMessage = "";
    try {
      const parsed = JSON.parse(text) as { detail?: { message?: string; error?: string } | string };
      if (typeof parsed.detail === "object" && parsed.detail?.message) {
        localizedMessage = parsed.detail.message;
      }
    } catch {
      // Fall through to the raw response below when the body is not JSON.
    }
    if (localizedMessage) {
      throw new Error(localizedMessage);
    }
    throw new Error(`Mobile API ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

export const mobileApi = {
  health: () => request<{ status: string }>("/health"),

  register: (email: string, password: string, displayName: string) =>
    request<AuthResponse>("/v1/mobile/auth/register", {
      method: "POST",
      auth: false,
      body: { email, password, display_name: displayName }
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/v1/mobile/auth/login", {
      method: "POST",
      auth: false,
      body: { email, password }
    }),

  me: () => request<AuthUser>("/v1/mobile/auth/me"),

  updateProfile: (displayName: string) =>
    request<AuthUser>("/v1/mobile/auth/me", {
      method: "PATCH",
      body: { display_name: displayName }
    }),

  logout: () => request<{ status: string }>("/v1/mobile/auth/logout", { method: "POST" }),

  deletePersona: () => request<{ status: string; user: AuthUser }>("/v1/mobile/persona", { method: "DELETE" }),

  exportPrivacyData: () => request<PrivacyExport>("/v1/mobile/privacy/export"),

  deleteAccount: () => request<{ status: string }>("/v1/mobile/account", { method: "DELETE" }),

  generateOnboarding: (form: OnboardingForm, locale = useAppStore.getState().locale) =>
    request<OnboardingGenerationResponse>("/v1/mobile/onboarding/generate", {
      method: "POST",
      body: { form, locale, display_labels: localizeOnboardingForm(form, locale) }
    }),

  analyzeImport: (conversation: Pick<ImportedConversation, "sourceType" | "rawText" | "localScreenshotUri" | "screenshotDataUri" | "contactId"> & { contactName?: string }) =>
    request<ImportAnalysisResponse>("/v1/mobile/import/analyze", {
      method: "POST",
      body: { ...conversation, locale: useAppStore.getState().locale }
    }),

  generateReplies: (style: ReplyStyle) => {
    const state = useAppStore.getState();
    return request<ReplyGenerationResponse>("/v1/mobile/reply/generate", {
      method: "POST",
      body: {
        style,
        locale: state.locale,
        conversation: state.currentConversation,
        analysis: state.currentAnalysis,
        userPersona: state.currentUser?.persona_summary ?? ""
      }
    });
  },

  commitMemoryPatch: (patch: MemoryPatch) =>
    request<{ memorySummary: string; user: AuthUser }>("/v1/mobile/memory/commit", {
      method: "POST",
      body: { patch, confirm: true, locale: useAppStore.getState().locale }
    }),

  listMemoryPatches: (status?: MemoryPatch["status"]) =>
    request<{ patches: MemoryPatch[] }>(`/v1/mobile/memory/patches${status ? `?status=${encodeURIComponent(status)}` : ""}`),

  updateMemoryPatch: (patchId: string, status: MemoryPatch["status"], proposedAdditions?: string[]) =>
    request<{ patch: MemoryPatch }>(`/v1/mobile/memory/patches/${patchId}`, {
      method: "PATCH",
      body: { status, proposedAdditions }
    }),

  listContacts: () => request<{ contacts: Contact[] }>("/v1/mobile/contacts"),

  createContact: (contact: ContactInput) =>
    request<Contact>("/v1/mobile/contacts", {
      method: "POST",
      body: contact
    }),

  updateContact: (contactId: string, contact: Partial<ContactInput>) =>
    request<Contact>(`/v1/mobile/contacts/${contactId}`, {
      method: "PATCH",
      body: contact
    }),

  deleteContact: (contactId: string) => request<{ status: string }>(`/v1/mobile/contacts/${contactId}`, { method: "DELETE" })
};
