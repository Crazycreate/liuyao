"use client";

import { useEffect, useRef, useState } from "react";

const POS = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];
type Face = "背" | "字"; // 背=阳(值3),字=阴(值2)

function randFace(): Face {
  return Math.random() < 0.5 ? "背" : "字";
}

/** 爻值 → 文字说明 */
function valueLabel(v: number): string {
  return { 6: "老阴 ×（动）", 7: "少阳", 8: "少阴", 9: "老阳 ○（动）" }[v] ?? "";
}
function valueMark(v: number): { yang: boolean; moving: boolean } {
  return { yang: v === 7 || v === 9, moving: v === 6 || v === 9 };
}

/**
 * 电子摇钱币:逐爻摇卦。点"开始摇"三钱翻飞,点"停"落定一爻,共六次。
 * 满六爻后回调 onComplete(coinValues)。
 */
export function CoinShaker({
  disabled,
  onComplete,
}: {
  disabled?: boolean;
  onComplete: (values: number[]) => void;
}) {
  const [values, setValues] = useState<number[]>([]);
  const [faces, setFaces] = useState<Face[]>(["字", "字", "字"]);
  const [shaking, setShaking] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const firedRef = useRef(false);

  const throwIdx = values.length; // 当前要摇第几爻(0..5)
  const done = throwIdx >= 6;

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  function startShake() {
    if (shaking || done || disabled) return;
    setShaking(true);
    timer.current = setInterval(() => {
      setFaces([randFace(), randFace(), randFace()]);
    }, 80);
  }

  function stopShake() {
    if (!shaking) return;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    const settled: Face[] = [randFace(), randFace(), randFace()];
    setFaces(settled);
    setShaking(false);
    const backs = settled.filter((f) => f === "背").length;
    const value = 6 + backs; // 6+背数
    const next = [...values, value];
    setValues(next);
    if (next.length === 6 && !firedRef.current) {
      firedRef.current = true;
      setTimeout(() => onComplete(next), 450);
    }
  }

  function reset() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    firedRef.current = false;
    setShaking(false);
    setValues([]);
    setFaces(["字", "字", "字"]);
  }

  return (
    <div className="shaker">
      <div className="coins" aria-hidden>
        {faces.map((f, i) => (
          <div key={i} className={`coin ${f === "背" ? "bei" : "zi"}${shaking ? " shaking" : ""}`}>
            <span>{f}</span>
          </div>
        ))}
      </div>

      <div className="shaker-status">
        {done ? (
          <span>
            六爻已成 · 起卦中…
          </span>
        ) : (
          <span>
            正在摇 <b>{POS[throwIdx]}</b> · 第 {throwIdx + 1} / 6 爻
          </span>
        )}
        <span className="legend">背=阳 字=阴 · 三背老阳○ 三字老阴×</span>
      </div>

      <div className="shaker-actions">
        {!done ? (
          shaking ? (
            <button type="button" className="btn" onClick={stopShake}>
              停 · 投
            </button>
          ) : (
            <button type="button" className="btn" onClick={startShake} disabled={disabled}>
              开始摇{throwIdx > 0 ? `第${POS[throwIdx]}` : ""}
            </button>
          )
        ) : null}
        {values.length > 0 ? (
          <button type="button" className="btn-ghost btn" onClick={reset} disabled={disabled && !done}>
            重新摇
          </button>
        ) : null}
      </div>

      {values.length > 0 ? (
        <div className="throw-list">
          {/* 上爻在上 */}
          {[...values]
            .map((v, i) => ({ v, pos: i }))
            .reverse()
            .map(({ v, pos }) => {
              const m = valueMark(v);
              return (
                <div className="throw-row" key={pos}>
                  <span className="tp">{POS[pos]}</span>
                  <span className={`mini ${m.yang ? "yang" : "yin"}`}>
                    <i />
                    {!m.yang ? <i /> : null}
                  </span>
                  <span className="tv">
                    {m.moving ? (m.yang ? "○" : "×") : ""} {valueLabel(v)}
                  </span>
                </div>
              );
            })}
        </div>
      ) : null}
    </div>
  );
}
