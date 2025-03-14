import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const APP_TIMEZONE = process.env.TZ ?? 'Asia/Tashkent';

export const nowInZone = () => dayjs().tz(APP_TIMEZONE);

export const todayIsoDate = (): string => nowInZone().format('YYYY-MM-DD');

export const toIsoDate = (value: Date | string): string => dayjs(value).tz(APP_TIMEZONE).format('YYYY-MM-DD');

export const isIsoDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value) && dayjs(value, 'YYYY-MM-DD', true).isValid();

export const monthBounds = (year: number, month: number): { start: string; end: string; days: number } => {
  const start = dayjs.tz(`${year}-${String(month).padStart(2, '0')}-01`, APP_TIMEZONE);
  const end = start.endOf('month');
  return { start: start.format('YYYY-MM-DD'), end: end.format('YYYY-MM-DD'), days: end.date() };
};

export const currentYearMonth = (): { year: number; month: number } => {
  const now = nowInZone();
  return { year: now.year(), month: now.month() + 1 };
};

export const previousYearMonth = (): { year: number; month: number } => {
  const prev = nowInZone().subtract(1, 'month');
  return { year: prev.year(), month: prev.month() + 1 };
};

export const formatTimestamp = (value: Date = new Date()): string => dayjs(value).tz(APP_TIMEZONE).format('DD.MM.YYYY HH:mm:ss');

export const eachDateOfRange = (start: string, end: string): string[] => {
  const result: string[] = [];
  let cursor = dayjs(start);
  const last = dayjs(end);
  while (!cursor.isAfter(last, 'day')) {
    result.push(cursor.format('YYYY-MM-DD'));
    cursor = cursor.add(1, 'day');
  }
  return result;
};

export const weekdayOf = (isoDate: string): number => dayjs(isoDate).day();
