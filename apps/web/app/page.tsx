"use client";

import { useEffect, useState } from "react";
import type { Reading, LiurenCourse } from "liuyao";
import { CastForm, type CastSubmit } from "@/components/CastForm";
import { HexBoard } from "@/components/HexBoard";
import { LiurenBoard } from "@/components/LiurenBoard";
import { CrossReading, type CrossInput } from "@/components/CrossReading";
import { SettingsPanel, loadAi, DEFAULT_AI, type AiSettings } from "@/components/SettingsPanel";

/** 客户端本地时间 → 'YYYY-MM-DDTHH:mm'(避免服务端时区误差,占时以用户本地为准)。 */
function localNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

interface Result {
  reading: Reading;
  liuren: LiurenCourse;
  input: CrossInput;
}

export default function Page() {
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ai, setAi] = useState<AiSettings>(DEFAULT_AI);

  // 客户端挂载后从 localStorage 读 AI 设置(避免 SSR 不一致)
  useEffect(() => {
    setAi(loadAi());
  }, []);

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
      const data = (await res.json()) as {
        reading?: Reading;
        liuren?: LiurenCourse;
        coinValues?: number[];
        error?: string;
      };
      if (!res.ok || !data.reading || !data.liuren || !data.coinValues) {
        throw new Error(data.error ?? "起卦失败");
      }
      setResult({
        reading: data.reading,
        liuren: data.liuren,
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
          <span>卜</span>
        </div>
        <div className="title">
          <h1>六爻 × 六壬</h1>
          <p>同一心念时刻,双盘互证 · 排盘要算,断卦才用 AI</p>
        </div>
      </div>
      <div className="rule" />

      <CastForm busy={busy} onCast={onCast} />

      <SettingsPanel value={ai} onChange={setAi} />

      {error ? <p className="notice" style={{ marginTop: "1rem" }}>{error}</p> : null}

      {result ? (
        <div className="cross-flow">
          {/* 汇流·并置带:两套体系同源,准备交叉验证 */}
          <div className="flow-systems">
            <div className="sys sys-a">
              <span className="sys-tag">六爻</span>
              <span className="sys-sub">心念抽样 · 因人而异</span>
            </div>
            <div className="flow-x" aria-hidden>⇄</div>
            <div className="sys sys-b">
              <span className="sys-tag">六壬</span>
              <span className="sys-sub">客观天时 · 同刻同课</span>
            </div>
            <div className="flow-moment">同 一 心 念 时 刻 · 两 盘 同 源</div>
          </div>

          <section className="board-wrap">
            <h3 className="board-label is-a"><span className="lbl-sys">六爻</span>本卦 · 变卦</h3>
            <HexBoard reading={result.reading} />
          </section>

          <section className="board-wrap">
            <h3 className="board-label is-b"><span className="lbl-sys">六壬</span>四课 · 三传 · 天地盘</h3>
            <LiurenBoard course={result.liuren} />
          </section>

          {/* 汇流箭头:两盘 → 交叉验证 */}
          <div className="flow-funnel" aria-hidden>
            <span className="ff-a" />
            <span className="ff-b" />
          </div>

          <CrossReading input={result.input} ai={ai} />
        </div>
      ) : null}

      <p className="footer">
        客观天时(六壬) × 心念抽样(六爻),一致处可信、分歧处存疑。本工具仅供传统文化学习与自我参考,
        占断为概率性参考、非决定论,决策请以自身判断为准。
      </p>
    </main>
  );
}
