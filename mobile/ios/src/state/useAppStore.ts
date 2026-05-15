import { create } from "zustand";
import type {
  AnalysisResult,
  AuthUser,
  Contact,
  ImportedConversation,
  MemoryPatch,
  OnboardingForm,
  ReplyDraft,
  UserPersona
} from "@/api/types";
import type { Locale } from "@/i18n/i18n";
import type { ThemeId } from "@/theme/theme";

type AppState = {
  authReady: boolean;
  authToken: string | null;
  currentUser: AuthUser | null;
  locale: Locale;
  themeId: ThemeId;
  onboardingDraft: OnboardingForm;
  userPersona: UserPersona | null;
  contacts: Contact[];
  currentConversation: ImportedConversation | null;
  currentAnalysis: AnalysisResult | null;
  pendingMemoryPatch: MemoryPatch | null;
  replyDrafts: ReplyDraft[];
  setAuthToken: (token: string | null) => void;
  markAuthReady: () => void;
  setAuthSession: (token: string, user: AuthUser) => Promise<void>;
  setCurrentUser: (user: AuthUser | null) => void;
  clearSession: () => Promise<void>;
  setLocale: (locale: Locale) => void;
  setThemeId: (themeId: ThemeId) => void;
  setOnboardingDraft: (draft: OnboardingForm) => void;
  setUserPersona: (persona: UserPersona | null) => void;
  addContact: (contact: Contact) => void;
  setAnalysisFlow: (payload: {
    conversation: ImportedConversation;
    analysis: AnalysisResult;
    memoryPatch?: MemoryPatch | null;
  }) => void;
  setReplyDrafts: (drafts: ReplyDraft[]) => void;
  clearPendingMemoryPatch: () => void;
};

const emptyOnboarding: OnboardingForm = {
  identity: { nicknames: [], age_range: "", occupation: "", mbti: "", zodiac: "" },
  communication: {
    mode: "simple",
    materials: "",
    message_format: "",
    emoji_usage: "",
    punctuation_habits: [],
    reply_speed: "",
    catchphrases: []
  },
  emotional: { attachment_style: "", love_languages: [], conflict_response: "", when_interested: "" },
  relationship: { role: "", valued_traits: [], dealbreakers: "" }
};

export const useAppStore = create<AppState>((set) => ({
  authReady: false,
  authToken: null,
  currentUser: null,
  locale: "en",
  themeId: "default",
  onboardingDraft: emptyOnboarding,
  userPersona: null,
  contacts: [],
  currentConversation: null,
  currentAnalysis: null,
  pendingMemoryPatch: null,
  replyDrafts: [],
  setAuthToken: (token) => set({ authReady: true, authToken: token }),
  markAuthReady: () => set({ authReady: true }),
  setAuthSession: async (token, user) => {
    set({ authReady: true, authToken: token, currentUser: user });
  },
  setCurrentUser: (user) => set({ currentUser: user }),
  clearSession: async () => {
    set({
      authReady: true,
      authToken: null,
      currentUser: null,
      userPersona: null,
      currentConversation: null,
      currentAnalysis: null,
      pendingMemoryPatch: null,
      replyDrafts: []
    });
  },
  setLocale: (locale) => set({ locale }),
  setThemeId: (themeId) => set({ themeId }),
  setOnboardingDraft: (draft) => set({ onboardingDraft: draft }),
  setUserPersona: (persona) => set({ userPersona: persona }),
  addContact: (contact) => set((state) => ({ contacts: [contact, ...state.contacts] })),
  setAnalysisFlow: ({ conversation, analysis, memoryPatch }) =>
    set({
      currentConversation: conversation,
      currentAnalysis: analysis,
      pendingMemoryPatch: memoryPatch ?? null,
      replyDrafts: []
    }),
  setReplyDrafts: (drafts) => set({ replyDrafts: drafts }),
  clearPendingMemoryPatch: () => set({ pendingMemoryPatch: null })
}));
