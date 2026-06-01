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

/**
 * 互证分段:与引擎 CROSS_SEGMENTS 顺序一致。
 * 拆段是为绕开 Vercel 免费版 60s 函数上限——整篇一次跑 ~130s 会被截断,
 * 逐段各一次 <60s 的请求,顺序拼接展示。各段独立锚定确定性盘面,不互相引用 AI 文本。
 */
const SEGMENTS = [
  { key: "chengbai", label: "成败倾向" },
  { key: "yingqi", label: "应期" },
  { key: "renwu", label: "人物 / 方位" },
  { key: "fengxian", label: "风险 / 性质" },
  { key: "xingdong", label: "综合 · 行动" },
] as const;

type RunState = "streaming" | "done" | "error";

/** 六爻 × 六壬 四维度互证(分段流式,逐维呈现)。 */
export function CrossReading({ input, ai }: { input: CrossInput; ai: AiSettings }) {
  const [done, setDone] = useState(""); // 已完成段落的拼接全文
  const [current, setCurrent] = useState(""); // 当前正在流式的段落
  const [activeIdx, setActiveIdx] = useState(0); // 正在断的维度序号(-1=全部完成)
  const [state, setState] = useState<RunState>("streaming");
  const [error, setError] = useState<string | null>(null);
  const proseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ac = new AbortController();
    setDone("");
    setCurrent("");
    setActiveIdx(0);
    setError(null);
    setState("streaming");

    const join = (a: string, b: string) => [a, b].filter(Boolean).join("\n\n");

    (async () => {
      let acc = "";
      for (let i = 0; i < SEGMENTS.length; i++) {
        if (ac.signal.aborted) return;
        const seg = SEGMENTS[i];
        setActiveIdx(i);
        setCurrent("");
        let partial = "";
        try {
          await streamPost(
            "/api/cross",
            { ...input, ai, segment: seg.key },
            (full) => {
              partial = full;
              setCurrent(full);
            },
            { signal: ac.signal },
          );
        } catch (e) {
          if (ac.signal.aborted) return;
          // 首段就失败(多为网络/鉴权)→ 整体报错;后续段失败 → 标注该维度并继续。
          if (i === 0 && !acc) {
            setError(e instanceof Error ? e.message : "互证失败");
            setState("error");
            return;
          }
          partial = `### ${seg.label}\n\n_(此维度生成失败:${e instanceof Error ? e.message : "未知错误"})_`;
        }
        // 段落跑完但模型吐空(常见于 pollinations 小模型)→ 占位标注,不留空白。
        const body = partial.trim() ? partial : `### ${seg.label}\n\n_(当前模型未给出该维度断辞)_`;
        acc = join(acc, body);
        setDone(acc);
        setCurrent("");
      }
      if (ac.signal.aborted) return;
      setActiveIdx(-1);
      setState("done");
    })();

    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.question, input.coinValues.join(",")]);

  const displayed = [done, current].filter(Boolean).join("\n\n");
  const activeLabel = activeIdx >= 0 ? SEGMENTS[activeIdx]?.label : null;

  return (
    <div className="card cross">
      <div className="verdict-head">
        <span className="dot" />
        <h2>互证 · 六爻 × 六壬</h2>
        <span className="who">AI 断卦 · 分维度如实呈现 · 仅供参考</span>
      </div>

      {state === "streaming" && activeLabel ? (
        <p className="hint">
          正在断:<strong>{activeLabel}</strong>（{activeIdx + 1}/{SEGMENTS.length}）· 分段生成,逐维呈现…
        </p>
      ) : null}

      {error ? (
        <p className="notice">
          {error}
          <br />
          默认 pollinations 免费小模型对长断常吐空。请在右上「⚙ AI 设置」切换到 glm / gemini 等带 key 的模型后重试。
        </p>
      ) : null}

      {displayed ? (
        <div ref={proseRef} className={`prose ${state === "streaming" ? "cursor" : ""}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayed}</ReactMarkdown>
        </div>
      ) : null}

      {state === "done" && !displayed ? (
        <p className="notice">当前模型未给出断辞。请切换到更强的 provider(免费 glm / gemini,或本地 ollama)。</p>
      ) : null}
    </div>
  );
}
