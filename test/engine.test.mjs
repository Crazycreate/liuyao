import { test } from "node:test";
import assert from "node:assert/strict";
import { castReading, castCoins, castOneLine, allHexagrams, hexByBits } from "../dist/index.js";

const FIXED_DATE = { year: 2026, month: 6, day: 1, hour: 12, minute: 0 };
const ALL_RELATIVES = ["父母", "兄弟", "子孙", "妻财", "官鬼"];

// 静卦(全少阳/少阴)辅助:给定本卦 bits → 6 个静爻值
function staticValuesFromBits(bits) {
  const vals = [];
  for (let i = 0; i < 6; i++) vals.push(((bits >> i) & 1) === 1 ? 7 : 8); // 7少阳 8少阴
  return vals;
}
function cast(bits, question = "测试") {
  return castReading({ question, date: FIXED_DATE, coinValues: staticValuesFromBits(bits) });
}

test("64 卦表完整且唯一(覆盖 bits 0..63)", () => {
  const hexes = allHexagrams();
  assert.equal(hexes.length, 64, "应有 64 卦");
  const seen = new Set(hexes.map((h) => h.bits));
  assert.equal(seen.size, 64, "bits 应唯一");
  for (let b = 0; b < 64; b++) assert.ok(seen.has(b), `缺 bits=${b}`);
});

test("京房世应:已知卦校验", () => {
  // 乾为天:乾宫本宫,世6应3
  const qian = hexByBits(0b111111);
  assert.equal(qian.name, "乾为天");
  assert.equal(qian.palace, "乾");
  assert.equal(qian.palaceType, "本宫");
  assert.equal(qian.shiYao, 6);
  assert.equal(qian.yingYao, 3);

  // 天风姤:乾宫一世,世1应4
  const gou = hexByBits(0b111110);
  assert.equal(gou.name, "天风姤");
  assert.equal(gou.palaceType, "一世");
  assert.equal(gou.shiYao, 1);

  // 火地晋:乾宫游魂,世4
  const jin = hexByBits(0b101000);
  assert.equal(jin.name, "火地晋");
  assert.equal(jin.palace, "乾");
  assert.equal(jin.palaceType, "游魂");
  assert.equal(jin.shiYao, 4);

  // 水火既济:坎宫三世,世3应6
  const jiji = hexByBits(0b010101);
  assert.equal(jiji.name, "水火既济");
  assert.equal(jiji.palace, "坎");
  assert.equal(jiji.palaceType, "三世");
  assert.equal(jiji.shiYao, 3);
});

test("纳甲:乾为天六爻干支与标准一致", () => {
  const r = cast(0b111111);
  const gz = r.ben.lines.map((l) => l.gan + l.zhi);
  assert.deepEqual(gz, ["甲子", "甲寅", "甲辰", "壬午", "壬申", "壬戌"]);
});

test("纳甲:坎为水初爻为戊寅", () => {
  const r = cast(0b010010);
  assert.equal(r.ben.name, "坎为水");
  assert.equal(r.ben.lines[0].gan + r.ben.lines[0].zhi, "戊寅");
});

test("六亲:乾为天(乾宫金)逐爻与标准一致", () => {
  const r = cast(0b111111);
  const liuqin = r.ben.lines.map((l) => l.relative);
  // 子孙(子水)、妻财(寅木)、父母(辰土)、官鬼(午火)、兄弟(申金)、父母(戌土)
  assert.deepEqual(liuqin, ["子孙", "妻财", "父母", "官鬼", "兄弟", "父母"]);
});

test("世应标注落在正确爻位(乾为天:世上爻、应三爻)", () => {
  const r = cast(0b111111);
  assert.ok(r.ben.lines[5].isShi, "上爻应为世");
  assert.ok(r.ben.lines[2].isYing, "三爻应为应");
  assert.equal(r.ben.lines.filter((l) => l.isShi).length, 1);
  assert.equal(r.ben.lines.filter((l) => l.isYing).length, 1);
});

test("动爻 → 变卦正确(乾为天初爻动 → 天风姤)", () => {
  const r = castReading({
    question: "测变卦",
    date: FIXED_DATE,
    coinValues: [9, 7, 7, 7, 7, 7], // 初爻老阳动,余少阳
  });
  assert.equal(r.ben.name, "乾为天");
  assert.deepEqual(r.movingPositions, [1]);
  assert.ok(r.bian, "应有变卦");
  assert.equal(r.bian.name, "天风姤");
  assert.equal(r.ben.lines[0].changedYang, false, "老阳变阴");
});

test("六爻安静则无变卦", () => {
  const r = cast(0b101010);
  assert.equal(r.bian, null);
  assert.deepEqual(r.movingPositions, []);
});

test("不变量:每卦 本卦六亲∪伏神 覆盖全部五类六亲", () => {
  for (let b = 0; b < 64; b++) {
    const r = cast(b);
    const present = new Set(r.ben.lines.map((l) => l.relative));
    for (const f of r.fushen) present.add(f.relative);
    for (const rel of ALL_RELATIVES) {
      assert.ok(present.has(rel), `${r.ben.name} 缺六亲 ${rel}(本卦+伏神)`);
    }
  }
});

test("六神:按日干起例,且为青龙→…→玄武的连续轮转", () => {
  const r = cast(0b111111);
  const order = ["青龙", "朱雀", "勾陈", "螣蛇", "白虎", "玄武"];
  const start = order.indexOf(r.ben.lines[0].spirit);
  assert.ok(start >= 0, "初爻六神应在六神之列");
  for (let i = 0; i < 6; i++) {
    assert.equal(r.ben.lines[i].spirit, order[(start + i) % 6], `第${i + 1}爻六神错位`);
  }
});

test("占时:返回合法干支与旬空", () => {
  const r = cast(0b111111);
  assert.equal(r.date.dayGanZhi.length, 2, "日干支两字");
  assert.equal(r.date.xunKong.length, 2, "旬空两支");
  assert.ok("子丑寅卯辰巳午未申酉戌亥".includes(r.date.monthZhi), "月支合法");
});

test("摇卦:爻值恒在 6..9", () => {
  for (let i = 0; i < 200; i++) {
    const v = castOneLine();
    assert.ok(v >= 6 && v <= 9, `非法爻值 ${v}`);
  }
  assert.equal(castCoins().length, 6);
});
