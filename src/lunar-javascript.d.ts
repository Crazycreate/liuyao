/**
 * lunar-javascript 不自带 TS 类型,这里只声明六爻取占时干支/旬空用到的最小面。
 * 完整 API 见 https://6tail.cn/calendar/api.html
 */
declare module "lunar-javascript" {
  export class Solar {
    static fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number,
    ): Solar;
    getLunar(): Lunar;
    toYmdHms(): string;
  }

  export class Lunar {
    getEightChar(): EightChar;
    toString(): string;
  }

  export class EightChar {
    setSect(sect: number): void;
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getYearGan(): string;
    getYearZhi(): string;
    getDayXunKong(): string;
  }
}
