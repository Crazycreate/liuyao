"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { streamPost } from "@/lib/streamClient";
import type { AiSettings } from "@/components/SettingsPanel";

export interface CrossInput {
  question: string;
  coinValues: number[];
  date: string;
}

/** 六爻 × 六壬 四维度互证(流式)。 */
export function CrossReading({ input, ai }: { input: CrossInput; ai: AiSettings }) {
  const [text, setText] = useState("");
  const [state, setState] = useState<"streaming" | "done" | "error">("streaming");
  const [error, setError] = useState<string | null>(null);
  const proseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ac = new AbortController();
    setText("");
    setError(null);
    setState("streaming");
    streamPost("/api/cross", { ...input, ai }, (full) => setText(full), { signal: ac.signal })
      .then(() => setState("done"))
      .catch((e: unknown) => {
        if (ac.signal.aborted) return;
        setError(e instanceof Error ? e.message : "互证失败");
        setState("error");
      });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.question, input.coinValues.join(",")]);

  return (
    <div className="card cross">
      <div className="verdict-head">
        <span className="dot" />
        <h2>互证 · 六爻 × 六壬</h2>
        <span className="who">AI 断卦 · 分维度如实呈现 · 仅供参考</span>
      </div>

      {error ? (
        <p className="notice">
          {error}
          <br />
          默认 pollinations 免费小模型对长断常吐空。请在 .env 切换 AI_PROVIDER 到本地 ollama 或免费 glm 后重试。
        </p>
      ) : null}

      {!text && state === "streaming" ? (
        <p className="hint">正按四维度(成败 / 应期 / 人物方位 / 风险)逐一互证两盘…</p>
      ) : null}

      {text ? (
        <div ref={proseRef} className={`prose ${state === "streaming" ? "cursor" : ""}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
      ) : null}

      {state === "done" && !text ? (
        <p className="notice">当前模型未给出断辞。请切换到更强的 provider(本地 ollama 或免费 glm)。</p>
      ) : null}
    </div>
  );
}
