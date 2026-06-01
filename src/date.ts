import { Solar } from "lunar-javascript";
import type { DivineDate } from "./types.js";

export interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/**
 * 公历起卦时间 → 干支历(年/月/日/时干支、日空亡)。
 * 六爻断卦以「月建、日辰」为权衡旺衰的根本,故必须算准当下干支。
 */
export function divineDate(parts: DateParts): DivineDate {
  const { year, month, day, hour, minute } = parts;
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const ec = solar.getLunar().getEightChar();

  const xunRaw = ec.getDayXunKong(); // 如 "戌亥"
  const xunKong: [string, string] = [xunRaw.charAt(0), xunRaw.charAt(1)];

  return {
    solar: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    yearGanZhi: ec.getYear(),
    monthGanZhi: ec.getMonth(),
    dayGanZhi: ec.getDay(),
    hourGanZhi: ec.getTime(),
    dayGan: ec.getDayGan(),
    dayZhi: ec.getDayZhi(),
    monthZhi: ec.getMonthZhi(),
    xunKong,
  };
}
