import {Page} from 'puppeteer';
import * as moment from 'moment';
import {selectorName} from '../operation';
import {latestOperation} from './latestOperation';
import {moveMyPage} from './pages';

// check enough time passed from last registration
export const checkPassedRegistrationInterval = async (page: Page): Promise<void> => {
  const myPage = await moveMyPage(page);
  const {
    datetime: lastDatetime,
    datetimeFormatted: lastDatetimeFormatted,
  } = await latestOperation(myPage);
  const registerMinutesMargin = 5;

  console.log(`[moment] ${registerMinutesMargin} minutes before: ${moment().subtract(registerMinutesMargin, 'minutes').format()}`);
  if (!lastDatetime.isAfter(moment().subtract(registerMinutesMargin, 'minutes'))) {
    await Promise.reject(`Last Operation is too new: ${lastDatetimeFormatted}`);
  }

  console.log(`passed ${registerMinutesMargin} minutes from last operation.`);
};

// register operation
export const register = async (page: Page, operation: selectorName, method: string): Promise<void> => {
  const myPage = await moveMyPage(page);

  await myPage.$eval(operation.selector, el => (el as HTMLElement).click());

  console.log(`registered: ${method}`);
};

// confirm last operation
export const confirmRegistered = async (page: Page, operation: selectorName): Promise<void> => {
  const myPage = await moveMyPage(page);
  const { ope, datetime, datetimeFormatted } = await latestOperation(myPage);
  const checkMinutesMargin = 2;

  // check operation
  if (ope !== operation.name) {
    await Promise.reject(`Latest Operation is different from requested: ${ope}`);
  }

  // check operation time
  console.log(`[moment] ${checkMinutesMargin} minutes before: ${moment().subtract(checkMinutesMargin, 'minutes').format()}`);

  if (datetime.isSameOrBefore(moment().subtract(checkMinutesMargin, 'minutes'))) {
    await Promise.reject(`Latest Operation is too old than requested: ${datetimeFormatted}`);
  }
};
