import type { Reading, Line } from "liuyao";

const POS = ["初", "二", "三", "四", "五", "上"];

function Bar({ yang, moving }: { yang: boolean; moving?: boolean }) {
  return yang ? (
    <div className={`bar2 yang${moving ? " mv" : ""}`}>
      <i />
    </div>
  ) : (
    <div className={`bar2 yin${moving ? " mv" : ""}`}>
      <i />
      <i />
    </div>
  );
}

function Qin({ line }: { line: Line }) {
  return (
    <span className="liuqin2">
      <span className="rel">{line.relative}</span>
      {line.gan}
      <span className={`e-${line.element}`}>
        {line.zhi}
        {line.element}
      </span>
    </span>
  );
}

function Tags({ line }: { line: Line }) {
  const f = line.flags;
  const tags: { t: string; warn?: boolean }[] = [];
  if (f.xunKong) tags.push({ t: "旬空", warn: true });
  if (f.yueBreak) tags.push({ t: "月破", warn: true });
  if (f.linRi) tags.push({ t: "临日" });
  else if (f.riChong) tags.push({ t: "日冲", warn: true });
  else if (f.riHe) tags.push({ t: "日合" });
  if (f.linYue) tags.push({ t: "临月" });
  if (!tags.length) return null;
  return (
    <div className="tags">
      {tags.map((x, i) => (
        <span key={i} className={`tag${x.warn ? " warn" : ""}`}>
          {x.t}
        </span>
      ))}
    </div>
  );
}

function YaoRow({ line, bian }: { line: Line; bian: Line | null }) {
  return (
    <div className={`yao2${line.moving ? " moving" : ""}`}>
      <div className="row-main">
        {/* 本卦 */}
        <div className="ben-side">
          <span className="spirit">{line.spirit}</span>
          <Qin line={line} />
          <Bar yang={line.yang} moving={line.moving} />
          <span className="movemark">{line.moving ? (line.yang ? "○" : "×") : ""}</span>
          <span className={`sy${line.isShi ? " shi" : ""}${line.isYing ? " ying" : ""}`}>
            {line.isShi ? "世" : line.isYing ? "应" : ""}
          </span>
        </div>
        {/* 变卦 */}
        {bian ? (
          <>
            <span className="vdiv" />
            <div className="bian-side">
              <Bar yang={bian.yang} moving={line.moving} />
              <Qin line={bian} />
            </div>
          </>
        ) : null}
      </div>
      <Tags line={line} />
    </div>
  );
}

export function HexBoard({ reading }: { reading: Reading }) {
  const { ben, bian, date, movingPositions, fushen } = reading;
  const order = [5, 4, 3, 2, 1, 0]; // 上爻在上,初爻在下

  return (
    <div className="card">
      <div className="board-head">
        <div className="gua-name">
          {ben.name}
          {bian ? (
            <>
              <span className="zhi">之</span>
              <span className="bian">{bian.name}</span>
            </>
          ) : null}
        </div>
        <div className="gua-meta">
          {ben.palace}宫 · {ben.palaceType} ·{" "}
          {movingPositions.length
            ? `${movingPositions.map((p) => POS[p - 1] + "爻").join("、")}动`
            : "六爻安静"}
        </div>
      </div>

      <div className="timeline">
        <span>{date.solar}</span>
        <span>
          <b>{date.yearGanZhi}</b>年 <b>{date.monthGanZhi}</b>月 <b>{date.dayGanZhi}</b>日{" "}
          <b>{date.hourGanZhi}</b>时
        </span>
        <span>
          月建 <b>{date.monthZhi}</b> · 日辰 <b>{date.dayZhi}</b> · 旬空 <b>{date.xunKong.join("")}</b>
        </span>
      </div>

      {bian ? (
        <div className="cols-label">
          <span>本卦 · {ben.name}</span>
          <span>变卦 · {bian.name}</span>
        </div>
      ) : null}

      <div className="lines2">
        {order.map((i) => (
          <YaoRow key={i} line={ben.lines[i]} bian={bian ? bian.lines[i] : null} />
        ))}
      </div>

      {fushen.length ? (
        <div className="fushen">
          <b>伏神</b>
          {fushen
            .map((f) => `${POS[f.pos - 1]}爻下伏 ${f.relative}${f.gan}${f.zhi}${f.element}`)
            .join("；")}
        </div>
      ) : null}
    </div>
  );
}
