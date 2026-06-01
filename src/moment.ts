import { castReading } from "./index.js";
import { castLiuren, type LiurenCourse } from "./liuren/index.js";
import type { Reading } from "./types.js";
import type { DateParts } from "./date.js";

export interface MomentReading {
  /** 六爻:摇出的卦(心念抽样) */
  liuyao: Reading;
  /** 六壬:此刻起的课(客观天时) */
  liuren: LiurenCourse;
}

export interface CastMomentInput {
  question: string;
  date: DateParts;
  /** 六爻六个爻值(初→上) */
  coinValues: number[];
}

/**
 * 同一心念时刻 → 双盘同源:
 * 六爻用摇出的卦(你与事的关系),六壬用这一刻的干支起课(事态本身)。
 * 两者共用同一 date,是"互证成立"的前提。
 */
export function castMoment(input: CastMomentInput): MomentReading {
  return {
    liuyao: castReading(input),
    liuren: castLiuren(input.date),
  };
}
