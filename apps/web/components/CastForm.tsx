"use client";

import { useState } from "react";
import { CoinShaker } from "@/components/CoinShaker";

const VALUE_OPTIONS = [
  { v: 7, label: "少阳 ▬（静）" },
  { v: 8, label: "少阴 ▬▬（静）" },
  { v: 9, label: "老阳 ○（阳动）" },
  { v: 6, label: "老阴 ×（阴动）" },
];

type Mode = "coin" | "auto" | "manual";

export interface CastSubmit {
  question: string;
  coinValues?: number[];
}

export function CastForm({
  busy,
  onCast,
}: {
  busy: boolean;
  onCast: (s: CastSubmit) => void;
}) {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<Mode>("coin");
  const [manual, setManual] = useState<number[]>([7, 7, 7, 7, 7, 7]);

  const pos = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];

  function submit(coinValues?: number[]) {
    onCast({ question: question.trim(), coinValues });
  }

  return (
    <div className="card">
      <label className="fld" htmlFor="q">
        所问之事（一事一占,问得越具体越准）
      </label>
      <textarea
        id="q"
        className="q-input"
        placeholder="例:这次面试能成吗 / 丢的钱包能找回吗 / 这笔生意做得做不得"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={2}
      />

      <div className="modes" role="group" aria-label="起卦方式">
        <button type="button" className="mode-btn" aria-pressed={mode === "coin"} onClick={() => setMode("coin")}>
          摇钱币（逐爻）
        </button>
        <button type="button" className="mode-btn" aria-pressed={mode === "auto"} onClick={() => setMode("auto")}>
          一键摇卦
        </button>
        <button type="button" className="mode-btn" aria-pressed={mode === "manual"} onClick={() => setMode("manual")}>
          手动报卦
        </button>
      </div>

      {mode === "coin" ? (
        <CoinShaker disabled={busy} onComplete={(vals) => submit(vals)} />
      ) : null}

      {mode === "manual" ? (
        <div className="manual-guide">
          <p className="mg-title">自己摇三枚硬币 · 把心念注进去</p>
          <ol>
            <li>
              取<b>三枚相同</b>的硬币,净手静心,心里默念所问之事——诚心则灵,把念头沉进去。
            </li>
            <li>
              先约定阴阳:任选一面为「阳」、另一面为「阴」(例如<b>以"字"为阳、另一面为阴</b>都可),
              <b>选定后六摇之中不要更改</b>。
            </li>
            <li>
              双手合扣摇匀、摊开,记下三枚的阴阳:
              <span className="mg-map">
                三阳 → 老阳 9 ○动 · 两阳一阴 → 少阳 7 · 一阳两阴 → 少阴 8 · 三阴 → 老阴 6 ×动
              </span>
            </li>
            <li>
              共摇<b>六次</b>,<b>从初爻摇到上爻</b>(第一摇为初爻),在下面依次选定即可。
            </li>
          </ol>
        </div>
      ) : null}

      {mode === "manual" ? (
        <div className="manual">
          {manual.map((v, i) => (
            <div className="manual-row" key={i}>
              <span>{pos[i]}</span>
              <select
                value={v}
                onChange={(e) => {
                  const next = [...manual];
                  next[i] = Number(e.target.value);
                  setManual(next);
                }}
              >
                {VALUE_OPTIONS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ) : null}

      {mode !== "coin" ? (
        <div className="actions">
          <button className="btn" onClick={() => submit(mode === "manual" ? manual : undefined)} disabled={busy}>
            {busy ? "起卦中…" : "起 卦"}
          </button>
          <span className="hint">
            {mode === "auto" ? "心诚则灵,默念所问,点击起卦。" : "初爻在下、上爻在上,依次选定。"}
          </span>
        </div>
      ) : null}
    </div>
  );
}
