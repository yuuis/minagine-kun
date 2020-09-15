import {Page} from 'puppeteer';
import {setValue} from '../utils/page';
import {Pages} from './pages';
import {Selectors} from './selectors';
const { minagine_config } = require('../credentials');

// auth to minagine
export const login = async (page: Page): Promise<Page> => {
  await page.goto(Pages.index);
  await page.waitForSelector(Selectors.login);
  console.log(`moved ${Pages.index}`);

  await setValue(page, Selectors.domain, minagine_config.domain);
  await setValue(page, Selectors.email, minagine_config.email);
  await setValue(page, Selectors.password, minagine_config.password);
  await Promise.all([
    page.waitForNavigation(),
    page.$eval(
      Selectors.login,
      el => (el as HTMLElement).click(),
    ),
  ]);
  console.log('logged in');
  return page;
};

export const logout = async (page: Page): Promise<void> => {
  await page.$eval(Selectors.logout, (el) =>
    (el as HTMLElement).click(),
  );
  console.log('logged out');
};
