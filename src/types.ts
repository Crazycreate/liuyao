/** 五行 */
export type Element = "金" | "木" | "水" | "火" | "土";

/** 六亲 */
export type Relative = "父母" | "兄弟" | "子孙" | "妻财" | "官鬼";

/** 六神 */
export type Spirit = "青龙" | "朱雀" | "勾陈" | "螣蛇" | "白虎" | "玄武";

/** 单爻的状态标注(均为确定性事实,供断卦参考) */
export interface LineFlags {
  /** 旬空(逢日辰所在旬之空亡) */
  xunKong: boolean;
  /** 月破(地支冲月建) */
  yueBreak: boolean;
  /** 日冲(地支冲日辰) */
  riChong: boolean;
  /** 日合(地支与日辰六合) */
  riHe: boolean;
  /** 临日辰(地支与日辰相同) */
  linRi: boolean;
  /** 临月建(地支与月建相同) */
  linYue: boolean;
}

/** 一爻 */
export interface Line {
  /** 爻位 1..6(初→上) */
  pos: number;
  /** 是否阳爻 */
  yang: boolean;
  /** 是否动爻(老阴/老阳) */
  moving: boolean;
  /** 动爻变出后的阴阳(仅动爻有意义) */
  changedYang: boolean | null;
  /** 纳甲天干 */
  gan: string;
  /** 纳甲地支 */
  zhi: string;
  /** 地支五行 */
  element: Element;
  /** 六亲 */
  relative: Relative;
  /** 六神 */
  spirit: Spirit;
  /** 是否世爻 */
  isShi: boolean;
  /** 是否应爻 */
  isYing: boolean;
  /** 状态标注 */
  flags: LineFlags;
}

/** 伏神(用神不上卦时,伏于本宫卦对应爻下) */
export interface Fushen {
  /** 伏于第几爻(1..6) */
  pos: number;
  relative: Relative;
  gan: string;
  zhi: string;
  element: Element;
}

/** 占卦时间(干支历) */
export interface DivineDate {
  /** 公历输入回显 */
  solar: string;
  yearGanZhi: string;
  monthGanZhi: string;
  dayGanZhi: string;
  hourGanZhi: string;
  dayGan: string;
  dayZhi: string;
  monthZhi: string;
  /** 日空亡(两个地支) */
  xunKong: [string, string];
}

/** 一个卦(本卦或变卦):卦象信息 + 六爻 */
export interface GuaState {
  name: string;
  upper: string;
  lower: string;
  palace: string;
  palaceElement: Element;
  palaceType: string;
  shiYao: number;
  yingYao: number;
  /** 6 爻,index 0 = 初爻,index 5 = 上爻 */
  lines: Line[];
}

/** 一次完整起卦的结果 */
export interface Reading {
  question: string;
  date: DivineDate;
  /** 每爻的摇卦数值(6/7/8/9),初→上 */
  coinValues: number[];
  /** 本卦 */
  ben: GuaState;
  /** 变卦(有动爻时存在) */
  bian: GuaState | null;
  /** 动爻位置(1..6) */
  movingPositions: number[];
  /** 伏神 */
  fushen: Fushen[];
}
