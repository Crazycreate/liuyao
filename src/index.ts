import { divineDate, type DateParts } from "./date.js";
import { valueToLine } from "./cast.js";
import { hexByBits } from "./hexagrams.js";
import { buildGua, findFushen } from "./najia.js";
import type { GuaState, Reading } from "./types.js";

export interface CastReadingInput {
  question: string;
  date: DateParts;
  /** 6 个爻值(6/7/8/9),初→上 */
  coinValues: number[];
}

/**
 * 一次完整起卦:爻值 + 占时 → 本卦/变卦/装卦/伏神。
 * 纯确定性计算(同样的爻值与时间 → 同样的卦),不含任何随机或网络。
 */
export function castReading(input: CastReadingInput): Reading {
  const { question, coinValues } = input;
  if (coinValues.length !== 6) {
    throw new Error(`需要 6 个爻值(初→上),收到 ${coinValues.length} 个`);
  }
  const parsed = coinValues.map(valueToLine);

  let benBits = 0;
  let movingMask = 0;
  let bianBits = 0;
  parsed.forEach((p, i) => {
    if (p.yang) benBits |= 1 << i;
    if (p.moving) movingMask |= 1 << i;
    const changedYang = p.moving ? !p.yang : p.yang;
    if (changedYang) bianBits |= 1 << i;
  });

  const date = divineDate(input.date);
  const benHex = hexByBits(benBits);
  const ben = buildGua({
    hex: benHex,
    bits: benBits,
    palaceElement: benHex.palaceElement,
    movingMask,
    shiYao: benHex.shiYao,
    yingYao: benHex.yingYao,
    dayGan: date.dayGan,
    date,
  });

  const movingPositions = parsed
    .map((p, i) => (p.moving ? i + 1 : 0))
    .filter((x) => x > 0);

  let bian: GuaState | null = null;
  if (movingMask !== 0) {
    const bianHex = hexByBits(bianBits);
    bian = buildGua({
      hex: bianHex,
      bits: bianBits,
      // 变卦各爻六亲仍以本卦之宫五行论(六爻通例)
      palaceElement: benHex.palaceElement,
      movingMask: 0,
      shiYao: 0,
      yingYao: 0,
      dayGan: date.dayGan,
      date,
    });
  }

  const fushen = findFushen(benHex, ben.lines);

  return { question, date, coinValues, ben, bian, movingPositions, fushen };
}

export type { DateParts } from "./date.js";
export * from "./types.js";
export { divineDate } from "./date.js";
export { castCoins, castOneLine, valueToLine } from "./cast.js";
export { renderReading } from "./render.js";
export { allHexagrams, hexByBits } from "./hexagrams.js";
