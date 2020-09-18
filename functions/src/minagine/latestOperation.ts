import {Page} from 'puppeteer';
import {OperationWithTime} from '../operation';
import * as moment from 'moment';
import {moveMyPage} from './pages';
import {Selectors} from './selectors';

export const latestOperation = async (page: Page): Promise<OperationWithTime> => {
  const myPage = await moveMyPage(page);
  await myPage.waitForSelector(Selectors.lastOperationName, { timeout: 30000, visible: true });

  const row = await Promise.all([
    myPage.evaluate((selector) => {
      return document.querySelector(selector).innerText;
    }, Selectors.lastOperationName),
    myPage.evaluate((selector) => {
      return document.querySelector(selector).innerText;
    }, Selectors.lastOperationDate),
    myPage.evaluate((selector) => {
      return document.querySelector(selector).innerText;
    }, Selectors.lastOperationTime),
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
