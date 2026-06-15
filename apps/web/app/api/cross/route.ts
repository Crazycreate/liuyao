import { castMoment } from "liuyao";
import { streamCross, streamCrossSegment, streamFollowup, type ProviderOptions, type FollowupTurn } from "liuyao/ai";
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

/** 解析追问体:{ question, priorText, history[] }。question 为空则不视为追问。 */
function parseFollowup(
  raw: unknown,
): { priorText: string; history: FollowupTurn[]; question: string } | undefined {
  const f = (raw as { followup?: Record<string, unknown> } | null)?.followup;
  if (!f || typeof f !== "object") return undefined;
  const question = typeof f.question === "string" ? f.question.trim() : "";
  if (!question) return undefined;
  const priorText = typeof f.priorText === "string" ? f.priorText : "";
  const histRaw = Array.isArray(f.history) ? f.history : [];
  const history: FollowupTurn[] = histRaw
    .map((t) => ({
      q: typeof (t as FollowupTurn)?.q === "string" ? (t as FollowupTurn).q : "",
      a: typeof (t as FollowupTurn)?.a === "string" ? (t as FollowupTurn).a : "",
    }))
    .filter((t) => t.q.trim() || t.a.trim());
  return { priorText, history, question };
}

/**
 * 六爻 × 六壬 互证断卦(流式)。
 * body.segment 存在 → 只断该维度(分段模式,每段 <60s,绕开 Vercel 函数上限);
 * 不存在 → 整篇一次断(CLI / 旧调用方,慢模型在免费版可能被 60s 截断)。
 */
export async function POST(req: Request): Promise<Response> {
  try {
    ensureEnv();
    const body = await req.json();
    const { question, coinValues, date } = parseCastBody(body, false);
    const ai = parseAi(body);
    const segment = typeof body?.segment === "string" && body.segment.trim() ? body.segment.trim() : undefined;
    const lens = body?.lens === "liuyao" || body?.lens === "liuren" ? body.lens : "both";
    const followup = parseFollowup(body);
    const m = castMoment({ question, coinValues, date });
    if (followup) {
      return streamToResponse(streamFollowup(m, followup.priorText, followup.history, followup.question, ai, lens));
    }
    const stream = segment ? streamCrossSegment(m, segment, ai, lens) : streamCross(m, ai);
    return streamToResponse(stream);
  } catch (err) {
    const message = err instanceof Error ? err.message : "互证失败";
    return Response.json({ error: message }, { status: 400 });
  }
}
