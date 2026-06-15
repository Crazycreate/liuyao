import type { MomentReading } from "../moment.js";
import { renderReading } from "../render.js";
import { renderLiuren } from "../liuren/index.js";
import { chatComplete, chatStream, type SystemBlock, type Usage, type ProviderOptions, type ChatMessage } from "./provider.js";

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

【说人话·白话优先(最重要)】
这份断辞是给**完全不懂六爻、六壬的普通人**看的,务必"说人话":
- 每个维度**先用一句大白话给结论**(像跟朋友聊天),让人一眼看懂"成还是不成、大概什么时候、要防着谁或什么事";
- **必须用术语时,第一次出现就在括号里当场翻成人话**。例如:用神(代表所问这件事本身的那个卦象符号)、发用(三传里最先发动、代表事情起点的那一步)、世应(世=你自己,应=对方)、旬空(暂时落空、还没到位)、螣蛇(主虚惊、反复、心里不踏实)、白虎(主疾病、伤灾、来势急)、玄武(主暗昧、欺瞒、丢失)、勾陈(主拖延、牵扯不清)、化忌(表示阻碍、不顺的标记)等;
- **不堆砌行话、不掉书袋**:依据只点关键一两处,别为显专业而罗列一串术语;能用大白话说清就不用术语;
- 宁可朴素直白,也别让人云里雾里——**看不懂的解读等于没解读**。

每个维度的写法 = 一句白话结论 → 一两句"为什么"(白话为主,术语必带括号注解) → 该维度的一致/分歧标注。全程口语、亲切、像人话。`;

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

/** 断卦视角:只用六爻 / 只用六壬 / 两盘互证。 */
export type CrossLens = "liuyao" | "liuren" | "both";

/** 视角指令——单系统时强力隔离:就当另一盘不存在,不互相翻译、不做对照(避免"太杂太乱")。 */
function crossLensDirective(lens: CrossLens): string {
  if (lens === "liuyao")
    return "【只用六爻 · 严格隔离】仅以**六爻(纳甲)**断:用神取用、旺衰、动变生克、世应、六亲六神、旬空、月破日冲日合、伏神。**完全不提大六壬**(四课/三传/天将/类神一律不出现),就当没有六壬课;**不做'两系统对照/一致分歧'**,只给六爻一家之断。若本维度要点或小标题里涉及两盘对照(如'一致度'),只取六爻部分、并把措辞改成单系统说法。";
  if (lens === "liuren")
    return "【只用六壬 · 严格隔离】仅以**大六壬**断:四课、三传(发用/中传/末传)、十二天将、类神、方位、课体吉凶、三传生克日干。**完全不提六爻**(卦/爻/用神/六亲/世应一律不出现),就当没有六爻卦;**不做'两系统对照/一致分歧'**,只给六壬一家之断。若本维度要点或小标题里涉及两盘对照(如'一致度'),只取六壬部分、并把措辞改成单系统说法。";
  return "用两盘互证本维度,标注两系统【一致 / 分歧 / 仅一方】(一致更可信、分歧如实标出,不强行调和)。";
}

function buildSegmentPrompt(question: string, seg: CrossSegment, lens: CrossLens): string {
  const open = lens === "liuyao" ? "用**六爻(纳甲)**断" : lens === "liuren" ? "用**大六壬**断" : "做六爻 × 六壬互证";
  return `就「${question || "所问之事"}」${open}。现在**只**写这一个维度,其它维度一律不写、不重复:\n\n${seg.heading}\n${seg.instruction}\n\n要求:${crossLensDirective(lens)} 只锚定上面给定的盘面事实,不编造盘中没有的细节。\n【说人话】先用一句大白话给本维度结论,再简短说为什么;术语(用神/发用/天将名/旬空等)第一次出现必须用括号当场翻成人话,不堆砌行话,让完全不懂的人也看得懂。\n【篇幅·硬性】本维度约 ${SEGMENT_WORDS} 字写透即可,**务必在篇幅内把话说完、以句号自然收尾,宁短勿断,绝不写到一半被切。**\n**输出以「${seg.heading}」这个小标题开头。**`;
}

/** 单维目标字数:够说透又让最慢模型(Opus)在篇幅内自然收尾。 */
const SEGMENT_WORDS = "600–800";

/**
 * 每段输出上限。设 1900 token —— 纯安全网。Opus 篇幅随问题/卦象波动(多轮实测 973~1310 字),
 * 1400 曾被 chengbai 的 1310 擦顶切半句;留到 1900(高出观测峰值 ~600 字)以覆盖更啰嗦的输入。
 * 控篇幅靠 prompt 硬性字数,让模型撞顶前以句号收尾;即便极端填满 ~1700 字,Opus ~33 字/秒
 * 约 ~52s,仍在 Vercel 60s 内。上限须明显高于自然篇幅,切勿压到其下。
 */
const SEGMENT_MAX_TOKENS = 1900;

/** 分段流式断卦:只断一个维度。segKey ∈ CROSS_SEGMENTS[].key;lens 决定六爻/六壬/互证。 */
export function streamCrossSegment(m: MomentReading, segKey: string, opts?: ProviderOptions, lens: CrossLens = "both") {
  const seg = CROSS_SEGMENTS.find((s) => s.key === segKey);
  if (!seg) throw new Error(`未知互证维度:${segKey}`);
  return chatStream(
    {
      kind: "report",
      maxTokens: SEGMENT_MAX_TOKENS,
      system: buildCrossContext(m),
      messages: [{ role: "user", content: buildSegmentPrompt(m.liuyao.question, seg, lens) }],
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

/** 一轮追问的问答对(用于把历史回灌给模型,保证多轮连贯)。 */
export interface FollowupTurn {
  q: string;
  a: string;
}

/** 追问单轮上限。追问答案聚焦、篇幅短(目标 300–500 字),1500 足够且稳在 Vercel 60s 内。 */
const FOLLOWUP_MAX_TOKENS = 1500;

/** 追问时的视角隔离——与断卦一致:单系统就当另一盘不存在。 */
function followupLensDirective(lens: CrossLens): string {
  if (lens === "liuyao")
    return "【只用六爻】仅以六爻(纳甲)回答,完全不提大六壬(四课/三传/发用/中末传/月将/天乙贵人一律不出现)。注意:六爻的青龙/朱雀/勾陈/螣蛇/白虎/玄武一律称「六神」,**不要叫「天将」、也不要用六壬的「贵人」等称呼**。";
  if (lens === "liuren")
    return "【只用六壬】仅以大六壬回答,完全不提六爻(卦/爻/用神/世应一律不出现)。";
  return "【两盘并用】可六爻、六壬一起看,若有分歧如实标注,不强行调和。";
}

function buildFollowupPrompt(question: string, lens: CrossLens): string {
  return `这是针对**同一卦/同一课**的追问——不要重新起卦、不要重排盘面,只就上面已排定的盘回答。
${followupLensDirective(lens)}
直接回答用户的追问本身,不必再走"四维度(成败/应期/人物/风险)"的完整结构;若追问与某一维度相关,聚焦该处深入即可。
【说人话】先一句大白话给结论,再简短说依据;术语第一次出现必须括号当场翻成人话,不堆行话。
【篇幅】约 300–500 字说透即可,务必句号自然收尾、宁短勿断。
追问:「${question}」`;
}

/**
 * 同一卦/课的多轮追问(流式)。
 * 复用断卦时的 system(人设 + 双盘事实,facts 块 cache:true → 多轮命中 Anthropic 缓存);
 * 把"原断辞 + 历轮问答"作为对话历史传入,新问题作为最后一轮 user。
 * 用 kind:"chat"(更快更省的对话模型,Anthropic 为 Sonnet),答案聚焦短小,单轮稳在 Vercel 60s 内。
 * lens 决定六爻/六壬/互证,隔离规则与断卦一致(单系统不串到另一盘)。
 */
export function streamFollowup(
  m: MomentReading,
  priorText: string,
  history: FollowupTurn[],
  question: string,
  opts?: ProviderOptions,
  lens: CrossLens = "both",
) {
  const q = (question || "").trim();
  if (!q) throw new Error("追问内容为空");
  const messages: ChatMessage[] = [];
  if (priorText.trim()) {
    messages.push({ role: "user", content: `就「${m.liuyao.question || "所问之事"}」断卦(盘面见上)。` });
    messages.push({ role: "assistant", content: priorText.trim() });
  }
  for (const t of history) {
    const tq = (t?.q || "").trim();
    const ta = (t?.a || "").trim();
    if (tq) messages.push({ role: "user", content: tq });
    if (ta) messages.push({ role: "assistant", content: ta });
  }
  messages.push({ role: "user", content: buildFollowupPrompt(q, lens) });
  return chatStream(
    { kind: "chat", maxTokens: FOLLOWUP_MAX_TOKENS, system: buildCrossContext(m), messages },
    opts,
  );
}
