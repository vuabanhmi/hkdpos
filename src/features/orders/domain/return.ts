/**
 * Tính tiền trả hàng — PHẢI khớp với hàm SQL `create_return` trong
 * `supabase/migrations/20261008232823_orders.sql`: đơn giá hiệu lực của dòng
 * gốc (đã gồm giảm giá dòng) = line_total / quantity gốc.
 */
export function computeReturnAmount(
  originalQuantity: number,
  originalLineTotal: number,
  returnedQuantity: number,
): number {
  if (originalQuantity <= 0) return 0;
  const effectiveUnitPrice = originalLineTotal / originalQuantity;
  return Math.round(returnedQuantity * effectiveUnitPrice);
}

/** Số lượng còn có thể trả của một dòng hàng. */
export function computeRemainingReturnable(originalQuantity: number, alreadyReturned: number): number {
  return Math.max(0, originalQuantity - alreadyReturned);
}
