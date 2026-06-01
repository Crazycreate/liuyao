import type { Reading, Line } from "liuyao";

const POS = ["初", "二", "三", "四", "五", "上"];

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
  const bar = line.yang ? (
    <div className="bar yang">
      <div className="seg" />
    </div>
  ) : (
    <div className="bar yin">
      <div className="seg" />
      <div className="seg" />
    </div>
  );
  return (
    <>
      <div className={`yao${line.moving ? " moving" : ""}`}>
        <div className="spirit">{line.spirit}</div>
        <div className="liuqin">
          <span className="rel">{line.relative}</span>
          {line.gan}
          <span className={`e-${line.element}`}>
            {line.zhi}
            {line.element}
          </span>
        </div>
        {bar}
        <div className="movemark">{line.moving ? (line.yang ? "○" : "×") : ""}</div>
        <div className={`sy${line.isShi ? " shi" : ""}${line.isYing ? " ying" : ""}`}>
          {line.isShi ? "世" : line.isYing ? "应" : ""}
        </div>
        {bian && line.moving ? (
          <div className="changed">
            {bian.relative}
            {bian.gan}
            <span className={`e-${bian.element}`}>
              {bian.zhi}
              {bian.element}
            </span>
          </div>
        ) : null}
        <Tags line={line} />
      </div>
    </>
  );
}

export function HexBoard({ reading }: { reading: Reading }) {
  const { ben, bian, date, movingPositions, fushen } = reading;
  // 上爻在上,初爻在下
  const order = [5, 4, 3, 2, 1, 0];
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

      <div className="lines">
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
