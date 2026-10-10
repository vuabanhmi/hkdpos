"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateVN } from "@/lib/date";
import { downloadBase64Xlsx } from "@/lib/download";
import { formatMoney } from "@/lib/money";
import {
  exportCounterReportToExcel,
  getCounterReport,
  getIndependentCompletedTotal,
  type CounterReportResult,
} from "@/features/counters/actions/reports";
import { CounterReportDetailDialog } from "./counter-report-detail-dialog";
import { CounterReportTable } from "./counter-report-table";

function todayVNString(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

export function ReportsCountersPageClient() {
  const [dateFrom, setDateFrom] = useState(todayVNString());
  const [dateTo, setDateTo] = useState(todayVNString());
  const [report, setReport] = useState<CounterReportResult | null>(null);
  const [independentTotal, setIndependentTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ counterId: string | null; counterName: string | null }>({
    counterId: null,
    counterName: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, independent] = await Promise.all([
        getCounterReport(dateFrom, dateTo),
        getIndependentCompletedTotal(dateFrom, dateTo),
      ]);
      setReport(r);
      setIndependentTotal(independent);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  async function handleExport() {
    const result = await exportCounterReportToExcel(dateFrom, dateTo);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    downloadBase64Xlsx(result.data.base64, result.data.filename);
  }

  const isReconciled = report ? report.totals.netAmount === independentTotal : true;

  return (
    <div className="space-y-4 print:space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h1 className="text-2xl font-semibold">Báo cáo theo quầy</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            Xuất Excel
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            In
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 print:hidden">
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        <span className="text-sm text-muted-foreground">—</span>
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
      </div>

      <h2 className="hidden text-lg font-semibold print:block">
        Báo cáo theo quầy: {formatDateVN(new Date(dateFrom))} — {formatDateVN(new Date(dateTo))}
      </h2>

      {loading || !report ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Đang tải...</p>
      ) : (
        <>
          <CounterReportTable
            report={report}
            onSelectCounter={(counterId, counterName) => setSelected({ counterId, counterName })}
          />

          <div
            className={
              isReconciled
                ? "rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                : "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            }
          >
            Tổng các quầy: {formatMoney(report.totals.netAmount)} — Tổng doanh thu cuối ngày (đối chiếu độc lập):{" "}
            {formatMoney(independentTotal)}.{" "}
            {isReconciled ? "Khớp." : "LỆCH — kiểm tra lại dữ liệu."}
          </div>
        </>
      )}

      <CounterReportDetailDialog
        counterId={selected.counterId}
        counterName={selected.counterName}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onOpenChange={(open) => !open && setSelected({ counterId: null, counterName: null })}
      />
    </div>
  );
}
