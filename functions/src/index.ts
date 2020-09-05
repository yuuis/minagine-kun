import * as functions from 'firebase-functions';
import * as moment from 'moment';
import 'moment-timezone';
import { postToSlack } from './slack';
import { operations } from './operation';
import { runtimeOpts } from './runtimeOptions';
import { getBrowserPage, setValue } from './utils/page';
import { minutes, minutesToString } from './utils/time';
import { login } from './minagine/login';
import {
  checkPassedRegistrationInterval,
  confirmRegistered,
  register,
} from './minagine/registration';
import { latestOperation } from './minagine/latestOperation';

const { key } = require('./credentials');

// main function
export const minagine = functions
  .runWith(runtimeOpts)
  .region('asia-northeast1')
  .https.onRequest(async (req, res) => {
    // auth
    const x_token = req.header('x-token');
    if (x_token !== key) {
      console.error(`invalid key: ${x_token}`);
      await postToSlack(`[ERROR] invalid key: ${x_token}`);
      res.status(401).send('401 Unauthorized');
      return;
    }

    // param (start or end)
    const param = /\/(start|end)$/.exec(req.path);
    if (!param) {
      console.error(`invalid parameter: ${req.path}`);
      await postToSlack(`[ERROR] invalid parameter: ${req.path}`);
      res.status(200).send('Bad request');
      return;
    }
    const method = param[1];
    const operation = method === 'start' ? operations.start : operations.end;

    console.log(`selector is ${operation.selector}`);

    // init
    const page = await getBrowserPage();
    await page.emulate({
      viewport: {
        width: 1000,
        height: 2000,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        isLandscape: false,
      },
      userAgent:
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
    });

    // login
    await login(page).catch((e) => {
      console.error(`failed to login. error: ${e}`);
      return;
    });

    // check enough time passed from last registration
    await checkPassedRegistrationInterval(page).catch(async (e) => {
      console.error(e);
      await postToSlack(`[ERROR] ${e}`);
      res.status(200).send('Server Error. Last Operation is too new.');
      return;
    });

    // register
    await register(page, operation, method).catch((e) => {
      console.error(`failed to register. error: ${e}`);
      return;
    });

    // confirm registration
    await confirmRegistered(page, operation).catch(async (e) => {
      // なんかする
      console.error(e);
      await postToSlack(`[ERROR] ${e}`);
      res.status(200).send(`${e}`);
      return;
    });

    const latestOpe = await latestOperation(page);
    const operationName =
      latestOpe.ope === '勤務開始' ? 'Work Start' : 'Work End';
    await postToSlack(`*${operationName}* at ${latestOpe.datetimeFormatted}`);

    // TODO: separate to function (nomalize)
    // normalize worktime
    await page.goto('https://tm.minagine.net/work/wrktimemngmntshtself/sht', {
      waitUntil: 'networkidle2',
    });
    console.log('https://tm.minagine.net/work/wrktimemngmntshtself/sht');
    // change time range
    await page.$eval('#w', (el) => ((el as HTMLInputElement).value = '全て'));
    await page.$eval(
      '#main > form:nth-child(6) > div > table > tbody > tr > td.auto > input',
      (el) => (el as HTMLElement).click(),
    );
    await page.waitForSelector('#main_wide > form > div:nth-child(17) > input');
    // normalize worktime
    if (method === 'end') {
      const workStartSelector = `#model_${
        moment().date() - 1
      }_wrk_strt_apply_time`;
      const workStartString = await page.$eval(
        workStartSelector,
        (el) => (el as HTMLInputElement).value,
      );
      const workStart = moment.tz(workStartString, 'HHmm', 'Asia/Tokyo');
      const workEndSelector = `#model_${
        moment().date() - 1
      }_wrk_end_apply_time`;
      const workEndString = await page.$eval(
        workEndSelector,
        (el) => (el as HTMLInputElement).value,
      );
      const workEnd = moment.tz(workEndString, 'HHmm', 'Asia/Tokyo');
      const diff = workEnd.diff(
        moment.tz('2200', 'HHmm', 'Asia/Tokyo'),
        'minutes',
      );
      if (diff > 0) {
        const newWorkStart = workStart.subtract({ minute: diff });
        const newWorkStartString = newWorkStart.format('HHmm');
        await setValue(page, workStartSelector, newWorkStartString);
        await setValue(page, workEndSelector, '2200');
        await postToSlack(
          `Worktime adjusting: \`${workStartString}\` → \`${workEndString}\` to \`${newWorkStartString}\` → \`2200\``,
        );
      }
    }

    // TODO: separate to function (calculate / update table)
    // calculate and update table
    await page.$eval('#main_wide > form > div:nth-child(17) > input', (el) =>
      (el as HTMLElement).click(),
    );
    console.log('changed time range');

    // get worktime
    await page.waitForSelector(
      '#table_wrktimesht > tbody > tr:nth-child(3) > td:nth-child(15) > span:nth-child(1)',
    );
    const [worktimeStr, insufficientStr, extraStr] = await Promise.all([
      page.$eval(
        '#table_wrktimesht > tbody > tr:nth-child(3) > td:nth-child(15) > span:nth-child(1)',
        (el) => (el as HTMLElement).innerText,
      ),
      page.$eval(
        '#table_wrktimesht > tbody > tr:nth-child(3) > td:nth-child(16) > span',
        (el) => (el as HTMLElement).innerText,
      ),
      page.$eval(
        '#table_wrktimesht > tbody > tr:nth-child(3) > td:nth-child(17) > span:nth-child(1)',
        (el) => (el as HTMLElement).innerText,
      ),
    ]);
    console.log(
      `worktime: ${worktimeStr}, insufficient: ${insufficientStr}, extra: ${extraStr}`,
    );
    const [insufficient, extra] = [insufficientStr, extraStr].map((str) =>
      minutes(str),
    );
    const netExtra = minutesToString(extra - insufficient);
    const worktimeFormatted = `\`${worktimeStr}\` in total, \`${netExtra}\` than the criterion`;
    console.log(worktimeFormatted);

    // logout
    await page.$eval('#headlogin_ie > li.lastitem > a', (el) =>
      (el as HTMLElement).click(),
    );
    console.log('logged out');
    await postToSlack(`${worktimeFormatted}`);
    res.send('done');
  });
