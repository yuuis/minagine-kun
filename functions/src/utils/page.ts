import {Page, UnwrapElementHandle} from "puppeteer";
const puppeteer = require('puppeteer');

export const getBrowserPage = async (): Promise<Page> => {
  // Launch headless Chrome. Turn off sandbox so Chrome can run under root.
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
  });
  return browser.newPage();
};

export const setValue = async (page: Page, selector: string, text: string) =>
  await page.$eval(
    selector,
    (el: Element, elText: UnwrapElementHandle<string>) =>
      ((el as HTMLInputElement).value = elText),
    text
  );
