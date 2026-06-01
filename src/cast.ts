/**
 * 摇卦:模拟三枚铜钱摇六次。约定「背」为阳(值 3)、「字」为阴(值 2)。
 * 三钱之和:9 老阳(阳动)、8 少阴(阴静)、7 少阳(阳静)、6 老阴(阴动)。
 * 即 爻值 = 6 + 背的个数。
 */
export type Rng = () => number;

/** 摇一爻:返回 6/7/8/9。 */
export function castOneLine(rng: Rng = Math.random): number {
  let backs = 0;
  for (let i = 0; i < 3; i++) if (rng() < 0.5) backs++;
  return 6 + backs;
}

/** 摇一卦:6 个爻值,index0=初爻 … index5=上爻。 */
export function castCoins(rng: Rng = Math.random): number[] {
  return Array.from({ length: 6 }, () => castOneLine(rng));
}

/** 爻值 → 阴阳与动静。 */
export function valueToLine(v: number): { yang: boolean; moving: boolean } {
  switch (v) {
    case 6:
      return { yang: false, moving: true }; // 老阴(阴动)
    case 7:
      return { yang: true, moving: false }; // 少阳(阳静)
    case 8:
      return { yang: false, moving: false }; // 少阴(阴静)
    case 9:
      return { yang: true, moving: true }; // 老阳(阳动)
    default:
      throw new Error(`非法爻值 ${v}(只能是 6/7/8/9)`);
  }
}
