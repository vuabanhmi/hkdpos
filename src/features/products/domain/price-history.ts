/**
 * Logic xác định có ghi dòng price_history hay không khi đổi giá trong một bảng giá.
 * Phải khớp với trigger `trg_price_list_items_write_history` trong migration
 * `supabase/migrations/20261008200646_products_pricing.sql`:
 * - Thêm mới (oldPrice = null, chưa có dòng trong price_list_items): luôn ghi lịch sử.
 * - Đổi giá mà giá mới khác giá cũ: ghi lịch sử.
 * - Lưu lại đúng giá cũ (giá không đổi): không ghi lịch sử.
 */
export function willRecordPriceHistory(oldPrice: number | null, newPrice: number): boolean {
  if (oldPrice === null) return true;
  return oldPrice !== newPrice;
}

export interface PriceHistoryEntryLike {
  oldPrice: number | null;
  newPrice: number;
}

/** Mô phỏng trigger cho một chuỗi lần đổi giá liên tiếp, trả về các lần thực sự ghi lịch sử. */
export function simulatePriceHistory(prices: number[]): PriceHistoryEntryLike[] {
  const entries: PriceHistoryEntryLike[] = [];
  let current: number | null = null;

  for (const price of prices) {
    if (willRecordPriceHistory(current, price)) {
      entries.push({ oldPrice: current, newPrice: price });
    }
    current = price;
  }

  return entries;
}
