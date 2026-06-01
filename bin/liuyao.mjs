#!/usr/bin/env node
/**
 * 六爻 CLI:摇卦 / 排卦 / AI 断卦。
 *
 * 用法:
 *   node bin/liuyao.mjs "这次面试能成吗"
 *   node bin/liuyao.mjs "丢的钱包能找回吗" --lines 6,7,8,9,7,8     # 手动指定六爻(初→上,值 6/7/8/9)
 *   node bin/liuyao.mjs "今年财运如何" --date "2026-06-01 16:30"   # 指定占卦时间(默认此刻)
 *   node bin/liuyao.mjs "测病" --provider glm                      # 指定 AI provider
 *   node bin/liuyao.mjs "测事" --no-ai                             # 只排卦不断卦
 *
 * 起卦装卦不需要任何 key;AI 断卦默认走免费免 key 的 pollinations。
 */
import { readFileSync } from "node:fs";
import { castReading, castCoins, renderReading } from "../dist/index.js";

// —— 极简 .env 加载 ——
try {
  for (const line of readFileSync(new URL("../.env", import.meta.url), "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* 无 .env 则跳过 */
}

// —— 解析参数 ——
const argv = process.argv.slice(2);
const opts = { lines: null, date: null, ai: true };
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--lines") opts.lines = argv[++i];
  else if (a === "--date") opts.date = argv[++i];
  else if (a === "--provider") process.env.AI_PROVIDER = argv[++i];
  else if (a === "--no-ai") opts.ai = false;
  else positional.push(a);
}
const question = positional.join(" ").trim();

// —— 占卦时间 ——
function dateParts(s) {
  const d = s ? new Date(s.replace(" ", "T")) : new Date();
  if (Number.isNaN(d.getTime())) {
    console.error(`无法解析日期: ${s}`);
    process.exit(1);
  }
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
  };
}

// —— 摇卦 / 手动 ——
let coinValues;
if (opts.lines) {
  coinValues = opts.lines.split(/[,，\s]+/).filter(Boolean).map(Number);
  if (coinValues.length !== 6 || coinValues.some((v) => ![6, 7, 8, 9].includes(v))) {
    console.error("--lines 需要 6 个值(初→上),每个为 6/7/8/9。例:--lines 6,7,8,9,7,8");
    process.exit(1);
  }
} else {
  coinValues = castCoins();
}

const reading = castReading({ question, date: dateParts(opts.date), coinValues });

console.log("\n" + "═".repeat(60));
console.log(renderReading(reading));
console.log("═".repeat(60));

if (!opts.ai) process.exit(0);

// —— AI 断卦(流式)——
const { streamInterpretation } = await import("../dist/ai/index.js");
const { providerSummary } = await import("../dist/ai/provider.js");

console.log(`\n【AI 断卦 · ${providerSummary()}】\n`);
try {
  const stream = streamInterpretation(reading);
  let got = 0;
  stream.on("text", (t) => {
    got += t.length;
    process.stdout.write(t);
  });
  stream.on("error", () => {});
  await stream.finalMessage();
  if (got === 0) {
    console.log(
      "[当前模型未给出断辞] 默认的 pollinations 免费小模型对六爻长断常常吐空。\n" +
        "请换更强的 provider:--provider ollama(本地)/ --provider glm(免费需key)/ --provider anthropic。",
    );
  }
  console.log("\n");
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (/API key|AI_PROVIDER|AI_BASE_URL|AI_MODEL/.test(msg)) {
    console.log(`[跳过 AI 断卦] ${msg}\n配置好 provider(见 .env.example)后重跑;或加 --no-ai 只排卦。`);
    process.exit(0);
  }
  console.error("\nAI 断卦失败:", msg);
  process.exit(1);
}
