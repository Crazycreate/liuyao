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
 * 拆段是为绕开 Vercel 免费版 60s 函数上限——整篇一次跑 ~130s 会被截断。
 * 各段独立锚定确定性盘面(不互相引用 AI 文本),故可**并行**发起、按固定顺序就位渲染:
 * 整页墙钟从顺序的 ~120s 压到最慢一段的 ~30s。
 */
const SEGMENTS = [
  { key: "chengbai", label: "一、成败倾向" },
  { key: "yingqi", label: "二、应期" },
  { key: "renwu", label: "三、人物 / 方位" },
  { key: "fengxian", label: "四、风险 / 性质" },
  { key: "xingdong", label: "综合 · 行动" },
] as const;

type SegStatus = "pending" | "streaming" | "done" | "error";
interface Slot {
  text: string;
  status: SegStatus;
  error?: string;
}

const INITIAL: Slot[] = SEGMENTS.map(() => ({ text: "", status: "pending" }));

/** 六爻 × 六壬 四维度互证(分段并行,按维度顺序就位)。 */
export function CrossReading({ input, ai }: { input: CrossInput; ai: AiSettings }) {
  const [slots, setSlots] = useState<Slot[]>(INITIAL);
  const proseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ac = new AbortController();
    setSlots(SEGMENTS.map(() => ({ text: "", status: "pending" })));

    const patch = (i: number, p: Partial<Slot>) =>
      setSlots((prev) => {
        const next = [...prev];
        next[i] = { ...next[i], ...p };
        return next;
      });

    // 全部并行发起;各段写各自的槽位,互不阻塞。
    SEGMENTS.forEach((seg, i) => {
      patch(i, { status: "streaming" });
      streamPost(
        "/api/cross",
        { ...input, ai, segment: seg.key },
        (full) => patch(i, { text: full }),
        { signal: ac.signal },
      )
        .then(() => patch(i, { status: "done" }))
        .catch((e: unknown) => {
          if (ac.signal.aborted) return;
          patch(i, { status: "error", error: e instanceof Error ? e.message : "生成失败" });
        });
    });

    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.question, input.coinValues.join(",")]);

  const settled = slots.filter((s) => s.status === "done" || s.status === "error").length;
  const allDone = settled === SEGMENTS.length;
  const allError = allDone && slots.every((s) => s.status === "error" && !s.text.trim());
  const anyText = slots.some((s) => s.text.trim());

  // 固定维度顺序拼接;未到的段给占位,吐空/失败的段就地标注。
  const markdown = SEGMENTS.map((seg, i) => {
    const s = slots[i];
    if (s.text.trim()) return s.text;
    if (s.status === "error") return `### ${seg.label}\n\n_(此维度生成失败:${s.error})_`;
    if (s.status === "done") return `### ${seg.label}\n\n_(当前模型未给出该维度断辞)_`;
    return `### ${seg.label}\n\n_(断卦中…)_`;
  }).join("\n\n");

  return (
    <div className="card cross">
      <div className="verdict-head">
        <span className="dot" />
        <h2>互证 · 六爻 × 六壬</h2>
        <span className="who">AI 断卦 · 分维度如实呈现 · 仅供参考</span>
      </div>

      {!allDone ? (
        <p className="hint">
          并行断卦中 · 已完成 <strong>{settled}/{SEGMENTS.length}</strong> 维度,各维就位即显…
        </p>
      ) : null}

      {allError ? (
        <p className="notice">
          {slots.find((s) => s.error)?.error ?? "互证失败"}
          <br />
          默认 pollinations 免费小模型对长断常吐空。请在右上「⚙ AI 设置」切换到 glm / gemini 等带 key 的模型后重试。
        </p>
      ) : null}

      {!allError && (anyText || !allDone) ? (
        <div ref={proseRef} className={`prose ${!allDone ? "cursor" : ""}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </div>
      ) : null}
    </div>
  );
}
