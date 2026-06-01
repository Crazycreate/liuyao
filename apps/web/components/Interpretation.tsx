"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { streamPost } from "@/lib/streamClient";

export interface InterpretInput {
  question: string;
  coinValues: number[];
  date: string;
}

/** 一次断卦请求由 key 唯一标识(coinValues+question),变化即重新断。 */
export function Interpretation({ input }: { input: InterpretInput }) {
  const [text, setText] = useState("");
  const [state, setState] = useState<"streaming" | "done" | "error">("streaming");
  const [error, setError] = useState<string | null>(null);
  const proseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ac = new AbortController();
    setText("");
    setError(null);
    setState("streaming");
    streamPost("/api/interpret", input, (full) => setText(full), { signal: ac.signal })
      .then(() => setState("done"))
      .catch((e: unknown) => {
        if (ac.signal.aborted) return;
        setError(e instanceof Error ? e.message : "断卦失败");
        setState("error");
      });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.question, input.coinValues.join(",")]);

  return (
    <div className="card">
      <div className="verdict-head">
        <span className="dot" />
        <h2>断 卦</h2>
        <span className="who">AI 断卦 · 仅供参考</span>
      </div>

      {error ? (
        <p className="notice">
          {error}
          <br />
          默认的 pollinations 免费小模型对六爻长断常吐空。请配置更强的 provider(本地 ollama 或免费
          glm,见 .env.example),或在 .env 切换 AI_PROVIDER 后重试。
        </p>
      ) : null}

      {!text && state === "streaming" ? <p className="hint">正在按用神、月建、日辰、动爻起断…</p> : null}

      {text ? (
        <div ref={proseRef} className={`prose ${state === "streaming" ? "cursor" : ""}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
      ) : null}

      {state === "done" && !text ? (
        <p className="notice">
          当前模型未给出断辞(默认 pollinations 小模型对六爻常吐空)。请切换到更强的 provider:本地
          ollama 或免费 glm(见 .env.example)。
        </p>
      ) : null}
    </div>
  );
}
