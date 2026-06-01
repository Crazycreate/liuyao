import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

/**
 * 多 provider 断卦层:起卦起课永远本地确定性计算、不花钱;只有 AI 断卦/互证走这里。
 * 默认 AI_PROVIDER(默认 pollinations,免 key)。也支持**按请求覆盖**(BYOK):
 * 调用方传 ProviderOptions{provider, apiKey, model, baseURL},用用户自带的 key/模型,
 * 不读服务端环境变量——这样公网部署可"默认免费 + 用户自填 key"。
 */

export interface SystemBlock {
  text: string;
  cache?: boolean;
}
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
export interface Usage {
  inputTokens: number;
  outputTokens: number;
}
export type ModelKind = "report" | "chat";

export interface CompletionRequest {
  kind: ModelKind;
  system: SystemBlock[];
  messages: ChatMessage[];
  maxTokens: number;
}

/** 按请求覆盖 provider/key(BYOK)。任一字段缺省则回落到环境变量/默认。 */
export interface ProviderOptions {
  provider?: string;
  apiKey?: string;
  model?: string;
  baseURL?: string;
}

interface ProviderDef {
  kind: "anthropic" | "openai";
  label: string;
  keys: string[];
  baseURL?: string;
  models: Record<ModelKind, string>;
  signup?: string;
  free: boolean;
  noKey?: boolean;
}

const PROVIDERS: Record<string, ProviderDef> = {
  pollinations: {
    kind: "openai",
    label: "Pollinations(免费·免 key)",
    keys: ["POLLINATIONS_TOKEN"],
    baseURL: process.env.POLLINATIONS_BASE_URL || "https://text.pollinations.ai/openai",
    models: { report: "openai", chat: "openai" },
    signup: "https://pollinations.ai/",
    free: true,
    noKey: true,
  },
  ollama: {
    kind: "openai",
    label: "本地 Ollama(免费·无需 key)",
    keys: ["OLLAMA_API_KEY"],
    baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
    models: { report: "qwen2.5:32b", chat: "qwen2.5:32b" },
    signup: "https://ollama.com/download",
    free: true,
    noKey: true,
  },
  glm: {
    kind: "openai",
    label: "智谱 GLM-4-Flash(免费)",
    keys: ["GLM_API_KEY", "ZHIPU_API_KEY"],
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    models: { report: "glm-4-flash", chat: "glm-4-flash" },
    signup: "https://open.bigmodel.cn/",
    free: true,
  },
  gemini: {
    kind: "openai",
    label: "Google Gemini 2.0 Flash(免费额度)",
    keys: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    models: { report: "gemini-2.0-flash", chat: "gemini-2.0-flash" },
    signup: "https://aistudio.google.com/apikey",
    free: true,
  },
  groq: {
    kind: "openai",
    label: "Groq Llama-3.3-70B(免费)",
    keys: ["GROQ_API_KEY"],
    baseURL: "https://api.groq.com/openai/v1",
    models: { report: "llama-3.3-70b-versatile", chat: "llama-3.3-70b-versatile" },
    signup: "https://console.groq.com/keys",
    free: true,
  },
  anthropic: {
    kind: "anthropic",
    label: "Anthropic Claude(付费)",
    keys: ["ANTHROPIC_API_KEY"],
    models: { report: "claude-opus-4-8", chat: "claude-sonnet-4-6" },
    signup: "https://console.anthropic.com/",
    free: false,
  },
};

const DEFAULT_PROVIDER = "pollinations";

export function activeProviderName(opts?: ProviderOptions): string {
  const name = (opts?.provider || process.env.AI_PROVIDER || DEFAULT_PROVIDER).trim().toLowerCase();
  if (name !== "custom" && !PROVIDERS[name]) {
    throw new Error(`未知 AI provider="${name}"。可选:${Object.keys(PROVIDERS).join(" / ")} / custom`);
  }
  return name;
}

function resolveDef(name: string, opts?: ProviderOptions): ProviderDef {
  if (name === "custom") {
    const baseURL = opts?.baseURL || process.env.AI_BASE_URL;
    if (!baseURL) throw new Error("custom 需要 baseURL(任意 OpenAI 兼容端点)");
    const model = opts?.model || process.env.AI_MODEL_REPORT || process.env.AI_MODEL_CHAT;
    if (!model) throw new Error("custom 需要模型名(model)");
    return {
      kind: "openai",
      label: `自定义(${baseURL})`,
      keys: ["AI_API_KEY"],
      baseURL,
      models: { report: model, chat: model },
      free: false,
      noKey: !(opts?.apiKey || process.env.AI_API_KEY),
    };
  }
  const def = PROVIDERS[name]!;
  return opts?.baseURL ? { ...def, baseURL: opts.baseURL } : def;
}

function apiKeyFor(def: ProviderDef, opts?: ProviderOptions): string {
  if (opts?.apiKey && opts.apiKey.trim()) return opts.apiKey.trim();
  for (const k of def.keys) {
    const v = process.env[k];
    if (v && v.trim()) return v.trim();
  }
  if (def.noKey) return "not-needed";
  throw new Error(
    `缺少 ${def.label} 的 API key。请在设置里填入,或在 .env 配置 ${def.keys[0]}` +
      (def.signup ? `(申请:${def.signup})` : ""),
  );
}

function modelFor(def: ProviderDef, kind: ModelKind, opts?: ProviderOptions): string {
  if (opts?.model && opts.model.trim()) return opts.model.trim();
  const override = kind === "report" ? process.env.AI_MODEL_REPORT : process.env.AI_MODEL_CHAT;
  return (override && override.trim()) || def.models[kind];
}

export function providerSummary(opts?: ProviderOptions): string {
  const name = activeProviderName(opts);
  const def = resolveDef(name, opts);
  return `${name}(${def.label}) · ${modelFor(def, "report", opts)}`;
}

const TIMEOUT = 15 * 60 * 1000;
function makeAnthropic(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, timeout: TIMEOUT, maxRetries: 2 });
}
function makeOpenAI(apiKey: string, baseURL?: string): OpenAI {
  return new OpenAI({ apiKey, baseURL, timeout: TIMEOUT, maxRetries: 2 });
}

function toAnthropicSystem(system: SystemBlock[]): Anthropic.TextBlockParam[] {
  return system.map((b) =>
    b.cache ? { type: "text", text: b.text, cache_control: { type: "ephemeral" } } : { type: "text", text: b.text },
  );
}
function toOpenAIMessages(
  system: SystemBlock[],
  messages: ChatMessage[],
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const systemText = system.map((b) => b.text).join("\n\n");
  return [{ role: "system", content: systemText }, ...messages.map((m) => ({ role: m.role, content: m.content }))];
}

export interface TextStream {
  on(event: "text", listener: (delta: string) => void): unknown;
  on(event: "error", listener: (err: unknown) => void): unknown;
  finalMessage(): Promise<unknown>;
  abort(): void;
}

type OpenAIChunkStream = AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;

class OpenAITextStream implements TextStream {
  private textListeners: ((d: string) => void)[] = [];
  private errorListeners: ((e: unknown) => void)[] = [];
  private buffered: string[] = [];
  private fullText = "";
  private done: Promise<{ text: string }> | null = null;
  private aborter = new AbortController();

  constructor(private readonly open: (signal: AbortSignal) => Promise<OpenAIChunkStream>) {}

  on(event: "text" | "error", listener: (arg: never) => void): this {
    if (event === "text") {
      this.textListeners.push(listener as (d: string) => void);
      if (this.buffered.length) {
        for (const b of this.buffered) (listener as (d: string) => void)(b);
        this.buffered = [];
      }
    } else {
      this.errorListeners.push(listener as (e: unknown) => void);
    }
    return this;
  }
  private emitText(delta: string): void {
    this.fullText += delta;
    if (this.textListeners.length === 0) this.buffered.push(delta);
    else for (const l of this.textListeners) l(delta);
  }
  finalMessage(): Promise<{ text: string }> {
    if (!this.done) this.done = this.run();
    return this.done;
  }
  private async run(): Promise<{ text: string }> {
    try {
      const stream = await this.open(this.aborter.signal);
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) this.emitText(delta);
      }
      return { text: this.fullText };
    } catch (err) {
      for (const l of this.errorListeners) l(err);
      throw err;
    }
  }
  abort(): void {
    this.aborter.abort();
  }
}

export async function chatComplete(
  req: CompletionRequest,
  opts?: ProviderOptions,
): Promise<{ text: string; usage: Usage }> {
  const name = activeProviderName(opts);
  const def = resolveDef(name, opts);
  const apiKey = apiKeyFor(def, opts);
  if (def.kind === "anthropic") {
    const res = await makeAnthropic(apiKey).messages.create({
      model: modelFor(def, req.kind, opts),
      max_tokens: req.maxTokens,
      system: toAnthropicSystem(req.system),
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return { text, usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens } };
  }
  const res = await makeOpenAI(apiKey, def.baseURL).chat.completions.create({
    model: modelFor(def, req.kind, opts),
    max_tokens: req.maxTokens,
    messages: toOpenAIMessages(req.system, req.messages),
  });
  return {
    text: res.choices?.[0]?.message?.content ?? "",
    usage: { inputTokens: res.usage?.prompt_tokens ?? 0, outputTokens: res.usage?.completion_tokens ?? 0 },
  };
}

export function chatStream(req: CompletionRequest, opts?: ProviderOptions): TextStream {
  const name = activeProviderName(opts);
  const def = resolveDef(name, opts);
  const apiKey = apiKeyFor(def, opts);
  if (def.kind === "anthropic") {
    return makeAnthropic(apiKey).messages.stream({
      model: modelFor(def, req.kind, opts),
      max_tokens: req.maxTokens,
      system: toAnthropicSystem(req.system),
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
    }) as unknown as TextStream;
  }
  const client = makeOpenAI(apiKey, def.baseURL);
  const model = modelFor(def, req.kind, opts);
  const messages = toOpenAIMessages(req.system, req.messages);
  return new OpenAITextStream((signal) =>
    client.chat.completions.create({ model, max_tokens: req.maxTokens, stream: true, messages }, { signal }),
  );
}
