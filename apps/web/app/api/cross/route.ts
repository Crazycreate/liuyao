import { castMoment } from "liuyao";
import { streamCross, type ProviderOptions } from "liuyao/ai";
import { parseCastBody } from "@/lib/input";
import { ensureEnv } from "@/lib/env";
import { streamToResponse } from "@/lib/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 从请求体解析 BYOK 设置(用户自带 provider/key);仅透传、不落库、不记日志。 */
function parseAi(raw: unknown): ProviderOptions | undefined {
  const ai = (raw as { ai?: Record<string, unknown> } | null)?.ai;
  if (!ai || typeof ai !== "object") return undefined;
  const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const opts: ProviderOptions = {
    provider: s(ai.provider),
    apiKey: s(ai.apiKey),
    model: s(ai.model),
    baseURL: s(ai.baseURL),
  };
  return opts.provider || opts.apiKey || opts.model || opts.baseURL ? opts : undefined;
}

/** 六爻 × 六壬 四维度互证断卦(流式)。 */
export async function POST(req: Request): Promise<Response> {
  try {
    ensureEnv();
    const body = await req.json();
    const { question, coinValues, date } = parseCastBody(body, false);
    const ai = parseAi(body);
    const m = castMoment({ question, coinValues, date });
    return streamToResponse(streamCross(m, ai));
  } catch (err) {
    const message = err instanceof Error ? err.message : "互证失败";
    return Response.json({ error: message }, { status: 400 });
  }
}
