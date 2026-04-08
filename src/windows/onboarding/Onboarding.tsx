import { useState, useRef, KeyboardEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import { chatBackground } from "../../lib/gateway";
import "./Onboarding.css";

// ── Types ────────────────────────────────────────────────────────────────────

interface IdentityData {
  nicknames: string[];   // one or more — WeChat name, screen name, real name…
  age_range: string;
  occupation: string;
  mbti: string;
  zodiac: string;
}

interface CommunicationData {
  message_format: string;
  emoji_usage: string;
  punctuation_habits: string[];
  reply_speed: string;
  catchphrases: string[];
}

interface EmotionalData {
  attachment_style: string;
  love_languages: string[];
  conflict_response: string;
  when_interested: string;
}

interface RelationshipData {
  role: string;
  valued_traits: string[];
  dealbreakers: string;
}

type FormData = {
  identity: IdentityData;
  communication: CommunicationData;
  emotional: EmotionalData;
  relationship: RelationshipData;
};

// ── Constants ────────────────────────────────────────────────────────────────

const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
  "不知道",
];

const ZODIACS = [
  "白羊座", "金牛座", "双子座", "巨蟹座",
  "狮子座", "处女座", "天秤座", "天蝎座",
  "射手座", "摩羯座", "水瓶座", "双鱼座",
  "跳过",
];

const TOTAL_STEPS = 4;

// ── Small shared components ───────────────────────────────────────────────────

function RadioGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="ob-radio-group">
      {options.map((opt) => (
        <div
          key={opt}
          className={`ob-radio-option${value === opt ? " selected" : ""}`}
          onClick={() => onChange(opt)}
        >
          <div className="ob-radio-dot">
            <div className="ob-radio-fill" />
          </div>
          <span className="ob-radio-text">{opt}</span>
        </div>
      ))}
    </div>
  );
}

function CheckGroup({
  options,
  value,
  onChange,
  max,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  max?: number;
}) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt));
    } else {
      if (max && value.length >= max) return;
      onChange([...value, opt]);
    }
  };

  return (
    <div className="ob-check-group">
      {max && (
        <p className="ob-check-limit">
          最多选 {max} 项（已选 {value.length}）
        </p>
      )}
      {options.map((opt) => {
        const selected = value.includes(opt);
        const disabled = !selected && !!max && value.length >= max;
        return (
          <div
            key={opt}
            className={`ob-check-option${selected ? " selected" : ""}${disabled ? " disabled" : ""}`}
            onClick={() => toggle(opt)}
          >
            <div className="ob-checkbox">
              <span className="ob-check-mark">✓</span>
            </div>
            <span className="ob-check-text">{opt}</span>
          </div>
        );
      })}
    </div>
  );
}

function TagInput({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && input === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <>
      <div
        className="ob-tag-input-wrap"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span key={tag} className="ob-tag">
            {tag}
            <button
              className="ob-tag-remove"
              onClick={(e) => {
                e.stopPropagation();
                onChange(value.filter((t) => t !== tag));
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="ob-tag-text-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={addTag}
          placeholder={value.length === 0 ? placeholder : ""}
          autoFocus={autoFocus}
        />
      </div>
      <p className="ob-tag-hint">按 Enter 或逗号添加，Backspace 删除最后一个</p>
    </>
  );
}

// ── Step components ───────────────────────────────────────────────────────────

function StepIdentity({
  data,
  onChange,
}: {
  data: IdentityData;
  onChange: (d: IdentityData) => void;
}) {
  const set = <K extends keyof IdentityData>(k: K, v: IdentityData[K]) =>
    onChange({ ...data, [k]: v });

  return (
    <div className="ob-fields">
      <div className="ob-field">
        <label className="ob-label">
          你的代号 / 昵称
          <span className="ob-label-opt">可以填多个</span>
        </label>
        <TagInput
          value={data.nicknames}
          onChange={(v) => set("nicknames", v)}
          placeholder="微信昵称、英文名、花名、备注名…"
          autoFocus
        />
      </div>

      <div className="ob-field">
        <label className="ob-label">
          年龄段 <span className="ob-label-opt">可选</span>
        </label>
        <RadioGroup
          options={["18-22", "23-27", "28-35", "35+"]}
          value={data.age_range}
          onChange={(v) => set("age_range", v)}
        />
      </div>

      <div className="ob-field">
        <label className="ob-label">
          职业 / 身份 <span className="ob-label-opt">可选</span>
        </label>
        <input
          className="ob-input"
          value={data.occupation}
          onChange={(e) => set("occupation", e.target.value)}
          placeholder="产品经理、大学生、设计师…"
        />
      </div>

      <div className="ob-field">
        <label className="ob-label">
          MBTI <span className="ob-label-opt">可选</span>
        </label>
        <select
          className="ob-select"
          value={data.mbti}
          onChange={(e) => set("mbti", e.target.value)}
        >
          <option value="">-- 请选择 --</option>
          {MBTI_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="ob-field">
        <label className="ob-label">
          星座 <span className="ob-label-opt">可选</span>
        </label>
        <select
          className="ob-select"
          value={data.zodiac}
          onChange={(e) => set("zodiac", e.target.value)}
        >
          <option value="">-- 请选择 --</option>
          {ZODIACS.map((z) => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function StepCommunication({
  data,
  onChange,
}: {
  data: CommunicationData;
  onChange: (d: CommunicationData) => void;
}) {
  const set = <K extends keyof CommunicationData>(
    k: K,
    v: CommunicationData[K],
  ) => onChange({ ...data, [k]: v });

  return (
    <div className="ob-fields">
      <div className="ob-notice">
        <span className="ob-notice-icon">⚡</span>
        <span>
          即将支持：导入聊天记录或截图，让系统自动分析你的说话风格，比手动选择更准确。
        </span>
      </div>

      <div className="ob-field">
        <label className="ob-label">发消息的习惯</label>
        <RadioGroup
          options={["短句连发", "一整段说完", "视情况而定"]}
          value={data.message_format}
          onChange={(v) => set("message_format", v)}
        />
      </div>

      <div className="ob-field">
        <label className="ob-label">emoji / 表情使用频率</label>
        <RadioGroup
          options={["经常用", "偶尔用", "基本不用"]}
          value={data.emoji_usage}
          onChange={(v) => set("emoji_usage", v)}
        />
      </div>

      <div className="ob-field">
        <label className="ob-label">
          标点习惯 <span className="ob-label-opt">可多选</span>
        </label>
        <CheckGroup
          options={["不用句号", "常用省略号…", "喜欢用～", "全角标点", "无特殊习惯"]}
          value={data.punctuation_habits}
          onChange={(v) => set("punctuation_habits", v)}
        />
      </div>

      <div className="ob-field">
        <label className="ob-label">回复速度倾向</label>
        <RadioGroup
          options={["秒回", "看心情", "不着急", "已读会回"]}
          value={data.reply_speed}
          onChange={(v) => set("reply_speed", v)}
        />
      </div>

      <div className="ob-field">
        <label className="ob-label">
          口头禅 / 高频词 <span className="ob-label-opt">可选</span>
        </label>
        <TagInput
          value={data.catchphrases}
          onChange={(v) => set("catchphrases", v)}
          placeholder="哈哈哈、好吧、随便、你认真的吗…"
        />
      </div>
    </div>
  );
}

function StepEmotional({
  data,
  onChange,
}: {
  data: EmotionalData;
  onChange: (d: EmotionalData) => void;
}) {
  const set = <K extends keyof EmotionalData>(k: K, v: EmotionalData[K]) =>
    onChange({ ...data, [k]: v });

  return (
    <div className="ob-fields">
      <div className="ob-field">
        <label className="ob-label">依恋类型</label>
        <RadioGroup
          options={["安全型", "焦虑型", "回避型", "不确定"]}
          value={data.attachment_style}
          onChange={(v) => set("attachment_style", v)}
        />
      </div>

      <div className="ob-field">
        <label className="ob-label">
          爱的语言 <span className="ob-label-opt">最多选 2 项</span>
        </label>
        <CheckGroup
          options={["肯定的话语", "精心的时刻", "身体接触", "服务行为", "接受礼物"]}
          value={data.love_languages}
          onChange={(v) => set("love_languages", v)}
          max={2}
        />
      </div>

      <div className="ob-field">
        <label className="ob-label">发生冲突时，你通常</label>
        <RadioGroup
          options={["冷暴力 / 沉默", "直接说出来", "转移话题", "说反话"]}
          value={data.conflict_response}
          onChange={(v) => set("conflict_response", v)}
        />
      </div>

      <div className="ob-field">
        <label className="ob-label">
          喜欢一个人时，你会 <span className="ob-label-opt">可选</span>
        </label>
        <input
          className="ob-input"
          value={data.when_interested}
          onChange={(e) => set("when_interested", e.target.value)}
          placeholder="例如：变得话很多，或者反而更沉默…"
        />
      </div>
    </div>
  );
}

function StepRelationship({
  data,
  onChange,
}: {
  data: RelationshipData;
  onChange: (d: RelationshipData) => void;
}) {
  const set = <K extends keyof RelationshipData>(
    k: K,
    v: RelationshipData[K],
  ) => onChange({ ...data, [k]: v });

  return (
    <div className="ob-fields">
      <div className="ob-field">
        <label className="ob-label">在关系里，你通常是</label>
        <RadioGroup
          options={["主动方", "被动方", "看对方", "比较平等"]}
          value={data.role}
          onChange={(v) => set("role", v)}
        />
      </div>

      <div className="ob-field">
        <label className="ob-label">
          你最看重对方的 <span className="ob-label-opt">最多选 3 项</span>
        </label>
        <CheckGroup
          options={["真诚", "幽默", "独立", "有边界感", "共同话题", "情绪稳定", "有趣"]}
          value={data.valued_traits}
          onChange={(v) => set("valued_traits", v)}
          max={3}
        />
      </div>

      <div className="ob-field">
        <label className="ob-label">
          你的底线 / 不可接受的事 <span className="ob-label-opt">可选</span>
        </label>
        <input
          className="ob-input"
          value={data.dealbreakers}
          onChange={(e) => set("dealbreakers", e.target.value)}
          placeholder="例如：不能先道歉、不喜欢被催回复…"
        />
      </div>
    </div>
  );
}

// ── Review ────────────────────────────────────────────────────────────────────

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: string | string[];
}) {
  const display = Array.isArray(value)
    ? value.length > 0
      ? value.join("、")
      : null
    : value || null;

  return (
    <div className="ob-review-row">
      <span className="ob-review-key">{label}</span>
      <span className={`ob-review-val${display ? "" : " empty"}`}>
        {display ?? "未填写"}
      </span>
    </div>
  );
}

function ReviewScreen({ form }: { form: FormData }) {
  return (
    <div className="ob-review">
      <div className="ob-review-section">
        <p className="ob-review-section-title">身份</p>
        <ReviewRow label="代号 / 昵称" value={form.identity.nicknames} />
        <ReviewRow label="年龄段" value={form.identity.age_range} />
        <ReviewRow label="职业" value={form.identity.occupation} />
        <ReviewRow label="MBTI" value={form.identity.mbti} />
        <ReviewRow label="星座" value={form.identity.zodiac} />
      </div>

      <div className="ob-review-section">
        <p className="ob-review-section-title">说话风格</p>
        <ReviewRow label="消息习惯" value={form.communication.message_format} />
        <ReviewRow label="emoji" value={form.communication.emoji_usage} />
        <ReviewRow label="标点" value={form.communication.punctuation_habits} />
        <ReviewRow label="回复速度" value={form.communication.reply_speed} />
        <ReviewRow label="口头禅" value={form.communication.catchphrases} />
      </div>

      <div className="ob-review-section">
        <p className="ob-review-section-title">情感模式</p>
        <ReviewRow label="依恋类型" value={form.emotional.attachment_style} />
        <ReviewRow label="爱的语言" value={form.emotional.love_languages} />
        <ReviewRow label="冲突应对" value={form.emotional.conflict_response} />
        <ReviewRow label="喜欢时会" value={form.emotional.when_interested} />
      </div>

      <div className="ob-review-section">
        <p className="ob-review-section-title">关系行为</p>
        <ReviewRow label="关系角色" value={form.relationship.role} />
        <ReviewRow label="看重特质" value={form.relationship.valued_traits} />
        <ReviewRow label="底线" value={form.relationship.dealbreakers} />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const STEP_META = [
  { label: "Step 1", title: "先认识一下你", subtitle: "基础身份信息，帮助我理解你是谁。" },
  { label: "Step 2", title: "你怎么说话？", subtitle: "你的消息风格，让回复建议更像你。" },
  { label: "Step 3", title: "情感方式", subtitle: "你如何表达和接收情感。" },
  { label: "Step 4", title: "关系里的你", subtitle: "你在亲密关系中的行为模式。" },
];

function makeEmpty(): FormData {
  return {
    identity: { nicknames: [], age_range: "", occupation: "", mbti: "", zodiac: "" },
    communication: {
      message_format: "",
      emoji_usage: "",
      punctuation_habits: [],
      reply_speed: "",
      catchphrases: [],
    },
    emotional: { attachment_style: "", love_languages: [], conflict_response: "", when_interested: "" },
    relationship: { role: "", valued_traits: [], dealbreakers: "" },
  };
}

async function loadPersonaBuildPrompt(): Promise<string> {
  // Read the prompt template from the backend
  await fetch("http://127.0.0.1:8765/v1/background/chat", {
    method: "HEAD",
  }).catch(() => null);
  // We embed the prompt inline since we can't read backend files from the frontend.
  // The actual template is at backend/prompts/persona/user_builder.md + schema.md.
  return PERSONA_BUILD_SYSTEM_PROMPT;
}

// Inline system prompt (mirrors backend/prompts/persona/user_builder.md + schema.md)
const PERSONA_BUILD_SYSTEM_PROMPT = `You are a persona architect. Read structured self-report data from an onboarding questionnaire and produce a well-formed user/persona.md file.

Output a single raw Markdown document — no code fences, no explanation. Start directly with the heading.

Produce exactly these five sections:

# User Persona

> Self-report onboarding data. Used by Real-time Engine to calibrate reply tone and subtext analysis.

## Hard Rules
3-5 specific behavioral rules derived from the attachment style, conflict response, and dealbreakers. Phrased as direct imperatives ("Does not...", "Never...", "Always...").

## Identity
- Nicknames (all of them, comma-separated — these are the names by which the system will recognize this user in captured screenshots)
- Age range, occupation, MBTI, zodiac
- A one-sentence summary of who this person is

## Communication Style
- Message format, emoji usage, punctuation habits, reply speed, catchphrases
- What each reveals about personality
- An overall style note (1-2 sentences)

## Emotional Pattern
- Attachment style with concrete behavioral manifestations in messaging
- Love languages and what they mean for digital communication
- Conflict response pattern (triggers, duration, resolution signals)
- When interested in someone
- Inferred emotional triggers

## Relationship Behavior
- Relational role (who texts first, who sets emotional tone)
- Core values in others and how violations manifest
- Dealbreakers and behavioral response when triggered
- Coaching note: how the reply generator should adapt (tone, approaches to avoid)

Rules:
1. Write in third person ("They send messages in short bursts")
2. Every field must be actionable for a reply generator
3. Hard Rules must be direct imperatives
4. Total 400-600 words. Dense, not padded.
5. Output raw Markdown only — no fences, no JSON`;

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0-3 = form steps, 4 = review, 5 = generating
  const [form, setForm] = useState<FormData>(makeEmpty());
  const [error, setError] = useState<string | null>(null);

  const isReview = step === TOTAL_STEPS;
  const isGenerating = step === TOTAL_STEPS + 1;

  const canProceed = () => {
    if (step === 0) return form.identity.nicknames.length > 0;
    return true; // all other steps are optional
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleGenerate = async () => {
    setStep(TOTAL_STEPS + 1);
    setError(null);

    try {
      await loadPersonaBuildPrompt(); // warm-up / no-op

      const userMessage = `Please generate a user/persona.md file based on this onboarding data:\n\n${JSON.stringify(form, null, 2)}`;

      const response = await chatBackground({
        messages: [
          { role: "system", content: PERSONA_BUILD_SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.4,
        max_tokens: 1200,
      });

      const personaContent = response.content.trim();
      await invoke("write_file", {
        relativePath: "user/persona.md",
        content: personaContent,
      });

      navigate("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep(TOTAL_STEPS); // go back to review so user can retry
    }
  };

  const meta = isReview || isGenerating ? null : STEP_META[step];

  return (
    <div className="ob-root">
      <div className="ob-card">
        {/* Progress */}
        {!isGenerating && (
          <div className="ob-progress">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <>
                <div
                  key={`dot-${i}`}
                  className={`ob-step-dot${i === step ? " active" : i < step || isReview ? " done" : ""}`}
                />
                {i < TOTAL_STEPS - 1 && (
                  <div key={`line-${i}`} className="ob-step-line" />
                )}
              </>
            ))}
          </div>
        )}

        {/* Header */}
        {meta && (
          <div className="ob-header">
            <span className="ob-step-label">{meta.label} / {TOTAL_STEPS}</span>
            <h1 className="ob-title">{meta.title}</h1>
            <p className="ob-subtitle">{meta.subtitle}</p>
          </div>
        )}

        {isReview && !isGenerating && (
          <div className="ob-header">
            <span className="ob-step-label">确认信息</span>
            <h1 className="ob-title">看起来怎么样？</h1>
            <p className="ob-subtitle">确认后将生成你的专属 Persona，可随时在设置中更新。</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="ob-error">
            生成失败：{error}
            <br />
            请确认 Backend 已启动（python backend/main.py），然后重试。
          </div>
        )}

        {/* Body */}
        {isGenerating ? (
          <div className="ob-generating">
            <div className="ob-spinner" />
            <p className="ob-generating-text">正在生成你的 Persona…</p>
            <p className="ob-generating-sub">
              使用 Background Engine 分析你的信息，约需 10-20 秒
            </p>
          </div>
        ) : isReview ? (
          <ReviewScreen form={form} />
        ) : step === 0 ? (
          <StepIdentity data={form.identity} onChange={(d) => setForm({ ...form, identity: d })} />
        ) : step === 1 ? (
          <StepCommunication data={form.communication} onChange={(d) => setForm({ ...form, communication: d })} />
        ) : step === 2 ? (
          <StepEmotional data={form.emotional} onChange={(d) => setForm({ ...form, emotional: d })} />
        ) : (
          <StepRelationship data={form.relationship} onChange={(d) => setForm({ ...form, relationship: d })} />
        )}

        {/* Navigation */}
        {!isGenerating && (
          <div className="ob-nav">
            {step > 0 ? (
              <button className="ob-btn ob-btn-ghost" onClick={handleBack}>
                返回
              </button>
            ) : (
              <div className="ob-nav-spacer" />
            )}

            {isReview ? (
              <button
                className="ob-btn ob-btn-success"
                onClick={handleGenerate}
              >
                生成我的 Persona
              </button>
            ) : (
              <>
                {step > 0 && step < TOTAL_STEPS && (
                  <button
                    className="ob-btn ob-btn-ghost"
                    onClick={handleNext}
                    style={{ marginLeft: "auto", marginRight: 8 }}
                  >
                    跳过
                  </button>
                )}
                <button
                  className="ob-btn ob-btn-primary"
                  onClick={handleNext}
                  disabled={!canProceed()}
                >
                  {step === TOTAL_STEPS - 1 ? "查看总结" : "下一步"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
