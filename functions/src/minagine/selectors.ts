export enum Selectors {
  // header
  logout = '#headlogin_ie > li.lastitem > a',

  // index page
  domain = '#user_cntrctr_dmn',
  email = '#user_login',
  password = '#user_password',
  login = '#login_form > div > div:nth-child(2) > div:nth-child(5) > input',

  // my page
  lastOperationName = '#input_area > form > table.none_sortable_table > tbody > tr:nth-child(1) > td:nth-child(2)',
  lastOperationDate = '#input_area > form > table.none_sortable_table > tbody > tr:nth-child(1) > td:nth-child(3)',
  lastOperationTime = '#input_area > form > table.none_sortable_table > tbody > tr:nth-child(1) > td:nth-child(4)',

  // workTimeManagement page
  targetWeek = '#w',
  show = '#main > form:nth-child(6) > div > table > tbody > tr > td.auto > input', // '表示'
  calculateAndUpdate = '#main_wide > form > div:nth-child(17) > input', // '簡易計算をして更新'
  totalWorkTime = '#table_wrktimesht > tbody > tr:nth-child(3) > td:nth-child(15) > span:nth-child(1)', // '合計勤務時間数'
  totalLeaveEarlyTime = '#table_wrktimesht > tbody > tr:nth-child(3) > td:nth-child(16) > span', // '合計遅早時間数'
  totalOutNormalRangeTime = '#table_wrktimesht > tbody > tr:nth-child(3) > td:nth-child(17) > span:nth-child(1)', // '合計時間外数'
}
