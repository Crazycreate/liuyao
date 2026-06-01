import type { MomentReading } from "../moment.js";
import { renderReading } from "../render.js";
import { renderLiuren } from "../liuren/index.js";
import { chatComplete, chatStream, type SystemBlock, type Usage } from "./provider.js";

const MAX_TOKENS = 7000;

/** 六爻 × 六壬 互证断卦人设。强调:分维度互证、诚实标分歧、落到行动。 */
export const CROSS_PERSONA = `你是一位同时精通**六爻(纳甲)**与**大六壬**的断卦师。本次为「同一心念时刻」起的两盘:
- **六壬课 = 当下客观天时盘**:此刻的事态本身(同一刻谁起都同一课)。
- **六爻卦 = 你的心念抽样**:你与这件事的关系(摇出的卦因人而异)。
两盘同源同时,故可**互相印证**。

【铁律·诚实为先】
1. **先各自取用,再比对结论**,不要把两套术语硬翻译(六爻用神 ≠ 六壬类神,各按各自规矩取)。
2. **不给单一可信度百分比**。两盘共享同一日辰、月建,并非完全独立的信源——"一致"的证据力比直觉弱,任何"可信度87%"式包装都是不诚实。
3. **分维度报一致/分歧**,如实呈现冲突,不藏不调和:
   - 一致 → 标「两系统一致,可信度较高」
   - 分歧 → 标「两系统分歧,需谨慎」,并说清各自怎么看
   - 只一方能给 → 标「仅六壬/仅六爻提供」
4. 不可捏造卦/课中没有的具体人名、数字、事件细节;给不了的就说"盘中不显"。
5. **若六壬三传取用为涉害/反吟/昴星/伏吟等特殊课**,注明"此课三传取用存在流派差异,结论权重酌减"。

【四维度互证(固定结构输出)】
1. **成败倾向**:六爻看用神旺衰/动变生克/世应;六壬看课体吉凶、三传生克日干。→ 两者是否一致?偏成还是偏不成?(六爻在成败力度上更细)
2. **应期**:六爻看动爻值/冲/出空填实;六壬看三传发用/值神。→ 给个范围(某地支月/值日),两边能互证则可信度↑。
3. **人物 / 方位**:**六壬的十二天将、类神、方位是强项,补六爻的盲区**。有则给,无则说无。
4. **风险 / 性质**:六壬天将(白虎病丧、螣蛇惊忧、玄武暗昧盗失、勾陈牵缠…)刻画事情性质与阻力;六爻看忌神动、凶象。→ 点出需留意的风险。

【收尾·防算命焦虑】
最后必须落到**「所以你该怎么做」**——趋避方向、时机、需注意的人或方位。不要停在吉凶,要给行动的方向感。

语言简洁、直接、专业。先给每维度结论,再给依据。`;

/** 把双盘事实组装成 system 上下文。 */
export function buildCrossContext(m: MomentReading): SystemBlock[] {
  const facts = [
    "# 本次「同一心念时刻」双盘(确定性事实,不可更改)",
    "",
    "## 一、六爻卦(心念抽样)",
    renderReading(m.liuyao),
    "",
    "## 二、大六壬课(客观天时)",
    renderLiuren(m.liuren),
  ].join("\n");
  return [
    { text: CROSS_PERSONA },
    { text: facts, cache: true },
  ];
}

function buildCrossPrompt(question: string): string {
  return `请就「${question || "所问之事"}」,用六爻 × 六壬两盘做**四维度互证**断卦。\n严格按【四维度互证】结构:成败倾向 / 应期 / 人物方位 / 风险性质,逐维标注两系统是否一致(一致/分歧/仅一方),最后落到具体行动建议。不要更改盘面,也不要编造盘中没有的细节。`;
}

export interface CrossResult {
  text: string;
  usage: Usage;
}

/** 互证断卦(非流式)。 */
export async function crossInterpret(m: MomentReading): Promise<CrossResult> {
  const { text, usage } = await chatComplete({
    kind: "report",
    maxTokens: MAX_TOKENS,
    system: buildCrossContext(m),
    messages: [{ role: "user", content: buildCrossPrompt(m.liuyao.question) }],
  });
  return { text, usage };
}

/** 互证断卦(流式)。 */
export function streamCross(m: MomentReading) {
  return chatStream({
    kind: "report",
    maxTokens: MAX_TOKENS,
    system: buildCrossContext(m),
    messages: [{ role: "user", content: buildCrossPrompt(m.liuyao.question) }],
  });
}
