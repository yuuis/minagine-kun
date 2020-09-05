import {Page} from 'puppeteer';
import {OperationWithTime} from '../operation';
import * as moment from 'moment';
import {moveMyPage} from './pages';

export const latestOperation = async (page: Page): Promise<OperationWithTime> => {
  const myPage = await moveMyPage(page);

  const row = await Promise.all([
    myPage.evaluate((selector) => {
      return document.querySelector(selector)?.innerText;
    }, '#input_area > form > table.none_sortable_table > tbody > tr:nth-child(1) > td:nth-child(2)'),
    myPage.evaluate((selector) => {
      return document.querySelector(selector)?.innerText;
    }, '#input_area > form > table.none_sortable_table > tbody > tr:nth-child(1) > td:nth-child(3)'),
    myPage.evaluate((selector) => {
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
