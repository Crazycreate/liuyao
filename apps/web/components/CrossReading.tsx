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
 * 分段:与引擎 CROSS_SEGMENTS 顺序一致。各段独立锚定确定性盘面、可并行,
 * 整页墙钟 ≈ 最慢一段。lens 决定:只用六爻 / 只用六壬 / 两盘互证。
 */
const SEGMENTS = [
  { key: "chengbai", label: "一、成败倾向" },
  { key: "yingqi", label: "二、应期" },
  { key: "renwu", label: "三、人物 / 方位" },
  { key: "fengxian", label: "四、风险 / 性质" },
  { key: "xingdong", label: "综合 · 行动" },
] as const;

type Lens = "liuyao" | "liuren" | "both";
const LENSES: { key: Lens; label: string }[] = [
  { key: "liuyao", label: "六爻" },
  { key: "liuren", label: "六壬" },
  { key: "both", label: "互证" },
];
const HEAD: Record<Lens, { title: string; who: string }> = {
  liuyao: { title: "六爻断卦", who: "仅六爻 · 分维度 · 仅供参考" },
  liuren: { title: "六壬断课", who: "仅六壬 · 分维度 · 仅供参考" },
  both: { title: "互证 · 六爻 × 六壬", who: "两盘对照 · 一致/分歧如实呈现" },
};

type SegStatus = "pending" | "streaming" | "done" | "error";
interface Slot { text: string; status: SegStatus; error?: string }
const INITIAL: Slot[] = SEGMENTS.map(() => ({ text: "", status: "pending" }));

/** 六爻 / 六壬 / 互证(三选,分段并行,按维度顺序就位)。 */
export function CrossReading({ input, ai }: { input: CrossInput; ai: AiSettings }) {
  const [slots, setSlots] = useState<Slot[]>(INITIAL);
  const [started, setStarted] = useState(false);
  const [lens, setLens] = useState<Lens>("both");
  const acRef = useRef<AbortController | null>(null);
  const proseRef = useRef<HTMLDivElement>(null);

  // 追问(同一卦多轮对话串)
  const [qa, setQa] = useState<{ q: string; a: string }[]>([]);
  const [followQ, setFollowQ] = useState("");
  const [asking, setAsking] = useState(false);
  const [followErr, setFollowErr] = useState<string | null>(null);
  const followAcRef = useRef<AbortController | null>(null);

  // 换了卦(问题/爻值变)→ 中止、回到"待选视角"状态,不自动跑;追问串一并清空。
  const key = `${input.question}|${input.coinValues.join(",")}`;
  useEffect(() => {
    acRef.current?.abort();
    followAcRef.current?.abort();
    setStarted(false);
    setSlots(INITIAL);
    setQa([]);
    setFollowQ("");
    setAsking(false);
    setFollowErr(null);
    return () => {
      acRef.current?.abort();
      followAcRef.current?.abort();
    };
  }, [key]);

  const run = (useLens: Lens) => {
    acRef.current?.abort();
    followAcRef.current?.abort();
    const ac = new AbortController();
    acRef.current = ac;
    setLens(useLens);
    setStarted(true);
    setSlots(SEGMENTS.map(() => ({ text: "", status: "pending" })));
    setQa([]);
    setFollowQ("");
    setAsking(false);
    setFollowErr(null);
    const patch = (i: number, p: Partial<Slot>) =>
      setSlots((prev) => {
        const next = [...prev];
        next[i] = { ...next[i], ...p };
        return next;
      });

    SEGMENTS.forEach((seg, i) => {
      patch(i, { status: "streaming" });
      streamPost("/api/cross", { ...input, ai, segment: seg.key, lens: useLens }, (full) => {
        if (!ac.signal.aborted) patch(i, { text: full });
      }, { signal: ac.signal })
        .then(() => { if (!ac.signal.aborted) patch(i, { status: "done" }); })
        .catch((e: unknown) => {
          if (ac.signal.aborted) return;
          patch(i, { status: "error", error: e instanceof Error ? e.message : "生成失败" });
        });
    });
  };

  const settled = slots.filter((s) => s.status === "done" || s.status === "error").length;
  const allDone = started && settled === SEGMENTS.length;
  const allError = allDone && slots.every((s) => s.status === "error" && !s.text.trim());
  const anyText = slots.some((s) => s.text.trim());

  // 追问:就这一卦继续问。把已完成的断辞(只取出文的维度)+ 历轮问答回灌,保证连贯。
  const ask = () => {
    const q = followQ.trim();
    if (!q || asking) return;
    followAcRef.current?.abort();
    const ac = new AbortController();
    followAcRef.current = ac;
    setAsking(true);
    setFollowErr(null);
    const priorText = slots
      .map((s) => s.text.trim())
      .filter(Boolean)
      .join("\n\n");
    const history = qa.map((p) => ({ q: p.q, a: p.a }));
    const idx = qa.length;
    setQa((prev) => [...prev, { q, a: "" }]);
    setFollowQ("");
    streamPost(
      "/api/cross",
      { ...input, ai, lens, followup: { priorText, history, question: q } },
      (full) => {
        if (ac.signal.aborted) return;
        setQa((prev) => {
          const next = [...prev];
          if (next[idx]) next[idx] = { ...next[idx], a: full };
          return next;
        });
      },
      { signal: ac.signal },
    )
      .then(() => {
        if (!ac.signal.aborted) setAsking(false);
      })
      .catch((e: unknown) => {
        if (ac.signal.aborted) return;
        setAsking(false);
        setFollowErr(e instanceof Error ? e.message : "追问失败");
      });
  };

  const markdown = SEGMENTS.map((seg, i) => {
    const s = slots[i];
    if (s.text.trim()) return s.text;
    if (s.status === "error") return `### ${seg.label}\n\n_(此维度生成失败:${s.error})_`;
    if (s.status === "done") return `### ${seg.label}\n\n_(当前模型未给出该维度断辞)_`;
    return `### ${seg.label}\n\n_(断卦中…)_`;
  }).join("\n\n");

  const head = HEAD[lens];

  return (
    <div className={`card cross cross-${started ? lens : "idle"}`}>
      <div className="verdict-head">
        <span className="dot" />
        <h2>{started ? head.title : "断卦 · 六爻 / 六壬 / 互证"}</h2>
        <span className="who">{started ? head.who : "选一种视角断卦"}</span>
      </div>

      {!started ? (
        <>
          <p className="hint" style={{ marginTop: 0 }}>
            <strong>六爻</strong>只用六爻断、<strong>六壬</strong>只用六壬断、<strong>互证</strong>两盘对照(一致更可信、分歧如实标)。
          </p>
          <div className="lens-row">
            {LENSES.map((l) => (
              <button key={l.key} className={`btn lens-btn is-${l.key}`} onClick={() => run(l.key)}>{l.label}</button>
            ))}
          </div>
        </>
      ) : null}

      {started && !allDone ? (
        <p className="hint">
          并行断卦中 · 已完成 <strong>{settled}/{SEGMENTS.length}</strong> 维度,各维就位即显…
        </p>
      ) : null}

      {allError ? (
        <p className="notice">
          {slots.find((s) => s.error)?.error ?? "断卦失败"}
          <br />
          默认 pollinations 免费小模型对长断常吐空。请在右上「⚙ AI 设置」切换到 glm / gemini 等带 key 的模型后重试。
        </p>
      ) : null}

      {started && !allError && (anyText || !allDone) ? (
        <div ref={proseRef} className={`prose ${!allDone ? "cursor" : ""}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </div>
      ) : null}

      {allDone && !allError ? (
        <div className="lens-row" style={{ marginTop: "1rem", alignItems: "center" }}>
          <span className="who" style={{ marginRight: "0.2rem" }}>换视角重断:</span>
          {LENSES.map((l) => (
            <button key={l.key} className={`btn ghost ${l.key === lens ? "lens-active" : ""}`} onClick={() => run(l.key)}>{l.label}</button>
          ))}
        </div>
      ) : null}

      {allDone && !allError && anyText ? (
        <div className="followup">
          <div className="followup-head">
            <span className="who">就这一卦继续追问 · {head.title}</span>
          </div>

          {qa.length ? (
            <div className="followup-thread">
              {qa.map((p, i) => (
                <div key={i} className="followup-turn">
                  <p className="followup-q">
                    <span className="fq-badge">问</span>
                    {p.q}
                  </p>
                  <div className="followup-a prose">
                    {p.a.trim() ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.a}</ReactMarkdown>
                    ) : (
                      <span className="cursor-text">{asking && i === qa.length - 1 ? "正在答…" : "…"}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {followErr ? <p className="notice">{followErr}</p> : null}

          <form
            className="followup-form"
            onSubmit={(e) => {
              e.preventDefault();
              ask();
            }}
          >
            <input
              className="followup-input"
              value={followQ}
              onChange={(e) => setFollowQ(e.target.value)}
              placeholder="例如:这事大概什么时候有结果?我该怎么做?"
              disabled={asking}
              aria-label="追问内容"
            />
            <button className="btn" type="submit" disabled={asking || !followQ.trim()}>
              {asking ? "追问中…" : "追问"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
