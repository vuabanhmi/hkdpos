"use client";

import { formatMoney } from "@/lib/money";
import type { CashSummary } from "@/features/cashbook/domain/cash-summary";

export function CashSummaryCards({ summary }: { summary: CashSummary }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-lg border p-3">
        <p className="text-sm text-muted-foreground">Tổng thu</p>
        <p className="text-lg font-semibold text-emerald-600">{formatMoney(summary.totalIncome)}</p>
      </div>
      <div className="rounded-lg border p-3">
        <p className="text-sm text-muted-foreground">Tổng chi</p>
        <p className="text-lg font-semibold text-destructive">{formatMoney(summary.totalExpense)}</p>
      </div>
      <div className="rounded-lg border p-3">
        <p className="text-sm text-muted-foreground">Số dư kỳ</p>
        <p className="text-lg font-semibold">{formatMoney(summary.balance)}</p>
      </div>
    </div>
  );
}
