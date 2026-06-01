import { castMoment } from "liuyao";
import { parseCastBody } from "@/lib/input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 同一时刻双盘起卦(六爻 + 六壬,确定性,不调 AI)。 */
export async function POST(req: Request): Promise<Response> {
  try {
    const { question, coinValues, date } = parseCastBody(await req.json(), true);
    const m = castMoment({ question, coinValues, date });
    return Response.json({ reading: m.liuyao, liuren: m.liuren, coinValues });
  } catch (err) {
    const message = err instanceof Error ? err.message : "起卦失败";
    return Response.json({ error: message }, { status: 400 });
  }
}
