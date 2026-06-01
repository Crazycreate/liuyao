import type { DateParts } from "../date.js";
import {
  buildMoment,
  buildPlate,
  buildSiKe,
  ZHI,
  YUEJIANG_NAME,
  type Ke,
  type Moment,
} from "./core.js";
import { buildSanChuan, type SanChuan } from "./sanchuan.js";
import { buildTianjiang, type Tianjiang } from "./tianjiang.js";

export interface LiurenCourse {
  moment: Moment;
  /** 天盘:tianpan[i] = 地盘 ZHI[i] 之上的天盘神 */
  tianpan: string[];
  /** 地盘(固定十二支) */
  dipan: string[];
  offset: number;
  sike: Ke[];
  sanchuan: SanChuan;
  tianjiang: Tianjiang;
}

/** 大六壬起课(确定性):公历时刻 → 月将/天地盘/四课/三传/十二天将。 */
export function castLiuren(parts: DateParts): LiurenCourse {
  const moment = buildMoment(parts);
  const { tianpan, offset } = buildPlate(moment.yuejiang, moment.shiZhi);
  const sike = buildSiKe(tianpan, moment.dayGan, moment.dayZhi);
  const sanchuan = buildSanChuan(sike, tianpan, offset, moment.dayGan, moment.dayZhi);
  const tianjiang = buildTianjiang(tianpan, moment.dayGan, moment.shiZhi);
  return { moment, tianpan, dipan: [...ZHI], offset, sike, sanchuan, tianjiang };
}

export { ZHI, YUEJIANG_NAME };
export type { Moment, Ke, SanChuan, Tianjiang };
export { renderLiuren } from "./render.js";
