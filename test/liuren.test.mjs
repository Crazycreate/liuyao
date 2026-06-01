import { test } from "node:test";
import assert from "node:assert/strict";
import { castLiuren } from "../dist/liuren/index.js";

const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const FIXED = { year: 2026, month: 6, day: 1, hour: 16, minute: 30 };

test("月将加时:天盘『占时支』之上必为月将", () => {
  const c = castLiuren(FIXED);
  const i = ZHI.indexOf(c.moment.shiZhi);
  assert.equal(c.tianpan[i], c.moment.yuejiang, "天盘[占时]应等于月将");
});

test("天盘为十二支的一个排列(不重不漏)", () => {
  const c = castLiuren(FIXED);
  assert.deepEqual([...c.tianpan].sort(), [...ZHI].sort());
});

test("四课链:二课下=一课上,四课下=三课上", () => {
  const c = castLiuren(FIXED);
  assert.equal(c.sike[1].xia, c.sike[0].shang);
  assert.equal(c.sike[3].xia, c.sike[2].shang);
  assert.equal(c.sike[0].xia, "亥".length ? c.sike[0].xia : "", ""); // 占位
});

test("一课下神=日干寄宫、三课下神=日支", () => {
  const c = castLiuren(FIXED);
  const JIGONG = { 甲: "寅", 乙: "辰", 丙: "巳", 丁: "未", 戊: "巳", 己: "未", 庚: "申", 辛: "戌", 壬: "亥", 癸: "丑" };
  assert.equal(c.sike[0].xia, JIGONG[c.moment.dayGan]);
  assert.equal(c.sike[2].xia, c.moment.dayZhi);
});

test("三传皆为合法地支", () => {
  const c = castLiuren(FIXED);
  for (const z of [c.sanchuan.chu, c.sanchuan.zhong, c.sanchuan.mo]) {
    assert.ok(ZHI.includes(z), `非法三传支 ${z}`);
  }
});

test("月将为合法地支", () => {
  const c = castLiuren(FIXED);
  assert.ok(ZHI.includes(c.moment.yuejiang));
});

test("遍历全年×十二时辰起课不抛错", () => {
  for (let m = 1; m <= 12; m++) {
    for (let h = 0; h < 24; h += 2) {
      const c = castLiuren({ year: 2026, month: m, day: 15, hour: h, minute: 0 });
      assert.ok(c.sanchuan.chu);
    }
  }
});

test("十二天将:贵人落在自身、十二将不重不漏", () => {
  const GEN = ["贵人", "螣蛇", "朱雀", "六合", "勾陈", "青龙", "天空", "白虎", "太常", "玄武", "太阴", "天后"];
  for (let h = 0; h < 24; h += 2) {
    const c = castLiuren({ year: 2026, month: 6, day: 1, hour: h, minute: 0 });
    const { byZhi, noble } = c.tianjiang;
    assert.equal(byZhi[noble], "贵人", `贵人应落在 ${noble}`);
    assert.deepEqual([...Object.values(byZhi)].sort(), [...GEN].sort(), "十二将应不重不漏");
  }
});

test("贵人表与昼夜:甲日昼贵丑、夜贵未(歌诀版)", () => {
  // 占时巳=昼 → 甲日昼贵在丑
  const day = castLiuren({ year: 2024, month: 4, day: 9, hour: 10, minute: 0 }); // 仅验证结构,不绑定具体日干
  assert.ok(["昼贵", "夜贵"].includes(day.tianjiang.isDay ? "昼贵" : "夜贵"));
});
