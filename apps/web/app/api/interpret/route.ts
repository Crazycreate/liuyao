import { castReading } from "liuyao";
import { streamInterpretation } from "liuyao/ai";
import { parseCastBody } from "@/lib/input";
import { ensureEnv } from "@/lib/env";
import { streamToResponse } from "@/lib/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** AI 断卦(流式)。重新按 coinValues+date 装卦,保证与展示的卦一致。 */
export async function POST(req: Request): Promise<Response> {
  try {
    ensureEnv();
    const { question, coinValues, date } = parseCastBody(await req.json(), false);
    const reading = castReading({ question, coinValues, date });
    return streamToResponse(streamInterpretation(reading));
  } catch (err) {
    const message = err instanceof Error ? err.message : "断卦失败";
    return Response.json({ error: message }, { status: 400 });
  }
}
