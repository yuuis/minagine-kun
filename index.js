var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.minagine = void 0;
const puppeteer = require("puppeteer");
const { minagine_config, key, slack_config } = require("./credentials");
const moment = require("moment");
require("moment-timezone");
const axios_1 = require("axios");
const functions = require("firebase-functions");
const postToSlack = (text) => __awaiter(this, void 0, void 0, function* () {
    return yield axios_1.default
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
            console.log(`[slack] error: response.headers: ${error.response.headers}`);
        }
        // Something happened in setting up the request that triggered an Error
        else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            console.log(`[slack] error: request: ${error.request}`);
        }
        else
            console.log(`[slack] error: message: ${error.message}`);
        console.log(`[slack] error: config: ${error.config}`);
    });
});
const getBrowserPage = () => __awaiter(this, void 0, void 0, function* () {
    // Launch headless Chrome. Turn off sandbox so Chrome can run under root.
    const browser = yield puppeteer.launch({
        headless: true,
        args: ["--no-sandbox"],
    });
    return browser.newPage();
});
const setValue = (page, selector, text) => __awaiter(this, void 0, void 0, function* () {
    return yield page.$eval(selector, (el, text) => (el.value = text), text);
});
const minutes = (str) => {
    const [hour, minute] = str.split(":").map((s) => parseInt(s));
    return hour * 60 + minute;
};
const minutesToString = (minutes) => {
    const minutesAs = Math.abs(minutes);
    const hour = Math.floor(minutesAs / 60).toString();
    const minute = (minutesAs % 60).toString().padStart(2, "0");
    const sign = minutes < 0 ? "-" : "+";
    return `${sign}${hour}:${minute}`;
};
const latestDatetime = (page) => __awaiter(this, void 0, void 0, function* () {
    const row = yield Promise.all([
        page.$eval("#input_area > form > table.none_sortable_table > tbody > tr:nth-child(1) > td:nth-child(2)", (el) => el.innerText),
        page.$eval("#input_area > form > table.none_sortable_table > tbody > tr:nth-child(1) > td:nth-child(3)", (el) => el.innerText),
        page.$eval("#input_area > form > table.none_sortable_table > tbody > tr:nth-child(1) > td:nth-child(4)", (el) => el.innerText),
    ]);
    const [ope, d, t] = row.map((s) => /^(?:<[^>]+><[^>]+>)?([^<]+)(?:<[^>]+><[^>]+>)?$/.exec(s)[1]);
    const datetime = moment.tz(d + t, "YYYY/MM/DDHH:mm", "Asia/Tokyo");
    const datetimeFormatted = datetime.format("YYYY/MM/DD HH:mm");
    console.log(`latest operation: ${ope}`);
    console.log(`latest datetime: ${datetimeFormatted}`);
    return { ope, datetime, datetimeFormatted };
});
// メイン
exports.minagine = functions.https.onRequest((req, res) => __awaiter(this, void 0, void 0, function* () {
    // exports.minagine = async (req, res) => {
    // auth
    const x_token = req.header("x-token");
    if (x_token !== key) {
        console.error(`invalid key: ${x_token}`);
        yield postToSlack(`[ERROR] invalid key: ${x_token}`);
        res.status(401).send("401 Unauthorized");
        return;
    }
    // param
    const param = /\/(start|end)$/.exec(req.path);
    if (!param) {
        console.error(`invalid parameter: ${req.path}`);
        yield postToSlack(`[ERROR] invalid parameter: ${req.path}`);
        res.status(200).send("Bad request");
        return;
    }
    const method = param[1];
    const operation = method === 'start' ? operations.start : operations.end;
    console.log(`selector is ${operation.selector}`);
    // init
    const page = yield getBrowserPage();
    yield page.emulate({
        viewport: {
            width: 1000,
            height: 2000,
            deviceScaleFactor: 1,
            isMobile: false,
            hasTouch: false,
            isLandscape: false,
        },
        userAgent: "--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36",
    });
    // login
    yield page.goto("https://tm.minagine.net/index.html");
    console.log("https://tm.minagine.net/index.html");
    yield setValue(page, "#user_cntrctr_dmn", minagine_config.domain);
    yield setValue(page, "#user_login", minagine_config.email);
    yield setValue(page, "#user_password", minagine_config.password);
    yield page.$eval("#login_form > div > div:nth-child(2) > div:nth-child(5) > input", (el) => el.click());
    console.log("logged in");
    // move to registration page
    yield page.goto("https://tm.minagine.net/mypage/list", {
        waitUntil: "networkidle2",
    });
    console.log("https://tm.minagine.net/mypage/list");
    // check last registration
    const { datetime: lastDatetime, datetimeFormatted: lastDatetimeFormatted, } = yield latestDatetime(page);
    let minutesMargin = 5;
    console.log(`[moment] ${minutesMargin} minutes before: ${moment()
        .subtract(minutesMargin, "minutes")
        .format()}`);
    if (lastDatetime.isAfter(moment().subtract(minutesMargin, "minutes"))) {
        console.error(`Last Operation is too new: ${lastDatetimeFormatted}`);
        yield postToSlack(`[ERROR] last operation is too new: ${lastDatetimeFormatted}`);
        res.status(200).send("Server Error. Last Operation is too new.");
        return;
    }
    // register
    yield page.$eval(operation.selector, (el) => el.click());
    yield page.goto("https://tm.minagine.net/mypage/list", {
        waitUntil: "networkidle2",
    });
    console.log(`registered: ${method}`);
    // confirm registration
    const { ope, datetime, datetimeFormatted } = yield latestDatetime(page);
    // check operation
    if (operation.name !== ope) {
        console.error(`Latest Operation is different from requested: ${ope}`);
        yield postToSlack(`[ERROR] latest operation is different from requested: ${ope}`);
        res
            .status(200)
            .send("Server Error. Latest Operation is different from requested.");
        return;
    }
    // check registration time
    minutesMargin = 2;
    console.log(`[moment] ${minutesMargin} minutes before: ${moment()
        .subtract(minutesMargin, "minutes")
        .format()}`);
    if (datetime.isSameOrBefore(moment().subtract(minutesMargin, "minutes"))) {
        console.error(`Latest Operation is too old than requested: ${datetimeFormatted}`);
        yield postToSlack(`[ERROR] latest operation is too old than requested: ${datetimeFormatted}`);
        res
            .status(200)
            .send("Server Error. Latest Operation is too old than requested.");
        return;
    }
    const operationName = ope === "勤務開始" ? "Work Start" : "Work End";
    yield postToSlack(`*${operationName}* at ${datetimeFormatted}`);
    // normalize worktime
    yield page.goto("https://tm.minagine.net/work/wrktimemngmntshtself/sht", {
        waitUntil: "networkidle2",
    });
    console.log("https://tm.minagine.net/work/wrktimemngmntshtself/sht");
    // change time range
    yield page.$eval("#w", (el) => (el.value = "全て"));
    yield page.$eval("#main > form:nth-child(6) > div > table > tbody > tr > td.auto > input", (el) => el.click());
    yield page.waitForSelector("#main_wide > form > div:nth-child(17) > input");
    // normalize worktime
    if (method === "end") {
        const workStartSelector = `#model_${moment().date() - 1}_wrk_strt_apply_time`;
        const workStartString = yield page.$eval(workStartSelector, (el) => el.value);
        const workStart = moment.tz(workStartString, "HHmm", "Asia/Tokyo");
        const workEndSelector = `#model_${moment().date() - 1}_wrk_end_apply_time`;
        const workEndString = yield page.$eval(workEndSelector, (el) => el.value);
        const workEnd = moment.tz(workEndString, "HHmm", "Asia/Tokyo");
        const diff = workEnd.diff(moment.tz("2200", "HHmm", "Asia/Tokyo"), "minutes");
        if (diff > 0) {
            const newWorkStart = workStart.subtract({ minute: diff });
            const newWorkStartString = newWorkStart.format("HHmm");
            yield setValue(page, workStartSelector, newWorkStartString);
            yield setValue(page, workEndSelector, "2200");
            yield postToSlack(`Worktime adjusting: \`${workStartString}\` → \`${workEndString}\` to \`${newWorkStartString}\` → \`2200\``);
        }
    }
    // calculate and update table
    yield page.$eval("#main_wide > form > div:nth-child(17) > input", (el) => el.click());
    console.log("changed time range");
    // get worktime
    yield page.waitForSelector("#table_wrktimesht > tbody > tr:nth-child(3) > td:nth-child(15) > span:nth-child(1)");
    const [worktimeStr, insufficientStr, extraStr] = yield Promise.all([
        page.$eval("#table_wrktimesht > tbody > tr:nth-child(3) > td:nth-child(15) > span:nth-child(1)", (el) => el.innerText),
        page.$eval("#table_wrktimesht > tbody > tr:nth-child(3) > td:nth-child(16) > span", (el) => el.innerText),
        page.$eval("#table_wrktimesht > tbody > tr:nth-child(3) > td:nth-child(17) > span:nth-child(1)", (el) => el.innerText),
    ]);
    console.log(`worktime: ${worktimeStr}, insufficient: ${insufficientStr}, extra: ${extraStr}`);
    const [insufficient, extra] = [insufficientStr, extraStr].map((str) => minutes(str));
    const netExtra = minutesToString(extra - insufficient);
    const worktimeFormatted = `\`${worktimeStr}\` in total, \`${netExtra}\` than the criterion`;
    console.log(worktimeFormatted);
    // logout
    yield page.$eval("#headlogin_ie > li.lastitem > a", (el) => el.click());
    console.log("logged out");
    yield postToSlack(`${worktimeFormatted}`);
    res.send("done");
}));
const operations = {
    start: {
        selector: "#button0",
        name: "勤務開始",
    },
    end: {
        selector: "#button1",
        name: "勤務終了",
    },
};
