import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

/** Múi giờ nghiệp vụ của toàn bộ ứng dụng. */
export const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export interface DateRange {
  start: Date;
  end: Date;
}

interface VnWallClock {
  year: number;
  month: number; // 1-12
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
  ms?: number;
}

/**
 * Chuyển một mốc giờ "tường" (giờ Việt Nam) thành thời điểm UTC thực (Date/instant).
 *
 * fromZonedTime đọc các getter giờ địa phương (getHours, getDate, ...) của Date truyền vào,
 * nên phải dựng bằng constructor local `new Date(y, m, d, ...)` — dựng bằng Date.UTC sẽ bị
 * lệch theo múi giờ hệ thống của máy chạy code.
 */
function vnWallClockToUtc({
  year,
  month,
  day,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0,
}: VnWallClock): Date {
  const naive = new Date(year, month - 1, day, hour, minute, second, ms);
  return fromZonedTime(naive, VN_TIME_ZONE);
}

/** Số ngày của một tháng (1-12), tính theo lịch thường (không liên quan múi giờ). */
function daysInMonthOf(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Đầu ngày (00:00:00.000) theo giờ Việt Nam của thời điểm truyền vào. */
export function startOfDayVN(date: Date = new Date()): Date {
  const { year, month, day } = vnDateParts(date);
  return vnWallClockToUtc({ year, month, day });
}

/** Cuối ngày (23:59:59.999) theo giờ Việt Nam của thời điểm truyền vào. */
export function endOfDayVN(date: Date = new Date()): Date {
  const { year, month, day } = vnDateParts(date);
  return vnWallClockToUtc({ year, month, day, hour: 23, minute: 59, second: 59, ms: 999 });
}

/** Khoảng thời gian của một tháng (1-12) theo giờ Việt Nam. */
export function monthRangeVN(year: number, month: number): DateRange {
  const start = vnWallClockToUtc({ year, month, day: 1 });
  const daysInMonth = daysInMonthOf(year, month);
  const end = vnWallClockToUtc({
    year,
    month,
    day: daysInMonth,
    hour: 23,
    minute: 59,
    second: 59,
    ms: 999,
  });
  return { start, end };
}

/** Khoảng thời gian của một quý (1-4) theo giờ Việt Nam. */
export function quarterRangeVN(year: number, quarter: 1 | 2 | 3 | 4): DateRange {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const start = vnWallClockToUtc({ year, month: startMonth, day: 1 });
  const daysInEndMonth = daysInMonthOf(year, endMonth);
  const end = vnWallClockToUtc({
    year,
    month: endMonth,
    day: daysInEndMonth,
    hour: 23,
    minute: 59,
    second: 59,
    ms: 999,
  });
  return { start, end };
}

/** Lấy năm/tháng/ngày theo giờ Việt Nam của một thời điểm. */
export function vnDateParts(date: Date): { year: number; month: number; day: number } {
  const year = Number(formatInTimeZone(date, VN_TIME_ZONE, 'yyyy'));
  const month = Number(formatInTimeZone(date, VN_TIME_ZONE, 'M'));
  const day = Number(formatInTimeZone(date, VN_TIME_ZONE, 'd'));
  return { year, month, day };
}

/** Định dạng ngày theo quy ước giao diện: dd/MM/yyyy, theo giờ Việt Nam. */
export function formatDateVN(date: Date): string {
  return formatInTimeZone(date, VN_TIME_ZONE, 'dd/MM/yyyy');
}

/** Định dạng ngày giờ: dd/MM/yyyy HH:mm:ss, theo giờ Việt Nam. */
export function formatDateTimeVN(date: Date): string {
  return formatInTimeZone(date, VN_TIME_ZONE, 'dd/MM/yyyy HH:mm:ss');
}

/** Định dạng ngày dạng yyyy-MM-dd theo giờ Việt Nam — dùng làm tham số cho các hàm SQL nhận `date`. */
export function formatISODateVN(date: Date): string {
  return formatInTimeZone(date, VN_TIME_ZONE, 'yyyy-MM-dd');
}
