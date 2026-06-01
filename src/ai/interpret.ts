import type { Reading } from "../types.js";
import { buildContext } from "./context.js";
import { buildInterpretPrompt } from "./prompts.js";
import { chatComplete, chatStream, type Usage } from "./provider.js";

const MAX_TOKENS = 6000;

export interface Interpretation {
  text: string;
  usage: Usage;
}

/** AI 断卦(非流式)。需要当前 provider 的 key(默认 pollinations 免 key)。 */
export async function interpretReading(reading: Reading): Promise<Interpretation> {
  const { text, usage } = await chatComplete({
    kind: "report",
    maxTokens: MAX_TOKENS,
    system: buildContext(reading),
    messages: [{ role: "user", content: buildInterpretPrompt(reading.question) }],
  });
  return { text, usage };
}

/** AI 断卦(流式),供 CLI / Web 逐字渲染。 */
export function streamInterpretation(reading: Reading) {
  return chatStream({
    kind: "report",
    maxTokens: MAX_TOKENS,
    system: buildContext(reading),
    messages: [{ role: "user", content: buildInterpretPrompt(reading.question) }],
  });
}
