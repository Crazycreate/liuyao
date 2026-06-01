import { Solar } from "lunar-javascript";
import type { DateParts } from "../date.js";
import { ZHI_ELEMENT } from "../wuxing.js";

/** 十二地支(子=0 … 亥=11) */
export const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
export function zhiIndex(z: string): number {
  const i = ZHI.indexOf(z);
  if (i < 0) throw new Error(`非法地支 ${z}`);
  return i;
}

/** 地支阴阳:子寅辰午申戌为阳 */
const YANG_ZHI = new Set(["子", "寅", "辰", "午", "申", "戌"]);
export function isYangZhi(z: string): boolean {
  return YANG_ZHI.has(z);
}
/** 天干阴阳:甲丙戊庚壬为阳 */
export function isYangGan(g: string): boolean {
  return "甲丙戊庚壬".includes(g);
}

/** 日干五行 */
export const GAN_ELEMENT: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};

/** 日干寄宫(地支) */
export const JIGONG: Record<string, string> = {
  甲: "寅", 乙: "辰", 丙: "巳", 丁: "未", 戊: "巳",
  己: "未", 庚: "申", 辛: "戌", 壬: "亥", 癸: "丑",
};

/** 月将名(将神) */
export const YUEJIANG_NAME: Record<string, string> = {
  子: "神后", 丑: "大吉", 寅: "功曹", 卯: "太冲", 辰: "天罡", 巳: "太乙",
  午: "胜光", 未: "小吉", 申: "传送", 酉: "从魁", 戌: "河魁", 亥: "登明",
};

/** 中气 → 月将地支(太阳过宫,随中气换将) */
const ZHONGQI_YUEJIANG: Record<string, string> = {
  雨水: "亥", 春分: "戌", 谷雨: "酉", 小满: "申", 夏至: "未", 大暑: "午",
  处暑: "巳", 秋分: "辰", 霜降: "卯", 小雪: "寅", 冬至: "丑", 大寒: "子",
};

export interface Moment {
  solar: string;
  dayGan: string;
  dayZhi: string;
  shiZhi: string; // 占时支
  yuejiang: string; // 月将地支
  monthZhi: string; // 月建(节气月)
}

/** 由公历时刻取六壬所需干支:日干支、占时支、月将。 */
export function buildMoment(parts: DateParts): Moment {
  const { year, month, day, hour, minute } = parts;
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();

  // 月将:找当下之前最近的"中气"
  const table = lunar.getJieQiTable();
  const jd = solar.getJulianDay();
  let best: string | null = null;
  let bestJd = -Infinity;
  for (const name of Object.keys(table)) {
    const yj = ZHONGQI_YUEJIANG[name];
    if (!yj) continue;
    const sjd = table[name]!.getJulianDay();
    if (sjd <= jd && sjd > bestJd) {
      bestJd = sjd;
      best = yj;
    }
  }
  if (!best) throw new Error("无法确定月将(节气表缺中气)");

  return {
    solar: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    dayGan: ec.getDayGan(),
    dayZhi: ec.getDayZhi(),
    shiZhi: ec.getTimeZhi(),
    yuejiang: best,
    monthZhi: ec.getMonthZhi(),
  };
}

/**
 * 天地盘:月将加时。地盘十二支固定,天盘 = 月将压在占时支上、余支顺布。
 * 返回 tianpan[i] = 地盘第 i 位(支 ZHI[i])之上的天盘神。
 */
export function buildPlate(yuejiang: string, shiZhi: string): { tianpan: string[]; offset: number } {
  const offset = (zhiIndex(yuejiang) - zhiIndex(shiZhi) + 12) % 12;
  const tianpan = ZHI.map((_, i) => ZHI[(i + offset) % 12]!);
  return { tianpan, offset };
}

/** 取某地盘支之上的天盘神(上神) */
export function shangShen(tianpan: string[], diZhi: string): string {
  return tianpan[zhiIndex(diZhi)]!;
}

export interface Ke {
  /** 第几课 1..4 */
  index: number;
  xia: string; // 下神
  shang: string; // 上神
  /** 关系:上克下 / 下贼上 / 无 */
  relation: "上克下" | "下贼上" | "无";
}

const CTL: Record<string, string> = { 金: "木", 木: "土", 土: "水", 水: "火", 火: "金" };
/** 按五行判课之上下克:用元素而非地支,使一课能用日干五行。 */
function relationByElement(shangEl: string, xiaEl: string): Ke["relation"] {
  if (CTL[xiaEl] === shangEl) return "下贼上"; // 下克上
  if (CTL[shangEl] === xiaEl) return "上克下"; // 上克下
  return "无";
}

/**
 * 四课:
 *  一课 下=日干(取干五行),上=干寄宫之上神;二课 下=一课上神,上=其上神;
 *  三课 下=日支,            上=其上神;四课 下=三课上神,上=其上神。
 * ⚠ 一课「下神」为日干本身(五行按天干),不是寄宫地支——决定贼克取用,易错。
 */
export function buildSiKe(tianpan: string[], dayGan: string, dayZhi: string): Ke[] {
  const ji = JIGONG[dayGan]!;
  const k1Shang = shangShen(tianpan, ji);
  const k2Shang = shangShen(tianpan, k1Shang);
  const k3Shang = shangShen(tianpan, dayZhi);
  const k4Shang = shangShen(tianpan, k3Shang);
  return [
    // 一课:下神显示为日干,克关系按日干五行
    { index: 1, xia: dayGan, shang: k1Shang, relation: relationByElement(ZHI_ELEMENT[k1Shang]!, GAN_ELEMENT[dayGan]!) },
    { index: 2, xia: k1Shang, shang: k2Shang, relation: relationByElement(ZHI_ELEMENT[k2Shang]!, ZHI_ELEMENT[k1Shang]!) },
    { index: 3, xia: dayZhi, shang: k3Shang, relation: relationByElement(ZHI_ELEMENT[k3Shang]!, ZHI_ELEMENT[dayZhi]!) },
    { index: 4, xia: k3Shang, shang: k4Shang, relation: relationByElement(ZHI_ELEMENT[k4Shang]!, ZHI_ELEMENT[k3Shang]!) },
  ];
}
