import { describe, expect, it } from 'vitest';
import {
  endOfDayVN,
  formatDateTimeVN,
  formatDateVN,
  formatISODateVN,
  monthRangeVN,
  quarterRangeVN,
  startOfDayVN,
} from './index';

// Việt Nam là UTC+7, không có giờ mùa hè (DST), nên các mốc giờ dưới đây cố định.

describe('startOfDayVN / endOfDayVN', () => {
  it('đầu ngày và cuối ngày đúng múi giờ Việt Nam', () => {
    // 2026-01-15T20:30:00Z = 2026-01-16T03:30:00+07:00
    const instant = new Date('2026-01-15T20:30:00.000Z');

    expect(startOfDayVN(instant).toISOString()).toBe('2026-01-15T17:00:00.000Z');
    expect(endOfDayVN(instant).toISOString()).toBe('2026-01-16T16:59:59.999Z');
  });

  it('đơn lúc 23:59 và 00:01 giờ Việt Nam rơi vào hai ngày khác nhau', () => {
    // 23:59:30 ngày 15/01 (VN) = 16:59:30Z cùng ngày
    const late = new Date('2026-01-15T16:59:30.000Z');
    // 00:01:00 ngày 16/01 (VN) = 17:01:00Z ngày 15
    const early = new Date('2026-01-15T17:01:00.000Z');

    expect(formatDateVN(late)).toBe('15/01/2026');
    expect(formatDateVN(early)).toBe('16/01/2026');
    expect(startOfDayVN(late).toISOString()).not.toBe(startOfDayVN(early).toISOString());
  });
});

describe('monthRangeVN', () => {
  it('tính đúng khoảng của tháng 2/2026 (28 ngày, không nhuận)', () => {
    const { start, end } = monthRangeVN(2026, 2);
    expect(start.toISOString()).toBe('2026-01-31T17:00:00.000Z');
    expect(end.toISOString()).toBe('2026-02-28T16:59:59.999Z');
  });

  it('tính đúng khoảng của tháng có 31 ngày', () => {
    const { start, end } = monthRangeVN(2026, 1);
    expect(start.toISOString()).toBe('2025-12-31T17:00:00.000Z');
    expect(end.toISOString()).toBe('2026-01-31T16:59:59.999Z');
  });
});

describe('quarterRangeVN', () => {
  it('tính đúng khoảng của quý 1/2026', () => {
    const { start, end } = quarterRangeVN(2026, 1);
    expect(start.toISOString()).toBe('2025-12-31T17:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-31T16:59:59.999Z');
  });

  it('tính đúng khoảng của quý 4/2026', () => {
    const { start, end } = quarterRangeVN(2026, 4);
    expect(start.toISOString()).toBe('2026-09-30T17:00:00.000Z');
    expect(end.toISOString()).toBe('2026-12-31T16:59:59.999Z');
  });
});

describe('formatDateVN / formatDateTimeVN', () => {
  it('định dạng dd/MM/yyyy', () => {
    expect(formatDateVN(new Date('2026-03-05T10:00:00.000Z'))).toBe('05/03/2026');
  });

  it('định dạng dd/MM/yyyy HH:mm:ss theo giờ Việt Nam', () => {
    expect(formatDateTimeVN(new Date('2026-03-05T10:00:00.000Z'))).toBe('05/03/2026 17:00:00');
  });

  it('formatISODateVN trả về yyyy-MM-dd theo giờ Việt Nam', () => {
    expect(formatISODateVN(new Date('2026-03-05T10:00:00.000Z'))).toBe('2026-03-05');
    // 2026-01-15T17:01:00Z = 2026-01-16T00:01:00+07:00 -> đã sang ngày 16.
    expect(formatISODateVN(new Date('2026-01-15T17:01:00.000Z'))).toBe('2026-01-16');
  });
});
