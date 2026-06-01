import type { Element } from "./types.js";

/**
 * 八经卦。三爻自下而上,二进制 bit0=初爻、bit1=二爻、bit2=三爻,1=阳、0=阴。
 * 数组下标即 value(0..7),便于 bits↔卦 互转。
 */
export interface Trigram {
  name: string; // 乾兑离震巽坎艮坤
  symbol: string;
  value: number; // 0..7,bit0=底爻
  element: Element;
  nature: string; // 天泽火雷风水山地
}

export const TRIGRAMS: Trigram[] = [
  { name: "坤", symbol: "☷", value: 0, element: "土", nature: "地" }, // 000
  { name: "震", symbol: "☳", value: 1, element: "木", nature: "雷" }, // 001
  { name: "坎", symbol: "☵", value: 2, element: "水", nature: "水" }, // 010
  { name: "兑", symbol: "☱", value: 3, element: "金", nature: "泽" }, // 011
  { name: "艮", symbol: "☶", value: 4, element: "土", nature: "山" }, // 100
  { name: "离", symbol: "☲", value: 5, element: "火", nature: "火" }, // 101
  { name: "巽", symbol: "☴", value: 6, element: "木", nature: "风" }, // 110
  { name: "乾", symbol: "☰", value: 7, element: "金", nature: "天" }, // 111
];

export function trigramByValue(v: number): Trigram {
  const t = TRIGRAMS[v];
  if (!t) throw new Error(`非法经卦 value=${v}`);
  return t;
}

export function trigramByName(name: string): Trigram {
  const t = TRIGRAMS.find((x) => x.name === name);
  if (!t) throw new Error(`未知经卦 ${name}`);
  return t;
}

/** 纳甲:每卦的天干(下卦/上卦)+ 地支(作下卦三爻 / 作上卦三爻,均自下而上)。 */
interface Najia {
  ganLower: string;
  ganUpper: string;
  zhiLower: [string, string, string];
  zhiUpper: [string, string, string];
}

export const NAJIA: Record<string, Najia> = {
  乾: { ganLower: "甲", ganUpper: "壬", zhiLower: ["子", "寅", "辰"], zhiUpper: ["午", "申", "戌"] },
  坤: { ganLower: "乙", ganUpper: "癸", zhiLower: ["未", "巳", "卯"], zhiUpper: ["丑", "亥", "酉"] },
  震: { ganLower: "庚", ganUpper: "庚", zhiLower: ["子", "寅", "辰"], zhiUpper: ["午", "申", "戌"] },
  巽: { ganLower: "辛", ganUpper: "辛", zhiLower: ["丑", "亥", "酉"], zhiUpper: ["未", "巳", "卯"] },
  坎: { ganLower: "戊", ganUpper: "戊", zhiLower: ["寅", "辰", "午"], zhiUpper: ["申", "戌", "子"] },
  离: { ganLower: "己", ganUpper: "己", zhiLower: ["卯", "丑", "亥"], zhiUpper: ["酉", "未", "巳"] },
  艮: { ganLower: "丙", ganUpper: "丙", zhiLower: ["辰", "午", "申"], zhiUpper: ["戌", "子", "寅"] },
  兑: { ganLower: "丁", ganUpper: "丁", zhiLower: ["巳", "卯", "丑"], zhiUpper: ["亥", "酉", "未"] },
};
