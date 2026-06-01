import { castReading } from "liuyao";
import { parseCastBody } from "@/lib/input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 起卦 + 装卦(确定性,不调 AI)。无 coinValues 时服务端随机摇卦。 */
export async function POST(req: Request): Promise<Response> {
  try {
    const { question, coinValues, date } = parseCastBody(await req.json(), true);
    const reading = castReading({ question, coinValues, date });
    return Response.json({ reading, coinValues });
  } catch (err) {
    const message = err instanceof Error ? err.message : "起卦失败";
    return Response.json({ error: message }, { status: 400 });
  }
}
