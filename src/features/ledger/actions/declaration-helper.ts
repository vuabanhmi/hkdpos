"use server";

import { createSupabaseServerClient } from "@/lib/db/server";
import { computeRevenueThresholdStatus, summarizeDeclaration, type RevenueThresholdStatus } from "@/features/ledger/domain/tax-calc";
import { getTaxConfig } from "./tax-settings";

export interface DeclarationCategoryRow {
  taxCategoryId: string;
  taxCategoryName: string;
  taxCategoryCode: string;
  revenue: number;
  gtgtRate: number;
  tncnRate: number;
  gtgtAmount: number;
  tncnAmount: number;
}

export interface DeclarationHelperResult {
  periodStart: string;
  periodEnd: string;
  rows: DeclarationCategoryRow[];
  totalRevenue: number;
  totalGtgt: number;
  totalTncn: number;
  thresholdStatus: RevenueThresholdStatus | null;
}

export async function getDeclarationHelper(periodStart: string, periodEnd: string): Promise<DeclarationHelperResult> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("revenue_by_tax_category", {
    p_period_start: periodStart,
    p_period_end: periodEnd,
  });
  if (error) throw new Error(error.message);

  const rows: DeclarationCategoryRow[] = (
    (data ?? []) as unknown as {
      tax_category_id: string;
      tax_category_name: string;
      tax_category_code: string;
      revenue: number;
      gtgt_rate: number;
      tncn_rate: number;
      gtgt_amount: number;
      tncn_amount: number;
    }[]
  ).map((r) => ({
    taxCategoryId: r.tax_category_id,
    taxCategoryName: r.tax_category_name,
    taxCategoryCode: r.tax_category_code,
    revenue: r.revenue,
    gtgtRate: r.gtgt_rate,
    tncnRate: r.tncn_rate,
    gtgtAmount: r.gtgt_amount,
    tncnAmount: r.tncn_amount,
  }));

  const totals = summarizeDeclaration(rows.map((r) => ({ revenue: r.revenue, gtgtAmount: r.gtgtAmount, tncnAmount: r.tncnAmount })));

  // Doanh thu lũy kế từ đầu năm (chứa periodEnd) đến hết periodEnd, so với ngưỡng cấu hình.
  const year = periodEnd.slice(0, 4);
  const { data: ytdData, error: ytdError } = await supabase.rpc("revenue_by_tax_category", {
    p_period_start: `${year}-01-01`,
    p_period_end: periodEnd,
  });
  if (ytdError) throw new Error(ytdError.message);

  const ytdRevenue = ((ytdData ?? []) as unknown as { revenue: number }[]).reduce((sum, r) => sum + r.revenue, 0);

  const taxConfig = await getTaxConfig();
  const thresholdStatus =
    taxConfig.revenueThresholdAmount !== null && taxConfig.revenueWarnPercent !== null
      ? computeRevenueThresholdStatus(ytdRevenue, taxConfig.revenueThresholdAmount, taxConfig.revenueWarnPercent)
      : null;

  return {
    periodStart,
    periodEnd,
    rows,
    totalRevenue: totals.totalRevenue,
    totalGtgt: totals.totalGtgt,
    totalTncn: totals.totalTncn,
    thresholdStatus,
  };
}
