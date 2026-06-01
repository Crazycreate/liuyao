/**
 * 客户端:POST 一个请求并流式接收文本。
 * 回调传【累计全文】,并按时间节流——避免长文本每个 token 都触发 Markdown 重解析。
 */
export async function streamPost(
  url: string,
  body: unknown,
  onText: (fullText: string) => void,
  opts: { throttleMs?: number; signal?: AbortSignal } = {},
): Promise<void> {
  const throttleMs = opts.throttleMs ?? 80;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  if (!res.ok || !res.body) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error ?? `请求失败(${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let last = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    const now = Date.now();
    if (now - last >= throttleMs) {
      last = now;
      onText(full);
    }
  }
  onText(full);
}
