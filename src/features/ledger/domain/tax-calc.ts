/**
 * Tính thuế GTGT/TNCN tạm tính từ doanh thu theo tỷ lệ — PHẢI khớp với logic
 * trong hàm SQL `revenue_by_tax_category` (round(revenue * rate)).
 */
export function computeGtgtAmount(revenue: number, gtgtRate: number): number {
  return Math.round(revenue * gtgtRate);
}

export function computeTncnAmount(revenue: number, tncnRate: number): number {
  return Math.round(revenue * tncnRate);
}

export interface TaxCategoryRevenueRow {
  revenue: number;
  gtgtAmount: number;
  tncnAmount: number;
}

export interface DeclarationTotals {
  totalRevenue: number;
  totalGtgt: number;
  totalTncn: number;
}

/** Tổng doanh thu và thuế tạm tính của toàn bộ các nhóm ngành nghề trong một kỳ. */
export function summarizeDeclaration(rows: TaxCategoryRevenueRow[]): DeclarationTotals {
  return rows.reduce(
    (acc, r) => ({
      totalRevenue: acc.totalRevenue + r.revenue,
      totalGtgt: acc.totalGtgt + r.gtgtAmount,
      totalTncn: acc.totalTncn + r.tncnAmount,
    }),
    { totalRevenue: 0, totalGtgt: 0, totalTncn: 0 },
  );
}

export interface RevenueThresholdStatus {
  cumulativeRevenue: number;
  threshold: number;
  warnPercent: number;
  percentUsed: number;
  isNearThreshold: boolean;
  isOverThreshold: boolean;
}

/**
 * Trạng thái doanh thu lũy kế so với ngưỡng cấu hình. "Gần ngưỡng" khi đã đạt
 * warnPercent (ví dụ 80%) nhưng chưa vượt; "vượt ngưỡng" khi >= 100%.
 */
export function computeRevenueThresholdStatus(
  cumulativeRevenue: number,
  threshold: number,
  warnPercent: number,
): RevenueThresholdStatus {
  const percentUsed = threshold > 0 ? cumulativeRevenue / threshold : 0;
  return {
    cumulativeRevenue,
    threshold,
    warnPercent,
    percentUsed,
    isNearThreshold: percentUsed >= warnPercent && percentUsed < 1,
    isOverThreshold: percentUsed >= 1,
  };
}
