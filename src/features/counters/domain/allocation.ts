/**
 * Phân bổ giảm giá cả đơn về từng dòng hàng theo tỷ lệ line_total trong subtotal —
 * PHẢI khớp với logic trong hàm SQL `complete_order`
 * (`supabase/migrations/20261009024836_counters.sql`). Phần dư do làm tròn dồn
 * vào dòng cuối để tổng phân bổ khớp đúng discount_total đến từng đồng.
 */
export function allocateOrderDiscount(lineTotals: number[], discountTotal: number, subtotal: number): number[] {
  if (subtotal === 0 || discountTotal === 0) {
    return lineTotals.map(() => 0);
  }

  const allocations: number[] = [];
  let running = 0;

  lineTotals.forEach((lineTotal, index) => {
    if (index === lineTotals.length - 1) {
      allocations.push(discountTotal - running);
    } else {
      const amount = Math.round((discountTotal * lineTotal) / subtotal);
      running += amount;
      allocations.push(amount);
    }
  });

  return allocations;
}

export interface OrderLineForCounter {
  quantity: number;
  unitPrice: number;
  discount: number;
  allocatedOrderDiscount: number;
}

/** Doanh số gộp = số lượng x đơn giá (làm tròn đồng). */
export function computeGrossAmount(line: Pick<OrderLineForCounter, "quantity" | "unitPrice">): number {
  return Math.round(line.quantity * line.unitPrice);
}

/** Doanh thu thực của dòng = gộp - giảm giá dòng - phần giảm giá cả đơn phân bổ về dòng này. */
export function computeNetAmount(line: OrderLineForCounter): number {
  return computeGrossAmount(line) - line.discount - line.allocatedOrderDiscount;
}
