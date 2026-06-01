import { renderReading } from "../render.js";
import type { Reading } from "../types.js";
import { SYSTEM_PERSONA } from "./prompts.js";
import type { SystemBlock } from "./provider.js";

/**
 * 把一卦的确定性事实组装成 system 上下文块。
 * 第二块标记 cache(仅 Anthropic 生效):同一卦多轮追问命中缓存。
 */
export function buildContext(reading: Reading): SystemBlock[] {
  const facts = [
    "## 本次起卦的确定性事实(已排定,不可更改)",
    "",
    renderReading(reading),
    "",
    "## 符号说明",
    "- 爻象:▆▆▆▆▆▆▆=阳爻,▆▆▆ ▆▆▆=阴爻;○=阳动(老阳,变阴),×=阴动(老阴,变阳)。",
    "- 每爻格式:六神 + 爻位 + 六亲+纳甲干支+五行 + 爻象 + 世/应 + →变爻 + 〔标注〕。",
    "- 标注:空=旬空,月破=逢月破,临日/日冲/日合=与日辰关系,临月=临月建。",
    "- 变卦各爻六亲仍以本卦之宫五行论。",
  ].join("\n");

  return [
    { text: SYSTEM_PERSONA },
    { text: facts, cache: true },
  ];
}
