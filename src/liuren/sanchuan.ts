import { ZHI, zhiIndex, isYangGan, isYangZhi, GAN_ELEMENT, shangShen, type Ke } from "./core.js";
import { ZHI_ELEMENT } from "../wuxing.js";

const CTL: Record<string, string> = { 金: "木", 木: "土", 土: "水", 水: "火", 火: "金" };
function elemControls(a: string, b: string): boolean {
  return CTL[a] === b;
}
function zhiControls(a: string, b: string): boolean {
  return elemControls(ZHI_ELEMENT[a]!, ZHI_ELEMENT[b]!);
}

/** 三刑(辰午酉亥自刑) */
const XING: Record<string, string> = {
  子: "卯", 卯: "子", 寅: "巳", 巳: "申", 申: "寅", 丑: "戌", 戌: "未", 未: "丑",
  辰: "辰", 午: "午", 酉: "酉", 亥: "亥",
};
/** 驿马(按日支三合局) */
const YIMA: Record<string, string> = {
  申: "寅", 子: "寅", 辰: "寅",
  寅: "申", 午: "申", 戌: "申",
  巳: "亥", 酉: "亥", 丑: "亥",
  亥: "巳", 卯: "巳", 未: "巳",
};

const MENG = new Set(["寅", "申", "巳", "亥"]); // 四孟
const ZHONG = new Set(["子", "午", "卯", "酉"]); // 四仲

/** 地盘各宫所寄天干(子午卯酉无寄) */
const JIGAN_OF: Record<string, string[]> = {
  寅: ["甲"], 辰: ["乙"], 巳: ["丙", "戊"], 未: ["丁", "己"],
  申: ["庚"], 戌: ["辛"], 亥: ["壬"], 丑: ["癸"],
};
const GAN_E: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};

export interface SanChuan {
  chu: string;
  zhong: string;
  mo: string;
  /** 取用法(课式名) */
  method: string;
  /** 不确定/待校注记 */
  note?: string;
}

/**
 * 涉害取用(定本算法,已对古籍课例「甲辰日戌加寅 → 子」校验):
 * 各候选上神自天盘所临宫位「顺行」归地盘本家,沿途数「地盘支神及其所寄天干」克上神之数(一重),
 * 涉害深(克多)者发用;深浅相等取四孟(见机)、无孟取四仲(察微);
 * 孟仲俱无,柔辰刚日:阳日取干上神、阴日取支上神。
 */
function sheHaiDepth(s: string, tianpan: string[]): number {
  const home = zhiIndex(s);
  let p = tianpan.indexOf(s); // 上神所乘地盘位
  let cnt = 0;
  for (let step = 0; step < 12; step++) {
    if (p === home) break;
    const z = ZHI[p]!;
    if (zhiControls(z, s)) cnt++; // 地盘支克上神
    for (const g of JIGAN_OF[z] ?? []) {
      if (CTL[GAN_E[g]!] === ZHI_ELEMENT[s]!) cnt++; // 所寄天干克上神
    }
    p = (p + 1) % 12; // 顺行归家
  }
  return cnt;
}
function sheHai(
  pool: string[],
  tianpan: string[],
  dayGan: string,
  ganShang: string,
  zhiShang: string,
): string {
  let best = pool[0]!;
  let bestD = sheHaiDepth(best, tianpan);
  for (const s of pool.slice(1)) {
    const d = sheHaiDepth(s, tianpan);
    if (d > bestD) {
      best = s;
      bestD = d;
    }
  }
  const tied = pool.filter((s) => sheHaiDepth(s, tianpan) === bestD);
  if (tied.length > 1) {
    const meng = tied.find((s) => MENG.has(s));
    if (meng) return meng;
    const zhong = tied.find((s) => ZHONG.has(s));
    if (zhong) return zhong;
    return isYangGan(dayGan) ? ganShang : zhiShang; // 柔辰刚日
  }
  return best;
}

function chain(tianpan: string[], chu: string): { zhong: string; mo: string } {
  const zhong = shangShen(tianpan, chu);
  const mo = shangShen(tianpan, zhong);
  return { zhong, mo };
}

/**
 * 三传发用(九宗门)。结构层(天地盘/四课/中末链)可靠;
 * ⚠ 涉害、别责、八专、伏吟/反吟、昴星 的取用与中末细则流派多、需课例校验(已在 note 标注)。
 */
export function buildSanChuan(
  sike: Ke[],
  tianpan: string[],
  offset: number,
  dayGan: string,
  dayZhi: string,
): SanChuan {
  const fuyin = offset === 0;
  const fanyin = offset === 6;

  const zei = sike.filter((k) => k.relation === "下贼上");
  const ke = sike.filter((k) => k.relation === "上克下");
  const hasKe = zei.length + ke.length > 0;

  const ganShang = sike[0]!.shang; // 干上神
  const zhiShang = sike[2]!.shang; // 支上神

  // ── 伏吟 ──
  if (fuyin && !hasKe) {
    const chu = isYangGan(dayGan) ? ganShang : zhiShang;
    let zhong = XING[chu]!;
    if (zhong === chu) zhong = zhiShang; // 自刑则取支上神
    let mo = XING[zhong]!;
    if (mo === zhong) mo = ganShang;
    return { chu, zhong, mo, method: "伏吟", note: "伏吟用刑,中末细则需课例校验" };
  }
  // ── 反吟(无克:井栏,用驿马) ──
  if (fanyin && !hasKe) {
    const chu = YIMA[dayZhi]!;
    return { chu, zhong: zhiShang, mo: ganShang, method: "反吟(井栏)", note: "反吟无克用驿马,需课例校验" };
  }

  // ── 贼克 / 比用 / 涉害 ──
  if (hasKe) {
    const cand = zei.length ? zei : ke;
    const base = zei.length ? "重审(贼克)" : "元首(贼克)";
    const uniq = [...new Set(cand.map((k) => k.shang))];
    let chu: string;
    let method: string;
    let note: string | undefined;
    if (uniq.length === 1) {
      chu = uniq[0]!;
      method = base;
    } else {
      const bi = uniq.filter((s) => isYangGan(dayGan) === isYangZhi(s));
      if (bi.length === 1) {
        chu = bi[0]!;
        method = "比用";
      } else {
        chu = sheHai(bi.length ? bi : uniq, tianpan, dayGan, ganShang, zhiShang);
        method = "涉害";
      }
    }
    // 伏吟(天地盘同)即便有克定初传,中末仍以刑递推;否则常规上神链
    let zhong: string;
    let mo: string;
    if (fuyin) {
      zhong = XING[chu]! === chu ? zhiShang : XING[chu]!;
      mo = XING[zhong]! === zhong ? ganShang : XING[zhong]!;
    } else {
      ({ zhong, mo } = chain(tianpan, chu));
    }
    return { chu, zhong, mo, method: fuyin ? method + "·伏吟" : fanyin ? method + "·反吟" : method, note };
  }

  // ── 遥克(蒿矢/弹射) ──
  const ganE = GAN_ELEMENT[dayGan]!;
  const shangs = [...new Set(sike.map((k) => k.shang))];
  const haoshi = shangs.filter((s) => elemControls(ZHI_ELEMENT[s]!, ganE)); // 上神克日
  const tanshe = shangs.filter((s) => elemControls(ganE, ZHI_ELEMENT[s]!)); // 日克上神
  if (haoshi.length || tanshe.length) {
    let cand = haoshi.length ? haoshi : tanshe;
    const m = haoshi.length ? "遥克(蒿矢)" : "遥克(弹射)";
    let note: string | undefined;
    if (cand.length > 1) {
      const bi = cand.filter((s) => isYangGan(dayGan) === isYangZhi(s));
      cand = bi.length ? bi : cand;
      if (cand.length > 1) note = "遥克多取,按比用/先后取首,需课例校验";
    }
    const chu = cand[0]!;
    const { zhong, mo } = chain(tianpan, chu);
    return { chu, zhong, mo, method: m, note };
  }

  // ── 昴星(无克无遥克) ──
  const chu = isYangGan(dayGan) ? shangShen(tianpan, "酉") : ZHI[tianpan.indexOf("酉")]!;
  return {
    chu,
    zhong: zhiShang,
    mo: ganShang,
    method: isYangGan(dayGan) ? "昴星(虎视)" : "昴星(冬蛇掩目)",
    note: "昴星中末细则需课例校验",
  };
}
