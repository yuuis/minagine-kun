import {Page} from 'puppeteer';
import {moveWorkTimeManagementPage} from './pages';
import * as moment from 'moment';
import {setValue} from '../utils/page';
import {postToSlack} from '../slack';
import {minutes, minutesToString} from '../utils/time';
import {Selectors} from './selectors';

export const adjust = async (page: Page): Promise<void> => {
  const workTimePage = await moveWorkTimeManagementPage(page);

  await workTimePage.$eval(Selectors.targetWeek, (el) => ((el as HTMLInputElement).value = '全て'));
  await workTimePage.$eval(
    Selectors.show,
    (el) => (el as HTMLElement).click(),
  );
  await workTimePage.waitForSelector(Selectors.calculateAndUpdate); // '簡易計算して更新'

  // adjust work time
  const workStartSelector = `#model_${
    moment().date() - 1
  }_wrk_strt_apply_time`;
  const workStartString = await workTimePage.$eval(
    workStartSelector,
    (el) => (el as HTMLInputElement).value,
  );
  const workStart = moment.tz(workStartString, 'HHmm', 'Asia/Tokyo');

  const workEndSelector = `#model_${
    moment().date() - 1
  }_wrk_end_apply_time`;
  const workEndString = await workTimePage.$eval(
    workEndSelector,
    (el) => (el as HTMLInputElement).value,
  );
  const workEnd = moment.tz(workEndString, 'HHmm', 'Asia/Tokyo');

  const diff = workEnd.diff(
    moment.tz('2200', 'HHmm', 'Asia/Tokyo'),
    'minutes',
  );

  if (diff > 0) {
    const newWorkStart = workStart.subtract({minute: diff});
    const newWorkStartString = newWorkStart.format('HHmm');
    await setValue(workTimePage, workStartSelector, newWorkStartString);
    await setValue(workTimePage, workEndSelector, '2200');

    await workTimePage.$eval(Selectors.calculateAndUpdate, (el) =>
      (el as HTMLElement).click(),
    );
    console.log('adjusted time range');

    await postToSlack(
      `WorkTime adjusted: \`${workStartString}\` → \`${workEndString}\` to \`${newWorkStartString}\` → \`2200\``,
    );
  }
};

export const calculate = async (page: Page): Promise<void> => {
  const workTimePage = await moveWorkTimeManagementPage(page);

  // get work time
  await workTimePage.waitForSelector(Selectors.totalWorkTime);
  const [workTimeStr, insufficientStr, extraStr] = await Promise.all([
    workTimePage.$eval(
      Selectors.totalWorkTime,
      (el) => (el as HTMLElement).innerText,
    ),
    workTimePage.$eval(
      Selectors.totalLeaveEarlyTime,
      (el) => (el as HTMLElement).innerText,
    ),
    workTimePage.$eval(
      Selectors.totalOutNormalRangeTime,
      (el) => (el as HTMLElement).innerText,
    ),
  ]);

  console.log(`work time: ${workTimeStr}, insufficient: ${insufficientStr}, extra: ${extraStr}`);

  const [insufficient, extra] = [insufficientStr, extraStr].map((str) =>
    minutes(str),
  );
  const netExtra = minutesToString(extra - insufficient);
  const workTimeFormatted = `\`${workTimeStr}\` in total, \`${netExtra}\` than the criterion`;
  console.log(workTimeFormatted);

  await postToSlack(`${workTimeFormatted}`);
};
