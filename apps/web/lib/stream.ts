/** 文本事件流的最小接口(与 liuyao AI 层 TextStream 一致)。 */
interface TextMessageStream {
  on(event: "text", listener: (delta: string) => void): unknown;
  on(event: "error", listener: (err: unknown) => void): unknown;
  finalMessage(): Promise<unknown>;
  abort(): void;
}

/** 把文本流转成 text/plain 分块的流式 HTTP 响应,供前端逐字渲染。 */
export function streamToResponse(stream: TextMessageStream): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      stream.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
      stream.on("error", (err) => controller.error(err));
      stream
        .finalMessage()
        .then(() => controller.close())
        .catch((err) => controller.error(err));
    },
    cancel() {
      stream.abort();
    },
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
