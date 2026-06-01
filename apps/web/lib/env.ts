import { readFileSync } from "node:fs";
import { join } from "node:path";

let loaded = false;

/**
 * 把仓库根目录 .env 灌进 process.env(只灌尚未设置的)。
 * 多 provider:不同 provider 用不同 key,统一加载即可;缺 key 在 AI 层报错。仅服务端调用。
 */
export function ensureEnv(): void {
  if (loaded) return;
  loaded = true;
  const candidates = [join(process.cwd(), ".env"), join(process.cwd(), "..", "..", ".env")];
  for (const path of candidates) {
    try {
      const raw = readFileSync(path, "utf-8");
      for (const line of raw.split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && m[1] && !process.env[m[1]]) {
          process.env[m[1]] = m[2]!.replace(/^["']|["']$/g, "");
        }
      }
    } catch {
      /* 该路径无 .env,继续 */
    }
  }
}
