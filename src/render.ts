import type { GuaState, Line, Reading } from "./types.js";

const POS_NAMES = ["初", "二", "三", "四", "五", "上"];

function lineBar(l: Line): string {
  const body = l.yang ? "▆▆▆▆▆▆▆" : "▆▆▆ㅤ▆▆▆";
  const moving = l.moving ? (l.yang ? " ○" : " ×") : "";
  return body + moving;
}

function flagTags(l: Line): string {
  const tags: string[] = [];
  if (l.flags.xunKong) tags.push("空");
  if (l.flags.yueBreak) tags.push("月破");
  if (l.flags.linRi) tags.push("临日");
  else if (l.flags.riChong) tags.push("日冲");
  else if (l.flags.riHe) tags.push("日合");
  if (l.flags.linYue) tags.push("临月");
  return tags.length ? `〔${tags.join(" ")}〕` : "";
}

function shiYingTag(l: Line): string {
  if (l.isShi) return "世";
  if (l.isYing) return "应";
  return "　";
}

/** 把一卦的六爻渲染成多行(上爻在上,初爻在下)。 */
function renderGua(gua: GuaState, bian: GuaState | null): string[] {
  const rows: string[] = [];
  for (let pos = 6; pos >= 1; pos--) {
    const l = gua.lines[pos - 1]!;
    const posName = POS_NAMES[pos - 1]!;
    const liuqin = `${l.relative}${l.gan}${l.zhi}${l.element}`;
    const bar = lineBar(l);
    let row = `${l.spirit}  ${posName}爻  ${liuqin}  ${bar}  ${shiYingTag(l)}`;
    if (bian && l.moving) {
      const bl = bian.lines[pos - 1]!;
      row += `  →  ${bl.relative}${bl.gan}${bl.zhi}${bl.element}`;
    }
    const tags = flagTags(l);
    if (tags) row += `  ${tags}`;
    rows.push(row);
  }
  return rows;
}

/** 把整次起卦渲染成可读文本(CLI 展示 + 喂给 AI 的上下文同源)。 */
export function renderReading(reading: Reading): string {
  const { question, date, ben, bian, movingPositions, fushen } = reading;
  const out: string[] = [];

  out.push(`【所问】${question || "(未填写所问之事)"}`);
  out.push(
    `【占时】${date.solar}　${date.yearGanZhi}年 ${date.monthGanZhi}月 ${date.dayGanZhi}日 ${date.hourGanZhi}时`,
  );
  out.push(`【旬空】${date.xunKong.join("")}　【月建】${date.monthZhi}　【日辰】${date.dayZhi}`);
  out.push("");

  const bianName = bian ? `　之　${bian.name}` : "";
  out.push(`【主卦】${ben.name}（${ben.palace}宫·${ben.palaceType}）${bianName}`);
  if (movingPositions.length) {
    out.push(`【动爻】${movingPositions.map((p) => `${POS_NAMES[p - 1]}爻`).join("、")}`);
  } else {
    out.push(`【动爻】无（六爻安静）`);
  }
  out.push("");

  out.push(...renderGua(ben, bian));

  if (fushen.length) {
    out.push("");
    out.push(
      "【伏神】" +
        fushen
          .map((f) => `${POS_NAMES[f.pos - 1]}爻下伏 ${f.relative}${f.gan}${f.zhi}${f.element}`)
          .join("；"),
    );
  }

  return out.join("\n");
}
