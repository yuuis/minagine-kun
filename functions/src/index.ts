import * as functions from 'firebase-functions';
import 'moment-timezone';
import { postToSlack } from './slack';
import { operations } from './operation';
import { runtimeOpts } from './runtimeOptions';
import { getBrowserPage } from './utils/page';
import {login, logout} from './minagine/auth';
import {
  checkPassedRegistrationInterval,
  confirmRegistered,
  register,
} from './minagine/registration';
import { latestOperation } from './minagine/latestOperation';
import {adjust, calculate} from './minagine/workTime';

const { key } = require('../credentials');

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

    // init page
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

    try {
      // login
      const indexPage = await login(page);

      // check enough time passed from last registration
      await checkPassedRegistrationInterval(indexPage);

      // register
      const myPage = await register(page, operation, method);

      // confirm registration
      await confirmRegistered(myPage, operation);

      // post to slack registration
      const latestOpe = await latestOperation(myPage);
      const operationName =
        latestOpe.ope === '勤務開始' ? 'Work Start' : 'Work End';
      await postToSlack(`*${operationName}* at ${latestOpe.datetimeFormatted}`);

      // adjust work time
      if (method === 'end') {
        await adjust(myPage);
      }

      // calculate
      await calculate(myPage);

      // logout
      await logout(myPage);
      res.send('done');
    } catch (e) {
      console.error(`${e}`);
      await postToSlack(`[ERROR] ${e}`);
      res.status(200).send(`${e}`);
      return;
    }
  });
