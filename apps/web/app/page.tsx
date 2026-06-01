"use client";

import { useState } from "react";
import type { Reading } from "liuyao";
import { CastForm, type CastSubmit } from "@/components/CastForm";
import { HexBoard } from "@/components/HexBoard";
import { Interpretation, type InterpretInput } from "@/components/Interpretation";

/** 客户端本地时间 → 'YYYY-MM-DDTHH:mm'(避免服务端时区误差,占时以用户本地为准)。 */
function localNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

interface Result {
  reading: Reading;
  input: InterpretInput;
}

export default function Page() {
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCast(s: CastSubmit) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const date = localNow();
      const res = await fetch("/api/cast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: s.question, coinValues: s.coinValues, date }),
      });
      const data = (await res.json()) as { reading?: Reading; coinValues?: number[]; error?: string };
      if (!res.ok || !data.reading || !data.coinValues) {
        throw new Error(data.error ?? "起卦失败");
      }
      setResult({
        reading: data.reading,
        input: { question: s.question, coinValues: data.coinValues, date },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "起卦失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap">
      <div className="masthead">
        <div className="seal" aria-hidden>
          <span>六爻</span>
        </div>
        <div className="title">
          <h1>六 爻</h1>
          <p>纳甲占卜 · 摇一卦,测一事 · 排卦要算,断卦才用 AI</p>
        </div>
      </div>
      <div className="rule" />

      <CastForm busy={busy} onCast={onCast} />

      {error ? <p className="notice" style={{ marginTop: "1rem" }}>{error}</p> : null}

      {result ? (
        <>
          <div style={{ height: "1.6rem" }} />
          <HexBoard reading={result.reading} />
          <div style={{ height: "1.6rem" }} />
          <Interpretation input={result.input} />
        </>
      ) : null}

      <p className="footer">
        本工具仅供传统文化学习与自我参考,占断为概率性参考,非决定论,决策请以自身判断为准。
      </p>
    </main>
  );
}
