export const minutes = (str: string): number => {
  const [hour, minute] = str.split(':').map((s) => parseInt(s));
  return hour * 60 + minute;
};

export const minutesToString = (mins: number): string => {
  const minutesAs = Math.abs(mins);
  const hour = Math.floor(minutesAs / 60).toString();
  const minute = (minutesAs % 60).toString().padStart(2, '0');
  const sign = mins < 0 ? '-' : '+';
  return `${sign}${hour}:${minute}`;
};
