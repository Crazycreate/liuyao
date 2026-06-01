import type { MomentReading } from "../moment.js";
import { renderReading } from "../render.js";
import { renderLiuren } from "../liuren/index.js";
import { chatComplete, chatStream, type SystemBlock, type Usage, type ProviderOptions } from "./provider.js";

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

/**
 * 分段断卦:把四维互证拆成多个独立段落,各自一次 <60s 的请求。
 * 目的:绕开 Vercel 免费版函数 60 秒上限——整篇一次跑要 ~130s 会被截断,
 * 拆成 5 段后每段都能在限额内跑完;各段都直接锚定确定性盘面(非互相引用 AI 文本),
 * 因此可独立成段而不失严谨。system(人设+双盘)逐段相同且 cache:true,
 * 段 2~5 命中 Anthropic prompt cache,更省更快。
 */
export interface CrossSegment {
  key: string;
  /** 段落小标题(Markdown),客户端按此顺序拼接展示。 */
  heading: string;
  instruction: string;
}

export const CROSS_SEGMENTS: CrossSegment[] = [
  {
    key: "chengbai",
    heading: "### 一、成败倾向",
    instruction:
      "六爻看用神旺衰 / 动变生克 / 世应关系;六壬看课体吉凶、三传生克日干。给出偏成还是偏不成,并说清力度(六爻在成败力度上更细)。",
  },
  {
    key: "yingqi",
    heading: "### 二、应期",
    instruction:
      "六爻看动爻值 / 冲 / 出空填实;六壬看三传发用 / 值神。给一个可落地的时间范围(某地支月 / 值日),两盘能互证则点明可信度更高。",
  },
  {
    key: "renwu",
    heading: "### 三、人物 / 方位",
    instruction:
      "以六壬的十二天将、类神、方位为主(这是六壬强项,补六爻盲区),六爻能补则补。盘中不显就明说「盘中不显」,不要编造具体人名。",
  },
  {
    key: "fengxian",
    heading: "### 四、风险 / 性质",
    instruction:
      "六壬天将刻画事情性质与阻力(白虎病丧、螣蛇惊忧、玄武暗昧盗失、勾陈牵缠…);六爻看忌神动、凶象。点出最需留意的一两个风险。",
  },
  {
    key: "xingdong",
    heading: "### 综合 · 一致度 与 该怎么做",
    instruction:
      "先用两三句如实总述四维度里哪些两盘一致、哪些分歧(不给单一可信度百分比);随后**落到具体行动**——趋避方向、时机窗口、需注意的人或方位。重点在「所以你该怎么做」,给行动的方向感,不要停在吉凶。",
  },
];

function buildSegmentPrompt(question: string, seg: CrossSegment): string {
  return `就「${question || "所问之事"}」做六爻 × 六壬互证。现在**只**写这一个维度,其它维度一律不写、不重复:\n\n${seg.heading}\n${seg.instruction}\n\n要求:用两盘互证本维度,标注两系统【一致 / 分歧 / 仅一方】;简洁直接,只锚定上面给定的盘面事实,不编造盘中没有的细节。**输出以「${seg.heading}」这个小标题开头。**`;
}

/** 每段输出上限。压到约 1100 token,确保即便慢模型(~28 字/秒)单段也能在 60s 内跑完。 */
const SEGMENT_MAX_TOKENS = 1100;

/** 分段流式断卦:只断一个维度。segKey ∈ CROSS_SEGMENTS[].key。 */
export function streamCrossSegment(m: MomentReading, segKey: string, opts?: ProviderOptions) {
  const seg = CROSS_SEGMENTS.find((s) => s.key === segKey);
  if (!seg) throw new Error(`未知互证维度:${segKey}`);
  return chatStream(
    {
      kind: "report",
      maxTokens: SEGMENT_MAX_TOKENS,
      system: buildCrossContext(m),
      messages: [{ role: "user", content: buildSegmentPrompt(m.liuyao.question, seg) }],
    },
    opts,
  );
}

export interface CrossResult {
  text: string;
  usage: Usage;
}

/** 互证断卦(非流式)。opts 可传 BYOK(用户自带 provider/key)。 */
export async function crossInterpret(m: MomentReading, opts?: ProviderOptions): Promise<CrossResult> {
  const { text, usage } = await chatComplete(
    {
      kind: "report",
      maxTokens: MAX_TOKENS,
      system: buildCrossContext(m),
      messages: [{ role: "user", content: buildCrossPrompt(m.liuyao.question) }],
    },
    opts,
  );
  return { text, usage };
}

/** 互证断卦(流式)。opts 可传 BYOK。 */
export function streamCross(m: MomentReading, opts?: ProviderOptions) {
  return chatStream(
    {
      kind: "report",
      maxTokens: MAX_TOKENS,
      system: buildCrossContext(m),
      messages: [{ role: "user", content: buildCrossPrompt(m.liuyao.question) }],
    },
    opts,
  );
}
