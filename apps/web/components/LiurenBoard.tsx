import type { LiurenCourse } from "liuyao";

const YUEJIANG_NAME: Record<string, string> = {
  子: "神后", 丑: "大吉", 寅: "功曹", 卯: "太冲", 辰: "天罡", 巳: "太乙",
  午: "胜光", 未: "小吉", 申: "传送", 酉: "从魁", 戌: "河魁", 亥: "登明",
};
const ZHI_E: Record<string, string> = {
  子: "水", 亥: "水", 寅: "木", 卯: "木", 巳: "火", 午: "火",
  申: "金", 酉: "金", 辰: "土", 戌: "土", 丑: "土", 未: "土",
};
// 吉将 / 凶将(粗分,用于轻着色)
const JI = new Set(["贵人", "青龙", "六合", "太常", "太阴", "天后"]);
const XIONG = new Set(["螣蛇", "朱雀", "勾陈", "白虎", "玄武"]);
function genClass(g: string): string {
  if (JI.has(g)) return "g-ji";
  if (XIONG.has(g)) return "g-xiong";
  return "g-ping";
}

const CHUAN_LABEL = ["初传", "中传", "末传"];
const ZHI_ORDER = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

export function LiurenBoard({ course }: { course: LiurenCourse }) {
  const { moment, tianpan, sanchuan, sike, tianjiang } = course;
  const tg = (z: string) => tianjiang.byZhi[z] ?? "";
  const chuan = [sanchuan.chu, sanchuan.zhong, sanchuan.mo];
  // 四课:一课在右
  const keOrder = [...sike].reverse();

  return (
    <div className="card liuren">
      <div className="board-head">
        <div className="gua-name lr">大六壬课</div>
        <div className="gua-meta">
          {moment.dayGan}{moment.dayZhi}日 {moment.shiZhi}时 · 月将{moment.yuejiang}（{YUEJIANG_NAME[moment.yuejiang]}）·
          贵人{tianjiang.noble}（{tianjiang.isDay ? "昼" : "夜"}）天将{tianjiang.shun ? "顺" : "逆"}
        </div>
      </div>

      <div className="lr-grid">
        {/* 三传 */}
        <div className="sanchuan">
          <div className="sc-title">
            三传 <span className="sc-method">{sanchuan.method}</span>
          </div>
          {chuan.map((z, i) => (
            <div className="chuan-row" key={i}>
              <span className="cl">{CHUAN_LABEL[i]}</span>
              <span className={`cg ${genClass(tg(z))}`}>{tg(z)}</span>
              <span className={`cz e-${ZHI_E[z]}`}>
                {z}
                <i>{ZHI_E[z]}</i>
              </span>
            </div>
          ))}
          {sanchuan.note ? <div className="sc-note">{sanchuan.note}</div> : null}
        </div>

        {/* 四课 */}
        <div className="sike">
          <div className="sc-title">四课（右起一→四）</div>
          <div className="sike-cols">
            {keOrder.map((k) => (
              <div className="ke" key={k.index}>
                <span className={`cg ${genClass(tg(k.shang))}`}>{tg(k.shang)}</span>
                <span className={`ks e-${ZHI_E[k.shang]}`}>{k.shang}</span>
                <span className={`kx e-${ZHI_E[k.xia] ?? ""}`}>{k.xia}</span>
                <span className={`kr ${k.relation === "无" ? "" : "hit"}`}>
                  {k.relation === "无" ? "·" : k.relation}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 天地盘 */}
      <div className="dipan">
        <div className="sc-title">天地盘（地盘 / 上为天盘神）</div>
        <div className="dipan-grid">
          {ZHI_ORDER.map((dz, i) => (
            <div className="cell" key={dz}>
              <span className={`sky e-${ZHI_E[tianpan[i]]}`}>{tianpan[i]}</span>
              <span className="earth">{dz}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
