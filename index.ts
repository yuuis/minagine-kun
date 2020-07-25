import { Page, UnwrapElementHandle } from "puppeteer";

const puppeteer = require("puppeteer");
const { minagine_config, key, slack_config } = require("./credentials");
import * as moment from "moment";
import "moment-timezone";
import axios from "axios";
import * as functions from "firebase-functions";

const postToSlack = async (text: string): Promise<void> =>
  await axios
    .post(slack_config.url, { text })
    .then((res) => {
      console.log(`[slack] data: ${res.data}`);
      console.log(`[slack] status: ${res.status}`);
      console.log(`[slack] statusText: ${res.statusText}`);
      console.log(`[slack] headers: ${res.headers}`);
      console.log(`[slack] config: ${res.config}`);
    })
    .catch((error) => {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log(`[slack] error: response.data: ${error.response.data}`);
        console.log(`[slack] error: response.status: ${error.response.status}`);
        console.log(
          `[slack] error: response.headers: ${error.response.headers}`
        );
      }
      // Something happened in setting up the request that triggered an Error
      else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.log(`[slack] error: request: ${error.request}`);
      } else console.log(`[slack] error: message: ${error.message}`);

      console.log(`[slack] error: config: ${error.config}`);
    });

const getBrowserPage = async (): Promise<Page> => {
  // Launch headless Chrome. Turn off sandbox so Chrome can run under root.
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox"],
  });
  return browser.newPage();
};

const setValue = async (page: Page, selector: string, text: string) =>
  await page.$eval(
    selector,
    (el: HTMLInputElement, text: UnwrapElementHandle<string>) =>
      (el.value = text),
    text
  );

const minutes = (str: string): number => {
  const [hour, minute] = str.split(":").map((s) => parseInt(s));
  return hour * 60 + minute;
};

const minutesToString = (minutes: number): string => {
  const minutesAs = Math.abs(minutes);
  const hour = Math.floor(minutesAs / 60).toString();
  const minute = (minutesAs % 60).toString().padStart(2, "0");
  const sign = minutes < 0 ? "-" : "+";
  return `${sign}${hour}:${minute}`;
};

const latestDatetime = async (page: Page): Promise<OperationWithTime> => {
  const row = await Promise.all([
    page.$eval(
      "#input_area > form > table.none_sortable_table > tbody > tr:nth-child(1) > td:nth-child(2)",
      (el: HTMLElement) => el.innerText
    ),
    page.$eval(
      "#input_area > form > table.none_sortable_table > tbody > tr:nth-child(1) > td:nth-child(3)",
      (el: HTMLElement) => el.innerText
    ),
    page.$eval(
      "#input_area > form > table.none_sortable_table > tbody > tr:nth-child(1) > td:nth-child(4)",
      (el: HTMLElement) => el.innerText
    ),
  ]);
  const [ope, d, t] = row.map(
    (s) => /^(?:<[^>]+><[^>]+>)?([^<]+)(?:<[^>]+><[^>]+>)?$/.exec(s)[1]
  );
  const datetime = moment.tz(d + t, "YYYY/MM/DDHH:mm", "Asia/Tokyo");
  const datetimeFormatted = datetime.format("YYYY/MM/DD HH:mm");
  console.log(`latest operation: ${ope}`);
  console.log(`latest datetime: ${datetimeFormatted}`);
  return { ope, datetime, datetimeFormatted };
};

type OperationWithTime = {
  ope: string;
  datetime: moment.Moment;
  datetimeFormatted: string;
};

// メイン
export const minagine = functions.https.onRequest(
  async (req: functions.https.Request, res: functions.Response<any>) => {
    // exports.minagine = async (req, res) => {
    // auth
    const x_token = req.header("x-token");
    if (x_token !== key) {
      console.error(`invalid key: ${x_token}`);
      await postToSlack(`[ERROR] invalid key: ${x_token}`);
      res.status(401).send("401 Unauthorized");
      return;
    }

    // param
    const param = /\/(start|end)$/.exec(req.path);
    if (!param) {
      console.error(`invalid parameter: ${req.path}`);
      await postToSlack(`[ERROR] invalid parameter: ${req.path}`);
      res.status(200).send("Bad request");
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
        "--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36",
    });

    // login
    await page.goto("https://tm.minagine.net/index.html");
    console.log("https://tm.minagine.net/index.html");
    await setValue(page, "#user_cntrctr_dmn", minagine_config.domain);
    await setValue(page, "#user_login", minagine_config.email);
    await setValue(page, "#user_password", minagine_config.password);
    await page.$eval(
      "#login_form > div > div:nth-child(2) > div:nth-child(5) > input",
      (el: HTMLElement) => el.click()
    );
    console.log("logged in");

    // move to registration page
    await page.goto("https://tm.minagine.net/mypage/list", {
      waitUntil: "networkidle2",
    });
    console.log("https://tm.minagine.net/mypage/list");

    // check last registration
    const {
      datetime: lastDatetime,
      datetimeFormatted: lastDatetimeFormatted,
    } = await latestDatetime(page);
    let minutesMargin = 5;
    console.log(
      `[moment] ${minutesMargin} minutes before: ${moment()
        .subtract(minutesMargin, "minutes")
        .format()}`
    );
    if (lastDatetime.isAfter(moment().subtract(minutesMargin, "minutes"))) {
      console.error(`Last Operation is too new: ${lastDatetimeFormatted}`);
      await postToSlack(
        `[ERROR] last operation is too new: ${lastDatetimeFormatted}`
      );
      res.status(200).send("Server Error. Last Operation is too new.");
      return;
    }

    // register
    await page.$eval(operation.selector, (el: HTMLElement) => el.click());
    await page.goto("https://tm.minagine.net/mypage/list", {
      waitUntil: "networkidle2",
    });
    console.log(`registered: ${method}`);

    // confirm registration
    const { ope, datetime, datetimeFormatted } = await latestDatetime(page);
    // check operation
    if (operation.name !== ope) {
      console.error(`Latest Operation is different from requested: ${ope}`);
      await postToSlack(
        `[ERROR] latest operation is different from requested: ${ope}`
      );
      res
        .status(200)
        .send("Server Error. Latest Operation is different from requested.");
      return;
    }
    // check registration time
    minutesMargin = 2;
    console.log(
      `[moment] ${minutesMargin} minutes before: ${moment()
        .subtract(minutesMargin, "minutes")
        .format()}`
    );
    if (datetime.isSameOrBefore(moment().subtract(minutesMargin, "minutes"))) {
      console.error(
        `Latest Operation is too old than requested: ${datetimeFormatted}`
      );
      await postToSlack(
        `[ERROR] latest operation is too old than requested: ${datetimeFormatted}`
      );
      res
        .status(200)
        .send("Server Error. Latest Operation is too old than requested.");
      return;
    }

    const operationName = ope === "勤務開始" ? "Work Start" : "Work End";
    await postToSlack(`*${operationName}* at ${datetimeFormatted}`);

    // normalize worktime
    await page.goto("https://tm.minagine.net/work/wrktimemngmntshtself/sht", {
      waitUntil: "networkidle2",
    });
    console.log("https://tm.minagine.net/work/wrktimemngmntshtself/sht");
    // change time range
    await page.$eval("#w", (el: HTMLInputElement) => (el.value = "全て"));
    await page.$eval(
      "#main > form:nth-child(6) > div > table > tbody > tr > td.auto > input",
      (el: HTMLElement) => el.click()
    );
    await page.waitForSelector("#main_wide > form > div:nth-child(17) > input");
    // normalize worktime
    if (method === "end") {
      const workStartSelector = `#model_${
        moment().date() - 1
      }_wrk_strt_apply_time`;
      const workStartString = await page.$eval(
        workStartSelector,
        (el: HTMLInputElement) => el.value
      );
      const workStart = moment.tz(workStartString, "HHmm", "Asia/Tokyo");
      const workEndSelector = `#model_${
        moment().date() - 1
      }_wrk_end_apply_time`;
      const workEndString = await page.$eval(
        workEndSelector,
        (el: HTMLInputElement) => el.value
      );
      const workEnd = moment.tz(workEndString, "HHmm", "Asia/Tokyo");
      const diff = workEnd.diff(
        moment.tz("2200", "HHmm", "Asia/Tokyo"),
        "minutes"
      );
      if (diff > 0) {
        const newWorkStart = workStart.subtract({ minute: diff });
        const newWorkStartString = newWorkStart.format("HHmm");
        await setValue(page, workStartSelector, newWorkStartString);
        await setValue(page, workEndSelector, "2200");
        await postToSlack(
          `Worktime adjusting: \`${workStartString}\` → \`${workEndString}\` to \`${newWorkStartString}\` → \`2200\``
        );
      }
    }
    // calculate and update table
    await page.$eval(
      "#main_wide > form > div:nth-child(17) > input",
      (el: HTMLElement) => el.click()
    );
    console.log("changed time range");

    // get worktime
    await page.waitForSelector(
      "#table_wrktimesht > tbody > tr:nth-child(3) > td:nth-child(15) > span:nth-child(1)"
    );
    const [worktimeStr, insufficientStr, extraStr] = await Promise.all([
      page.$eval(
        "#table_wrktimesht > tbody > tr:nth-child(3) > td:nth-child(15) > span:nth-child(1)",
        (el: HTMLElement) => el.innerText
      ),
      page.$eval(
        "#table_wrktimesht > tbody > tr:nth-child(3) > td:nth-child(16) > span",
        (el: HTMLElement) => el.innerText
      ),
      page.$eval(
        "#table_wrktimesht > tbody > tr:nth-child(3) > td:nth-child(17) > span:nth-child(1)",
        (el: HTMLElement) => el.innerText
      ),
    ]);
    console.log(
      `worktime: ${worktimeStr}, insufficient: ${insufficientStr}, extra: ${extraStr}`
    );
    const [insufficient, extra] = [insufficientStr, extraStr].map((str) =>
      minutes(str)
    );
    const netExtra = minutesToString(extra - insufficient);
    const worktimeFormatted = `\`${worktimeStr}\` in total, \`${netExtra}\` than the criterion`;
    console.log(worktimeFormatted);

    // logout
    await page.$eval("#headlogin_ie > li.lastitem > a", (el: HTMLElement) =>
      el.click()
    );
    console.log("logged out");
    await postToSlack(`${worktimeFormatted}`);
    res.send("done");
  }
);

const operations: operationList = {
  start: {
    selector: "#button0",
    name: "勤務開始",
  },
  end: {
    selector: "#button1",
    name: "勤務終了",
  },
};

type operationList = {
  start: selectorName;
  end: selectorName;
};

type selectorName = {
  selector: string;
  name: string;
};
