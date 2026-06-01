import { trigramByValue, trigramByName } from "./trigrams.js";
import type { Element } from "./types.js";

/**
 * 64 卦表(按京房八宫算法生成,含卦宫 / 世应 / 卦名)。
 * 6 位二进制 bits:bit0=初爻 … bit5=上爻,1=阳。
 */

// 卦名速查:行=上卦,列=下卦,顺序均为 乾兑离震巽坎艮坤。
const DISPLAY_ORDER = ["乾", "兑", "离", "震", "巽", "坎", "艮", "坤"];
const NAME_TABLE: string[][] = [
  ["乾为天", "天泽履", "天火同人", "天雷无妄", "天风姤", "天水讼", "天山遁", "天地否"],
  ["泽天夬", "兑为泽", "泽火革", "泽雷随", "泽风大过", "泽水困", "泽山咸", "泽地萃"],
  ["火天大有", "火泽睽", "离为火", "火雷噬嗑", "火风鼎", "火水未济", "火山旅", "火地晋"],
  ["雷天大壮", "雷泽归妹", "雷火丰", "震为雷", "雷风恒", "雷水解", "雷山小过", "雷地豫"],
  ["风天小畜", "风泽中孚", "风火家人", "风雷益", "巽为风", "风水涣", "风山渐", "风地观"],
  ["水天需", "水泽节", "水火既济", "水雷屯", "水风井", "坎为水", "水山蹇", "水地比"],
  ["山天大畜", "山泽损", "山火贲", "山雷颐", "山风蛊", "山水蒙", "艮为山", "山地剥"],
  ["地天泰", "地泽临", "地火明夷", "地雷复", "地风升", "地水师", "地山谦", "坤为地"],
];

function nameOf(upperName: string, lowerName: string): string {
  const ui = DISPLAY_ORDER.indexOf(upperName);
  const li = DISPLAY_ORDER.indexOf(lowerName);
  const row = NAME_TABLE[ui];
  if (!row || !row[li]) throw new Error(`卦名缺失: 上${upperName} 下${lowerName}`);
  return row[li];
}

export interface HexInfo {
  bits: number; // 0..63
  name: string;
  upper: string;
  lower: string;
  palace: string;
  palaceElement: Element;
  shiYao: number; // 世爻 1..6
  yingYao: number; // 应爻 1..6
  palaceType: string; // 本宫/一世…游魂/归魂
}

function lowerOf(bits: number): number {
  return bits & 0b111;
}
function upperOf(bits: number): number {
  return (bits >> 3) & 0b111;
}
function flip(bits: number, pos1to6: number): number {
  return bits ^ (1 << (pos1to6 - 1));
}

// 京房八宫顺序与各卦世爻位置。
const PALACE_TRIGRAMS = ["乾", "坎", "艮", "震", "巽", "离", "坤", "兑"];
const PALACE_TYPES = ["本宫", "一世", "二世", "三世", "四世", "五世", "游魂", "归魂"];
const SHI_POS = [6, 1, 2, 3, 4, 5, 4, 3];

const HEX_BY_BITS = new Map<number, HexInfo>();

function buildTable(): void {
  for (const pName of PALACE_TRIGRAMS) {
    const tv = trigramByName(pName).value;
    const palaceElement = trigramByName(pName).element;
    const base = tv | (tv << 3); // 本宫卦(上下同卦)

    const seq: number[] = [base];
    let cur = base;
    cur = flip(cur, 1); seq.push(cur); // 一世:变初爻
    cur = flip(cur, 2); seq.push(cur); // 二世:变二爻
    cur = flip(cur, 3); seq.push(cur); // 三世:变三爻
    cur = flip(cur, 4); seq.push(cur); // 四世:变四爻
    cur = flip(cur, 5); seq.push(cur); // 五世:变五爻
    cur = flip(cur, 4); seq.push(cur); // 游魂:再变四爻(回退)
    cur = flip(cur, 1); cur = flip(cur, 2); cur = flip(cur, 3); seq.push(cur); // 归魂:内卦还原

    seq.forEach((bits, i) => {
      if (HEX_BY_BITS.has(bits)) return;
      const upperName = trigramByValue(upperOf(bits)).name;
      const lowerName = trigramByValue(lowerOf(bits)).name;
      const shi = SHI_POS[i]!;
      const ying = shi > 3 ? shi - 3 : shi + 3;
      HEX_BY_BITS.set(bits, {
        bits,
        name: nameOf(upperName, lowerName),
        upper: upperName,
        lower: lowerName,
        palace: pName,
        palaceElement,
        shiYao: shi,
        yingYao: ying,
        palaceType: PALACE_TYPES[i]!,
      });
    });
  }
}
buildTable();

export function hexByBits(bits: number): HexInfo {
  const h = HEX_BY_BITS.get(bits);
  if (!h) throw new Error(`未找到卦象 bits=${bits}`);
  return h;
}

export function allHexagrams(): HexInfo[] {
  return [...HEX_BY_BITS.values()];
}

/** 某宫的本宫卦(用于伏神)。 */
export function palaceBaseHex(palaceName: string): HexInfo {
  const tv = trigramByName(palaceName).value;
  return hexByBits(tv | (tv << 3));
}
