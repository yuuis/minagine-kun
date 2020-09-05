import {Page} from 'puppeteer';
import {setValue} from '../utils/page';
import {Pages} from './pages';
const { minagine_config } = require('./credentials');

// login to minagine
export const login = async (page: Page): Promise<void> => {
  await page.goto(Pages.index);
  console.log(`moved ${Pages.index}`);

  await setValue(page, '#user_cntrctr_dmn', minagine_config.domain);
  await setValue(page, '#user_login', minagine_config.email);
  await setValue(page, '#user_password', minagine_config.password);
  await page.$eval(
    '#login_form > div > div:nth-child(2) > div:nth-child(5) > input',
    el => (el as HTMLElement).click(),
  );
  console.log('logged in');
};
