import { NAJIA } from "./trigrams.js";
import { hexByBits, palaceBaseHex, type HexInfo } from "./hexagrams.js";
import { ZHI_ELEMENT, relativeOf, CHONG, HE } from "./wuxing.js";
import type { DivineDate, Element, Fushen, GuaState, Line, LineFlags, Relative, Spirit } from "./types.js";

const SPIRITS: Spirit[] = ["青龙", "朱雀", "勾陈", "螣蛇", "白虎", "玄武"];

/** 六神起例:按日干定初爻六神,顺序 青龙→朱雀→勾陈→螣蛇→白虎→玄武。 */
function spiritStartIndex(dayGan: string): number {
  if ("甲乙".includes(dayGan)) return 0;
  if ("丙丁".includes(dayGan)) return 1;
  if (dayGan === "戊") return 2;
  if (dayGan === "己") return 3;
  if ("庚辛".includes(dayGan)) return 4;
  return 5; // 壬癸
}

/** 给某卦的 6 爻装纳甲(干支 + 五行),index0=初爻 … index5=上爻。 */
export function najiaOf(hex: HexInfo): { gan: string; zhi: string; element: Element }[] {
  const lj = NAJIA[hex.lower]!;
  const uj = NAJIA[hex.upper]!;
  const out: { gan: string; zhi: string; element: Element }[] = [];
  for (let i = 0; i < 3; i++) {
    const zhi = lj.zhiLower[i]!;
    out.push({ gan: lj.ganLower, zhi, element: ZHI_ELEMENT[zhi]! });
  }
  for (let i = 0; i < 3; i++) {
    const zhi = uj.zhiUpper[i]!;
    out.push({ gan: uj.ganUpper, zhi, element: ZHI_ELEMENT[zhi]! });
  }
  return out;
}

function lineFlags(zhi: string, date: DivineDate): LineFlags {
  return {
    xunKong: date.xunKong.includes(zhi),
    yueBreak: CHONG[zhi] === date.monthZhi,
    riChong: CHONG[zhi] === date.dayZhi,
    riHe: HE[zhi] === date.dayZhi,
    linRi: zhi === date.dayZhi,
    linYue: zhi === date.monthZhi,
  };
}

/**
 * 组装一个卦的完整六爻。
 * @param hex 卦象
 * @param bits 该卦 6 位二进制(用于阴阳)
 * @param palaceElement 六亲所依据的卦宫五行(变卦也以本卦之宫论六亲)
 * @param movingMask 动爻位掩码(bit0=初爻);仅本卦有意义,变卦传 0
 * @param shi/ying 世应位(变卦不另标世应,传 0)
 * @param dayGan 日干(定六神)
 * @param date 占时(定标注)
 */
export function buildGua(opts: {
  hex: HexInfo;
  bits: number;
  palaceElement: Element;
  movingMask: number;
  shiYao: number;
  yingYao: number;
  dayGan: string;
  date: DivineDate;
}): GuaState {
  const { hex, bits, palaceElement, movingMask, shiYao, yingYao, dayGan, date } = opts;
  const nj = najiaOf(hex);
  const spiritStart = spiritStartIndex(dayGan);
  const lines: Line[] = [];
  for (let pos = 1; pos <= 6; pos++) {
    const idx = pos - 1;
    const yang = ((bits >> idx) & 1) === 1;
    const moving = ((movingMask >> idx) & 1) === 1;
    const { gan, zhi, element } = nj[idx]!;
    lines.push({
      pos,
      yang,
      moving,
      changedYang: moving ? !yang : null,
      gan,
      zhi,
      element,
      relative: relativeOf(palaceElement, element),
      spirit: SPIRITS[(spiritStart + idx) % 6]!,
      isShi: pos === shiYao,
      isYing: pos === yingYao,
      flags: lineFlags(zhi, date),
    });
  }
  return {
    name: hex.name,
    upper: hex.upper,
    lower: hex.lower,
    palace: hex.palace,
    palaceElement: hex.palaceElement,
    palaceType: hex.palaceType,
    shiYao,
    yingYao,
    lines,
  };
}

/**
 * 伏神:本卦中缺失的六亲,伏于本宫卦对应爻之下。
 * 用神不上卦时需看伏神,故全部算出缺失的六亲。
 */
export function findFushen(benHex: HexInfo, benLines: Line[]): Fushen[] {
  const present = new Set<Relative>(benLines.map((l) => l.relative));
  const allRelatives: Relative[] = ["父母", "兄弟", "子孙", "妻财", "官鬼"];
  const missing = allRelatives.filter((r) => !present.has(r));
  if (missing.length === 0) return [];

  const baseHex = palaceBaseHex(benHex.palace);
  const baseNj = najiaOf(baseHex);
  const out: Fushen[] = [];
  for (let pos = 1; pos <= 6; pos++) {
    const { gan, zhi, element } = baseNj[pos - 1]!;
    const rel = relativeOf(benHex.palaceElement, element);
    if (missing.includes(rel) && !out.some((f) => f.relative === rel)) {
      out.push({ pos, relative: rel, gan, zhi, element });
    }
  }
  return out;
}

export { hexByBits };
