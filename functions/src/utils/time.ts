import {Page} from "puppeteer";
import {OperationWithTime} from "../operation";
import * as moment from "moment";

export const minutes = (str: string): number => {
  const [hour, minute] = str.split(':').map((s) => parseInt(s));
  return hour * 60 + minute;
};

export const minutesToString = (mins: number): string => {
  const minutesAs = Math.abs(mins);
  const hour = Math.floor(minutesAs / 60).toString();
  const minute = (minutesAs % 60).toString().padStart(2, '0');
  const sign = mins < 0 ? '-' : '+';
  return `${sign}${hour}:${minute}`;
};

export const latestDatetime = async (page: Page): Promise<OperationWithTime> => {
  const row = await Promise.all([
    // なぜか`$eval`だと動かない。
    page.evaluate((selector) => {
      return document.querySelector(selector)?.innerText;
    }, '#input_area > form > table.none_sortable_table > tbody > tr:nth-child(1) > td:nth-child(2)'),
    page.evaluate((selector) => {
      return document.querySelector(selector)?.innerText;
    }, '#input_area > form > table.none_sortable_table > tbody > tr:nth-child(1) > td:nth-child(3)'),
    page.evaluate((selector) => {
      return document.querySelector(selector)?.innerText;
    }, '#input_area > form > table.none_sortable_table > tbody > tr:nth-child(1) > td:nth-child(4)'),
  ]);
  const [ope, d, t] = row.map((s) => {
    const a = /^(?:<[^>]+><[^>]+>)?([^<]+)(?:<[^>]+><[^>]+>)?$/.exec(s);
    return a !== null ? a[1] : '';
  });

  const datetime = moment.tz(d + t, 'YYYY/MM/DDHH:mm', 'Asia/Tokyo');
  const datetimeFormatted = datetime.format('YYYY/MM/DD HH:mm');
  console.log(`latest operation: ${ope}`);
  console.log(`latest datetime: ${datetimeFormatted}`);
  return { ope, datetime, datetimeFormatted };
};
