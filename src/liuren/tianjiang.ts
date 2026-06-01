import { ZHI, zhiIndex } from "./core.js";

/** 十二天将固定顺序(贵→…→后)。与《大六壬》及 kinliuren 一致。 */
export const GENERALS = [
  "贵人", "螣蛇", "朱雀", "六合", "勾陈", "青龙",
  "天空", "白虎", "太常", "玄武", "太阴", "天后",
];

/**
 * 天乙贵人(昼贵/夜贵),按日干分组(主流歌诀版,= kinliuren 默认 option 0)。
 * 值为 [昼贵, 夜贵] 地支。
 */
const GUIREN: Record<string, [string, string]> = {
  甲: ["丑", "未"], 戊: ["丑", "未"], 庚: ["丑", "未"],
  乙: ["子", "申"], 己: ["子", "申"],
  丙: ["亥", "酉"], 丁: ["亥", "酉"],
  壬: ["巳", "卯"], 癸: ["巳", "卯"],
  辛: ["午", "寅"],
};

/** 昼:占时支在 卯辰巳午未申;夜:酉戌亥子丑寅 */
const DAY_ZHI = new Set(["卯", "辰", "巳", "午", "未", "申"]);
/** 顺布半:贵人(天盘)所乘地盘在 亥子丑寅卯辰 → 顺布;巳午未申酉戌 → 逆布 */
const SHUN_HALF = new Set(["亥", "子", "丑", "寅", "卯", "辰"]);

export interface Tianjiang {
  /** 天盘地支 → 天将 */
  byZhi: Record<string, string>;
  noble: string; // 贵人地支
  isDay: boolean; // 昼贵?
  shun: boolean; // 顺布?
}

/**
 * 排十二天将:定贵人(日干+昼夜)→ 看贵人所乘地盘定顺逆 → 以贵人为首沿天盘支布将。
 * 天将随天盘支走,故按天盘支建表;四课上神/三传皆为天盘支,可直接查。
 */
export function buildTianjiang(tianpan: string[], dayGan: string, shiZhi: string): Tianjiang {
  const pair = GUIREN[dayGan];
  if (!pair) throw new Error(`未知日干 ${dayGan}`);
  const isDay = DAY_ZHI.has(shiZhi);
  const noble = isDay ? pair[0] : pair[1];

  // 贵人(天盘支)所乘的地盘:天盘[地盘i]==noble 的那个地盘 ZHI[i]
  const nobleDiZhi = ZHI[tianpan.indexOf(noble)]!;
  const shun = SHUN_HALF.has(nobleDiZhi);

  const nobleIdx = zhiIndex(noble);
  const byZhi: Record<string, string> = {};
  for (let k = 0; k < 12; k++) {
    const idx = (nobleIdx + (shun ? k : -k) + 24) % 12;
    byZhi[ZHI[idx]!] = GENERALS[k]!;
  }
  return { byZhi, noble, isDay, shun };
}
