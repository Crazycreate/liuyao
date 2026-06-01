"use client";

import { useState } from "react";

export interface AiSettings {
  provider: string;
  apiKey: string;
  model: string;
  baseURL: string;
}

export const DEFAULT_AI: AiSettings = { provider: "pollinations", apiKey: "", model: "", baseURL: "" };

const LS_KEY = "liuyao.ai.v1";

/** 每个 provider 的常用模型(第一个为推荐默认) */
const MODELS: Record<string, { v: string; label: string }[]> = {
  glm: [
    { v: "glm-4-flash", label: "glm-4-flash(免费·快·推荐)" },
    { v: "glm-4-flashx", label: "glm-4-flashx(免费·更快)" },
    { v: "glm-4-air", label: "glm-4-air(均衡)" },
    { v: "glm-4-plus", label: "glm-4-plus(更强)" },
    { v: "glm-4-long", label: "glm-4-long(长文)" },
  ],
  gemini: [
    { v: "gemini-2.0-flash", label: "gemini-2.0-flash(推荐)" },
    { v: "gemini-2.0-flash-lite", label: "gemini-2.0-flash-lite(更快)" },
    { v: "gemini-2.5-flash", label: "gemini-2.5-flash" },
    { v: "gemini-1.5-flash", label: "gemini-1.5-flash" },
    { v: "gemini-1.5-pro", label: "gemini-1.5-pro(更强)" },
  ],
  groq: [
    { v: "llama-3.3-70b-versatile", label: "llama-3.3-70b(推荐)" },
    { v: "llama-3.1-8b-instant", label: "llama-3.1-8b(最快)" },
    { v: "gemma2-9b-it", label: "gemma2-9b" },
    { v: "deepseek-r1-distill-llama-70b", label: "deepseek-r1-distill-70b" },
  ],
  anthropic: [
    { v: "claude-sonnet-4-6", label: "claude-sonnet-4-6(快·推荐)" },
    { v: "claude-opus-4-8", label: "claude-opus-4-8(最强·慢)" },
    { v: "claude-haiku-4-5-20251001", label: "claude-haiku-4-5(最快)" },
  ],
};

const PROVIDERS: { v: string; label: string; needsKey: boolean; signup?: string }[] = [
  { v: "pollinations", label: "免费 · Pollinations(默认,无需 key)", needsKey: false },
  { v: "glm", label: "智谱 GLM-4-Flash(免费,需 key)", needsKey: true, signup: "https://open.bigmodel.cn/" },
  { v: "gemini", label: "Google Gemini(免费额度,需 key)", needsKey: true, signup: "https://aistudio.google.com/apikey" },
  { v: "groq", label: "Groq(免费,需 key)", needsKey: true, signup: "https://console.groq.com/keys" },
  { v: "anthropic", label: "Claude / Anthropic(付费,需 key)", needsKey: true, signup: "https://console.anthropic.com/" },
  { v: "custom", label: "自定义(任意 OpenAI 兼容端点)", needsKey: true },
];

export function loadAi(): AiSettings {
  if (typeof window === "undefined") return DEFAULT_AI;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT_AI, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_AI;
}

export function SettingsPanel({
  value,
  onChange,
}: {
  value: AiSettings;
  onChange: (s: AiSettings) => void;
}) {
  const [open, setOpen] = useState(false);
  const meta = PROVIDERS.find((p) => p.v === value.provider) ?? PROVIDERS[0];

  function set(patch: Partial<AiSettings>) {
    const next = { ...value, ...patch };
    onChange(next);
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="settings">
      <button type="button" className="settings-toggle" onClick={() => setOpen((o) => !o)}>
        ⚙ AI 设置 · 当前:{meta.label.split("(")[0]}
        <span className="caret">{open ? "▴" : "▾"}</span>
      </button>

      {open ? (
        <div className="settings-body">
          <label className="fld" htmlFor="prov">
            断卦/互证用哪个模型
          </label>
          <select
            id="prov"
            className="settings-select"
            value={value.provider}
            onChange={(e) => {
              const p = e.target.value;
              set({ provider: p, model: MODELS[p]?.[0]?.v ?? "" });
            }}
          >
            {PROVIDERS.map((p) => (
              <option key={p.v} value={p.v}>
                {p.label}
              </option>
            ))}
          </select>

          {meta.needsKey ? (
            <>
              <label className="fld" htmlFor="key" style={{ marginTop: "0.8rem" }}>
                API Key{meta.signup ? <> · <a href={meta.signup} target="_blank" rel="noreferrer">申请</a></> : null}
              </label>
              <input
                id="key"
                className="settings-input"
                type="password"
                autoComplete="off"
                placeholder="粘贴你的 API Key"
                value={value.apiKey}
                onChange={(e) => set({ apiKey: e.target.value })}
              />
            </>
          ) : null}

          {value.provider === "custom" ? (
            <>
              <label className="fld" htmlFor="base" style={{ marginTop: "0.8rem" }}>
                Base URL(OpenAI 兼容端点)
              </label>
              <input
                id="base"
                className="settings-input"
                placeholder="https://.../v1"
                value={value.baseURL}
                onChange={(e) => set({ baseURL: e.target.value })}
              />
              <label className="fld" htmlFor="model" style={{ marginTop: "0.8rem" }}>
                模型名
              </label>
              <input
                id="model"
                className="settings-input"
                placeholder="如 gpt-4o-mini / deepseek-chat"
                value={value.model}
                onChange={(e) => set({ model: e.target.value })}
              />
            </>
          ) : MODELS[value.provider] ? (
            <>
              <label className="fld" htmlFor="model2" style={{ marginTop: "0.8rem" }}>
                模型
              </label>
              <select
                id="model2"
                className="settings-select"
                value={value.model || MODELS[value.provider]![0]!.v}
                onChange={(e) => set({ model: e.target.value })}
              >
                {MODELS[value.provider]!.map((m) => (
                  <option key={m.v} value={m.v}>
                    {m.label}
                  </option>
                ))}
              </select>
            </>
          ) : null}

          <p className="settings-note">
            🔒 Key 只存在你的浏览器(localStorage),仅在断卦时随该次请求发送给服务端转发给模型方,
            <b>服务端不保存、不记录</b>。默认 Pollinations 免费免 key,但小模型对长断常吐空,想要好质量请填 GLM/Gemini/Claude 的 key。
          </p>
        </div>
      ) : null}
    </div>
  );
}
