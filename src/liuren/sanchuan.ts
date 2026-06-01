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

export interface SanChuan {
  chu: string;
  zhong: string;
  mo: string;
  /** 取用法(课式名) */
  method: string;
  /** 不确定/待校注记 */
  note?: string;
}

/** 涉害:best-effort——取涉害深者,深浅同则孟>仲>季。⚠ 此法流派差异大,需课例校验。 */
function sheHai(pool: string[], tianpan: string[]): string {
  function depth(s: string): number {
    const home = zhiIndex(s);
    const cur = tianpan.indexOf(s); // s 当前所乘地盘位
    let cnt = 0;
    let p = cur;
    for (let step = 0; step < 12; step++) {
      if (p === home) break;
      if (zhiControls(ZHI[p]!, s)) cnt++; // 途经地盘克我者计一害
      p = (p - 1 + 12) % 12; // 逆行归家
    }
    return cnt;
  }
  let best = pool[0]!;
  let bestD = depth(best);
  for (const s of pool.slice(1)) {
    const d = depth(s);
    if (d > bestD) {
      best = s;
      bestD = d;
    }
  }
  // 深浅相同的,取孟>仲>季
  const tied = pool.filter((s) => depth(s) === bestD);
  if (tied.length > 1) {
    const meng = tied.find((s) => MENG.has(s));
    const zhong = tied.find((s) => ZHONG.has(s));
    best = meng ?? zhong ?? tied[0]!;
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
        chu = sheHai(bi.length ? bi : uniq, tianpan);
        method = "涉害";
        note = "涉害取用流派差异大,需课例校验";
      }
    }
    const { zhong, mo } = chain(tianpan, chu);
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
