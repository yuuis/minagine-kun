import {Page} from 'puppeteer';
import {setValue} from '../utils/page';
import {Pages} from './pages';
import {Selectors} from './selectors';
const { minagine_config } = require('./credentials');

// auth to minagine
export const login = async (page: Page): Promise<void> => {
  await page.goto(Pages.index);
  console.log(`moved ${Pages.index}`);

  await setValue(page, Selectors.domain, minagine_config.domain);
  await setValue(page, Selectors.email, minagine_config.email);
  await setValue(page, Selectors.password, minagine_config.password);
  await page.$eval(
    Selectors.login,
    el => (el as HTMLElement).click(),
  );
  console.log('logged in');
};

export const logout = async (page: Page): Promise<void> => {
  await page.$eval(Selectors.logout, (el) =>
    (el as HTMLElement).click(),
  );
  console.log('logged out');
};
