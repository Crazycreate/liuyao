import type { Element, Relative } from "./types.js";

/** 地支 → 五行 */
export const ZHI_ELEMENT: Record<string, Element> = {
  子: "水", 亥: "水",
  寅: "木", 卯: "木",
  巳: "火", 午: "火",
  申: "金", 酉: "金",
  辰: "土", 戌: "土", 丑: "土", 未: "土",
};

/** 五行相生:key 生 value(金生水…) */
export const GENERATES: Record<Element, Element> = {
  金: "水", 水: "木", 木: "火", 火: "土", 土: "金",
};

/** 五行相克:key 克 value(金克木…) */
export const CONTROLS: Record<Element, Element> = {
  金: "木", 木: "土", 土: "水", 水: "火", 火: "金",
};

/**
 * 六亲:以卦宫五行为「我」,看某爻五行与「我」的生克关系。
 * 生我者父母、我生者子孙、克我者官鬼、我克者妻财、同我者兄弟。
 */
export function relativeOf(palace: Element, line: Element): Relative {
  if (line === palace) return "兄弟";
  if (GENERATES[line] === palace) return "父母"; // 生我
  if (GENERATES[palace] === line) return "子孙"; // 我生
  if (CONTROLS[palace] === line) return "妻财"; // 我克
  if (CONTROLS[line] === palace) return "官鬼"; // 克我
  throw new Error(`无法判定六亲: 宫=${palace} 爻=${line}`);
}

/** 六冲(地支相冲) */
export const CHONG: Record<string, string> = {
  子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅",
  卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳",
};

/** 六合(地支相合) */
export const HE: Record<string, string> = {
  子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯",
  辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午",
};
