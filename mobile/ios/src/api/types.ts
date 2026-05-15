export type ReplyStyle =
  | "warm"
  | "direct"
  | "playful"
  | "boundary"
  | "repair"
  | "do_not_reply";

export type Locale = "en" | "zh-CN";

export type IdentityData = {
  nicknames: string[];
  age_range: string;
  occupation: string;
  mbti: string;
  zodiac: string;
};

export type CommunicationData = {
  mode: "simple" | "complex";
  materials: string;
  message_format: string;
  emoji_usage: string;
  punctuation_habits: string[];
  reply_speed: string;
  catchphrases: string[];
};

export type EmotionalData = {
  attachment_style: string;
  love_languages: string[];
  conflict_response: string;
  when_interested: string;
};

export type RelationshipData = {
  role: string;
  valued_traits: string[];
  dealbreakers: string;
};

export type OnboardingForm = {
  identity: IdentityData;
  communication: CommunicationData;
  emotional: EmotionalData;
  relationship: RelationshipData;
};

export type AuthUser = {
  id: string;
  email: string;
  email_verified: boolean;
  display_name: string;
  onboarding: Partial<OnboardingForm>;
  persona_summary: string;
  persona_markdown: string;
  memory_markdown: string;
  created_at: string;
  updated_at: string;
};

export type AuthResponse = {
  token: string;
  expires_at: string;
  user: AuthUser;
};

export type OnboardingGenerationResponse = {
  personaMarkdown: string;
  memoryMarkdown: string;
  model: string;
  updatedAt: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

export type UserPersona = {
  id: string;
  displayName?: string;
  nicknames: string[];
  communicationStyle: string;
  boundaries: string;
  relationshipGoals: string;
  hardRules: string[];
  personaMarkdown: string;
  memoryMarkdown: string;
  updatedAt: string;
};

export type Contact = {
  id: string;
  displayName: string;
  aliases: string[];
  relationshipType?: string;
  notes?: string;
  localMemorySummary?: string;
  lastAnalysisAt?: string;
  syncStatus: "local" | "synced" | "pending";
};

export type ImportedConversation = {
  id: string;
  sourceType: "screenshot" | "text";
  sourceTimestamp: string;
  contactId?: string;
  messages: Array<{ role: "user" | "contact"; text: string }>;
  rawText?: string;
  localScreenshotUri?: string;
  confidence: number;
};

export type AnalysisResult = {
  id: string;
  conversationId: string;
  tone: string;
  intent: string;
  subtext: string;
  relationshipSignal: string;
  confidence: number;
  riskFlags: string[];
  reasoningSummary: string;
};

export type ReplyDraft = {
  id: string;
  analysisId: string;
  style: ReplyStyle;
  text: string;
  rationale: string;
  cautionLevel: "none" | "low" | "medium" | "high";
};

export type MemoryPatch = {
  id: string;
  contactId: string;
  proposedAdditions: string[];
  evidence: string[];
  status: "pending" | "approved" | "edited" | "rejected";
  createdAt: string;
};

export type ImportAnalysisResponse = {
  conversation: ImportedConversation;
  analysis: AnalysisResult;
  memoryPatch?: MemoryPatch;
  model: string;
};

export type ReplyGenerationResponse = {
  drafts: ReplyDraft[];
  model: string;
};
