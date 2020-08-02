import * as moment from "moment";

export const operations: operationList = {
  start: {
    selector: "#button0",
    name: "勤務開始",
  },
  end: {
    selector: "#button1",
    name: "勤務終了",
  },
};

export type operationList = {
  start: selectorName;
  end: selectorName;
};

export type selectorName = {
  selector: string;
  name: string;
};

export type OperationWithTime = {
  ope: string;
  datetime: moment.Moment;
  datetimeFormatted: string;
};
