import {Page} from 'puppeteer';

export enum Pages {
  index = 'https://tm.minagine.net/index.html',
  mypage = 'https://tm.minagine.net/mypage',
  workTimeManagement = 'https://tm.minagine.net/work/wrktimemngmntshtself/sht',
}

export const moveMyPage = async (page: Page): Promise<Page> => movePage(page, Pages.mypage);

export const moveWorkTimeManagementPage = async (page: Page): Promise<Page> => movePage(page, Pages.workTimeManagement);

const movePage = async (page: Page, target: string): Promise<Page> => {
  console.log(`[movePage] now in ${page.url()} and target is ${target}`);
  if (!(page.url() === target)) {
    await page.goto(target, {
      waitUntil: 'networkidle2',
    });
    console.log(`moved ${target}`);
  }
  return page;
};
