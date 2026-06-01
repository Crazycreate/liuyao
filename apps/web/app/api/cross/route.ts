import { castMoment } from "liuyao";
import { streamCross } from "liuyao/ai";
import { parseCastBody } from "@/lib/input";
import { ensureEnv } from "@/lib/env";
import { streamToResponse } from "@/lib/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** 六爻 × 六壬 四维度互证断卦(流式)。重新按 coinValues+date 双盘起卦,保证与展示一致。 */
export async function POST(req: Request): Promise<Response> {
  try {
    ensureEnv();
    const { question, coinValues, date } = parseCastBody(await req.json(), false);
    const m = castMoment({ question, coinValues, date });
    return streamToResponse(streamCross(m));
  } catch (err) {
    const message = err instanceof Error ? err.message : "互证失败";
    return Response.json({ error: message }, { status: 400 });
  }
}
