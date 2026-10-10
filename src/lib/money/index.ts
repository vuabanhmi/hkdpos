/**
 * Tiền luôn là số nguyên đồng (VND). Không dùng số thực để tránh sai số làm tròn.
 */

export class InvalidMoneyError extends Error {}

/** Kiểm tra một giá trị có phải số tiền hợp lệ (số nguyên, không âm) hay không. */
export function isValidMoney(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

/** Ép một số về tiền hợp lệ, ném lỗi nếu không phải số nguyên không âm. */
export function assertMoney(value: number): number {
  if (!isValidMoney(value)) {
    throw new InvalidMoneyError(`Số tiền không hợp lệ: ${value}`);
  }
  return value;
}

/** Định dạng số tiền theo kiểu Việt Nam: dấu chấm ngăn nghìn, không có phần thập phân. */
export function formatMoney(amount: number): string {
  assertMoney(amount);
  return new Intl.NumberFormat('vi-VN').format(amount);
}

/** Định dạng kèm hậu tố "đ", ví dụ 1.234.567đ. */
export function formatMoneyWithUnit(amount: number): string {
  return `${formatMoney(amount)}đ`;
}

/**
 * Chuyển một chuỗi nhập tay (có thể có dấu chấm ngăn nghìn, dấu phẩy, khoảng trắng, "đ")
 * thành số tiền nguyên. Trả về null nếu không parse được hoặc ra số âm / không nguyên.
 */
export function parseMoney(input: string): number | null {
  const cleaned = input
    .trim()
    .replace(/đ|vnd/gi, '')
    .replace(/\s/g, '')
    .replace(/[.,]/g, '');

  if (cleaned === '') return null;
  if (!/^-?\d+$/.test(cleaned)) return null;

  const value = Number.parseInt(cleaned, 10);
  return isValidMoney(value) ? value : null;
}
