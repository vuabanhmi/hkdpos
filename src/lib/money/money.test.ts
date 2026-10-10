import { describe, expect, it } from 'vitest';
import {
  InvalidMoneyError,
  assertMoney,
  formatMoney,
  formatMoneyWithUnit,
  isValidMoney,
  parseMoney,
} from './index';

describe('isValidMoney', () => {
  it('chấp nhận số nguyên không âm', () => {
    expect(isValidMoney(0)).toBe(true);
    expect(isValidMoney(1234567)).toBe(true);
  });

  it('từ chối số âm, số thực, NaN', () => {
    expect(isValidMoney(-1)).toBe(false);
    expect(isValidMoney(1.5)).toBe(false);
    expect(isValidMoney(Number.NaN)).toBe(false);
  });
});

describe('assertMoney', () => {
  it('trả về nguyên giá trị khi hợp lệ', () => {
    expect(assertMoney(1000)).toBe(1000);
  });

  it('ném InvalidMoneyError khi không hợp lệ', () => {
    expect(() => assertMoney(-5)).toThrow(InvalidMoneyError);
    expect(() => assertMoney(1.5)).toThrow(InvalidMoneyError);
  });
});

describe('formatMoney', () => {
  it('dùng dấu chấm ngăn nghìn', () => {
    expect(formatMoney(1234567)).toBe('1.234.567');
    expect(formatMoney(0)).toBe('0');
    expect(formatMoney(1000)).toBe('1.000');
  });

  it('ném lỗi với số tiền không hợp lệ', () => {
    expect(() => formatMoney(-1)).toThrow(InvalidMoneyError);
  });
});

describe('formatMoneyWithUnit', () => {
  it('thêm hậu tố đ', () => {
    expect(formatMoneyWithUnit(1234567)).toBe('1.234.567đ');
  });
});

describe('parseMoney', () => {
  it('parse số có dấu chấm ngăn nghìn', () => {
    expect(parseMoney('1.234.567')).toBe(1234567);
  });

  it('parse số có dấu phẩy ngăn nghìn', () => {
    expect(parseMoney('1,234,567')).toBe(1234567);
  });

  it('parse số kèm hậu tố đ và khoảng trắng', () => {
    expect(parseMoney(' 1.234.567 đ ')).toBe(1234567);
    expect(parseMoney('50000 VND')).toBe(50000);
  });

  it('parse số thuần không có dấu ngăn cách', () => {
    expect(parseMoney('50000')).toBe(50000);
  });

  it('trả về null với chuỗi rỗng hoặc không phải số', () => {
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
    expect(parseMoney('12.34.56a')).toBeNull();
  });

  it('trả về null với số âm', () => {
    expect(parseMoney('-1000')).toBeNull();
  });
});
