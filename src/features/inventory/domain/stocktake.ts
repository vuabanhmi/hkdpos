export interface StocktakeLineLike {
  systemQty: number;
  countedQty: number | null;
  unitCost: number;
}

/**
 * Chênh lệch số lượng — PHẢI khớp với cột generated `diff_qty` của bảng
 * `stocktake_lines`: coalesce(counted_qty, system_qty) - system_qty.
 */
export function computeDiffQty(systemQty: number, countedQty: number | null): number {
  const counted = countedQty ?? systemQty;
  return counted - systemQty;
}

/**
 * Chênh lệch giá trị — PHẢI khớp với cột generated `diff_value` của bảng
 * `stocktake_lines`: round(diff_qty * unit_cost).
 */
export function computeDiffValue(systemQty: number, countedQty: number | null, unitCost: number): number {
  return Math.round(computeDiffQty(systemQty, countedQty) * unitCost);
}

export interface StocktakeSummary {
  totalLines: number;
  countedLines: number;
  uncountedLines: number;
  linesWithDiff: number;
  totalDiffValue: number;
}

/** Tóm tắt tiến độ đếm và chênh lệch của một phiên kiểm kho, dùng cho màn hình đếm. */
export function summarizeStocktake(lines: StocktakeLineLike[]): StocktakeSummary {
  let countedLines = 0;
  let linesWithDiff = 0;
  let totalDiffValue = 0;

  for (const line of lines) {
    if (line.countedQty === null) continue;
    countedLines += 1;
    const diffQty = computeDiffQty(line.systemQty, line.countedQty);
    if (diffQty !== 0) linesWithDiff += 1;
    totalDiffValue += computeDiffValue(line.systemQty, line.countedQty, line.unitCost);
  }

  return {
    totalLines: lines.length,
    countedLines,
    uncountedLines: lines.length - countedLines,
    linesWithDiff,
    totalDiffValue,
  };
}

export type StocktakeLineFilter = "all" | "uncounted" | "diff";

/** Lọc dòng cho màn hình đếm: "chưa đếm" hoặc "có chênh lệch" — dùng chung giữa UI và test. */
export function filterStocktakeLines<T extends StocktakeLineLike>(
  lines: T[],
  filter: StocktakeLineFilter,
): T[] {
  if (filter === "uncounted") return lines.filter((l) => l.countedQty === null);
  if (filter === "diff") return lines.filter((l) => computeDiffQty(l.systemQty, l.countedQty) !== 0);
  return lines;
}
