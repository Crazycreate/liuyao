import type { LiurenCourse } from "./index.js";
import { ZHI, YUEJIANG_NAME } from "./core.js";

/** 渲染六壬课为可读文本(CLI 展示 + AI 上下文同源)。 */
export function renderLiuren(c: LiurenCourse): string {
  const { moment, tianpan, sike, sanchuan, tianjiang } = c;
  const tj = (zhi: string): string => tianjiang.byZhi[zhi] ?? "";
  const out: string[] = [];

  out.push(
    `【占时】${moment.solar}　${moment.dayGan}${moment.dayZhi}日 ${moment.shiZhi}时　月将 ${moment.yuejiang}(${YUEJIANG_NAME[moment.yuejiang]})`,
  );
  out.push(
    `【贵人】${tianjiang.noble}(${tianjiang.isDay ? "昼贵" : "夜贵"})　天将${tianjiang.shun ? "顺布" : "逆布"}`,
  );
  out.push("");

  // 天地盘:每个地盘支 → 其上天盘神
  out.push("【天地盘】(地盘支 → 上神)");
  const cells = ZHI.map((dz, i) => `${dz}→${tianpan[i]}`);
  out.push("  " + cells.slice(0, 6).join("  "));
  out.push("  " + cells.slice(6).join("  "));
  out.push("");

  // 四课(上神在上、下神在下;从右到左为一二三四课)
  out.push("【四课】(右起 一→四)");
  const order = [...sike].reverse();
  out.push("  天将  " + order.map((k) => tj(k.shang)).join("  "));
  out.push("  上神  " + order.map((k) => k.shang).join("  "));
  out.push("  下神  " + order.map((k) => k.xia).join("  "));
  out.push(
    "  关系  " + order.map((k) => (k.relation === "无" ? "—" : k.relation)).join("  "),
  );
  out.push("");

  // 三传(带天将)
  out.push(`【三传】取用:${sanchuan.method}`);
  out.push(`  初传 ${tj(sanchuan.chu)}${sanchuan.chu}`);
  out.push(`  中传 ${tj(sanchuan.zhong)}${sanchuan.zhong}`);
  out.push(`  末传 ${tj(sanchuan.mo)}${sanchuan.mo}`);
  if (sanchuan.note) out.push(`  (注:${sanchuan.note})`);

  return out.join("\n");
}
