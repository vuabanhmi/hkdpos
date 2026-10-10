/**
 * Tính tiền giỏ hàng / đơn hàng — PHẢI khớp với hàm SQL `save_draft_order_items`
 * trong `supabase/migrations/20261008232823_orders.sql`.
 * UI không tự tính tiền; chỉ gọi các hàm này để xem trước, số liệu thật do RPC
 * phía DB tính lại và lưu.
 */

export interface OrderLineInput {
  quantity: number;
  unitPrice: number;
  discount: number;
}

/** Tiền một dòng hàng = số lượng x đơn giá (làm tròn đồng) - giảm giá dòng, không âm. */
export function computeLineTotal(line: OrderLineInput): number {
  const gross = Math.round(line.quantity * line.unitPrice);
  return Math.max(0, gross - line.discount);
}

export interface OrderTotals {
  subtotal: number;
  discountTotal: number;
  total: number;
}

/** subtotal = tổng tiền các dòng; total = subtotal - giảm giá cả đơn (không vượt subtotal). */
export function computeOrderTotals(lines: OrderLineInput[], orderDiscount: number): OrderTotals {
  const subtotal = lines.reduce((sum, line) => sum + computeLineTotal(line), 0);
  const discountTotal = Math.min(Math.max(0, orderDiscount), subtotal);
  return { subtotal, discountTotal, total: subtotal - discountTotal };
}

/** Công nợ còn lại = total - đã trả, không âm. */
export function computeDebt(total: number, paidTotal: number): number {
  return Math.max(0, total - paidTotal);
}
