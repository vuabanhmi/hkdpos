"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatISODateVN, quarterRangeVN } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { getDeclarationHelper, type DeclarationHelperResult } from "@/features/ledger/actions/declaration-helper";

function defaultQuarterRange() {
  const now = new Date();
  const quarter = (Math.floor(now.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
  const { start, end } = quarterRangeVN(now.getFullYear(), quarter);
  return { start: formatISODateVN(start), end: formatISODateVN(end) };
}

export function DeclarationHelperPageClient() {
  const defaults = defaultQuarterRange();
  const [periodStart, setPeriodStart] = useState(defaults.start);
  const [periodEnd, setPeriodEnd] = useState(defaults.end);
  const [result, setResult] = useState<DeclarationHelperResult | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setResult(await getDeclarationHelper(periodStart, periodEnd));
    } finally {
      setLoading(false);
    }
  }, [periodStart, periodEnd]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const status = result?.thresholdStatus ?? null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Bảng tính hỗ trợ kê khai thuế</h1>
      <p className="text-sm text-muted-foreground">
        Số liệu chỉ để tham khảo, cần đối chiếu với tờ khai chính thức và kế toán.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="w-40" />
        <span className="text-sm text-muted-foreground">đến</span>
        <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="w-40" />
      </div>

      {loading || !result ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Đang tải...</p>
      ) : (
        <>
          {status ? (
            <div
              className={`rounded-md px-3 py-2 text-sm ${
                status.isOverThreshold
                  ? "bg-destructive/10 text-destructive"
                  : status.isNearThreshold
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              Doanh thu lũy kế từ đầu năm đến {periodEnd}: <strong>{formatMoney(status.cumulativeRevenue)}</strong> /{" "}
              {formatMoney(status.threshold)} ({(status.percentUsed * 100).toFixed(1)}%)
              {status.isOverThreshold
                ? " — ĐÃ VƯỢT ngưỡng cấu hình."
                : status.isNearThreshold
                  ? ` — gần chạm ngưỡng (từ ${Math.round(status.warnPercent * 100)}%).`
                  : ""}
            </div>
          ) : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Nhóm ngành nghề</TableHead>
                <TableHead className="text-right">Doanh thu</TableHead>
                <TableHead className="text-right">Tỷ lệ GTGT</TableHead>
                <TableHead className="text-right">Thuế GTGT tạm tính</TableHead>
                <TableHead className="text-right">Tỷ lệ TNCN</TableHead>
                <TableHead className="text-right">Thuế TNCN tạm tính</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    Không có doanh thu trong kỳ này.
                  </TableCell>
                </TableRow>
              ) : null}
              {result.rows.map((r) => (
                <TableRow key={r.taxCategoryId}>
                  <TableCell>{r.taxCategoryCode}</TableCell>
                  <TableCell>{r.taxCategoryName}</TableCell>
                  <TableCell className="text-right">{formatMoney(r.revenue)}</TableCell>
                  <TableCell className="text-right">{(r.gtgtRate * 100).toFixed(1)}%</TableCell>
                  <TableCell className="text-right">{formatMoney(r.gtgtAmount)}</TableCell>
                  <TableCell className="text-right">{(r.tncnRate * 100).toFixed(1)}%</TableCell>
                  <TableCell className="text-right">{formatMoney(r.tncnAmount)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold">
                <TableCell colSpan={2}>Tổng cộng</TableCell>
                <TableCell className="text-right">{formatMoney(result.totalRevenue)}</TableCell>
                <TableCell />
                <TableCell className="text-right">{formatMoney(result.totalGtgt)}</TableCell>
                <TableCell />
                <TableCell className="text-right">{formatMoney(result.totalTncn)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
