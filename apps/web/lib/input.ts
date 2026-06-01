import { castCoins, type DateParts } from "liuyao";

export interface CastBody {
  question: string;
  coinValues: number[];
  date: DateParts;
}

function parseDate(s: unknown): DateParts {
  const d = typeof s === "string" && s ? new Date(s) : new Date();
  if (Number.isNaN(d.getTime())) throw new Error("无法解析占卦时间");
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
  };
}

/** 解析起卦请求体。allowRandom=true 时缺爻值则随机摇卦。 */
export function parseCastBody(raw: unknown, allowRandom: boolean): CastBody {
  const b = (raw ?? {}) as Record<string, unknown>;
  const question = typeof b.question === "string" ? b.question.slice(0, 200) : "";
  const date = parseDate(b.date);

  let coinValues: number[];
  if (Array.isArray(b.coinValues) && b.coinValues.length === 6) {
    coinValues = b.coinValues.map((x) => Number(x));
    if (coinValues.some((v) => ![6, 7, 8, 9].includes(v))) {
      throw new Error("爻值必须为 6/7/8/9(初→上共 6 个)");
    }
  } else if (allowRandom) {
    coinValues = castCoins();
  } else {
    throw new Error("缺少 coinValues(6 个,初→上)");
  }
  return { question, coinValues, date };
}
