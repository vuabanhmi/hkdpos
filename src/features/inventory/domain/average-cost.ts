/**
 * Công thức giá vốn bình quân gia quyền di động — PHẢI khớp với hàm SQL
 * `post_stock_document` trong `supabase/migrations/20261008222434_inventory.sql`.
 * Chỉ áp dụng khi NHẬP hàng (purchase_in). Xuất kho/điều chỉnh không đổi giá vốn
 * bình quân, chỉ định giá dòng xuất theo giá vốn hiện tại (xem `priceOutgoingMovement`).
 */
export function computeWeightedAverageCost(
  currentQty: number,
  currentAvgCost: number,
  purchaseQty: number,
  purchaseUnitCost: number,
): number {
  const totalQty = currentQty + purchaseQty;
  if (totalQty <= 0) return purchaseUnitCost;
  return Math.round((currentQty * currentAvgCost + purchaseQty * purchaseUnitCost) / totalQty);
}

/** Giá trị định cho một dòng xuất kho hoặc điều chỉnh: luôn bằng giá vốn hiện tại, không đổi. */
export function priceOutgoingMovement(currentAvgCost: number): number {
  return currentAvgCost;
}
