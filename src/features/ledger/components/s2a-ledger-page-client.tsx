"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadBase64Xlsx } from "@/lib/download";
import { formatDateVN, formatISODateVN, quarterRangeVN } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { exportS2aLedgerToExcel, getS2aLedger, type S2aLedgerResult } from "@/features/ledger/actions/s2a";
import {
  createManualRevenueEntryReversal,
  listManualRevenueEntries,
  type ManualRevenueEntryRow,
} from "@/features/ledger/actions/revenue";
import { listTaxCategories } from "@/features/products/actions/reference-data";
import type { TaxCategoryOption } from "@/features/products/actions/reference-data";
import { ManualRevenueEntryDialog } from "./manual-revenue-entry-dialog";

function defaultQuarterRange() {
  const now = new Date();
  const quarter = (Math.floor(now.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
  const { start, end } = quarterRangeVN(now.getFullYear(), quarter);
  return { start: formatISODateVN(start), end: formatISODateVN(end) };
}

function formatSignedMoney(amount: number): string {
  return amount < 0 ? `-${formatMoney(-amount)}` : formatMoney(amount);
}

export function S2aLedgerPageClient() {
  const defaults = defaultQuarterRange();
  const [periodStart, setPeriodStart] = useState(defaults.start);
  const [periodEnd, setPeriodEnd] = useState(defaults.end);
  const [ledger, setLedger] = useState<S2aLedgerResult | null>(null);
  const [manualEntries, setManualEntries] = useState<ManualRevenueEntryRow[]>([]);
  const [taxCategories, setTaxCategories] = useState<TaxCategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      setTaxCategories(await listTaxCategories());
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, m] = await Promise.all([
        getS2aLedger(periodStart, periodEnd),
        listManualRevenueEntries(periodStart, periodEnd),
      ]);
      setLedger(l);
      setManualEntries(m);
    } finally {
      setLoading(false);
    }
  }, [periodStart, periodEnd]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  async function handleExport() {
    const result = await exportS2aLedgerToExcel(periodStart, periodEnd);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    downloadBase64Xlsx(result.data.base64, result.data.filename);
  }

  async function handleReverse(entry: ManualRevenueEntryRow) {
    const reason = window.prompt(`Lý do tạo phiếu đảo cho ${entry.entryNo}?`);
    if (!reason) return;
    const result = await createManualRevenueEntryReversal(entry.id, reason);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã tạo phiếu đảo");
    void load();
  }

  return (
    <div className="space-y-4 print:space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h1 className="text-2xl font-semibold">Sổ doanh thu (S2a-HKD)</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setManualDialogOpen(true)}>
            Ghi doanh thu khác
          </Button>
          <Button variant="outline" onClick={handleExport}>
            Xuất Excel
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            In
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="w-40" />
        <span className="text-sm text-muted-foreground">đến</span>
        <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="w-40" />
      </div>

      <div className="hidden space-y-1 text-sm print:block">
        <p className="text-base font-semibold">SỔ DOANH THU BÁN HÀNG HÓA, DỊCH VỤ — Mẫu số S2a-HKD</p>
        <p>Hộ, cá nhân kinh doanh: {ledger?.businessName ?? ""}</p>
        <p>Địa chỉ: {ledger?.businessAddress ?? ""}</p>
        <p>Mã số thuế: {ledger?.businessTaxCode ?? ""}</p>
        <p>
          Kỳ kê khai: {formatDateVN(new Date(periodStart))} — {formatDateVN(new Date(periodEnd))}
        </p>
      </div>

      {loading || !ledger ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Đang tải...</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Số hiệu</TableHead>
                <TableHead>Ngày, tháng</TableHead>
                <TableHead>Diễn giải</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    Không có doanh thu trong kỳ này.
                  </TableCell>
                </TableRow>
              ) : null}
              {ledger.groups.map((group, groupIndex) => (
                <>
                  <TableRow key={`${group.taxCategoryId}-header`} className="bg-muted/30">
                    <TableCell colSpan={4} className="font-medium">
                      {groupIndex + 1}. Ngành nghề {group.taxCategoryName}
                    </TableCell>
                  </TableRow>
                  {group.lines.map((line, i) => (
                    <TableRow key={`${group.taxCategoryId}-${i}`}>
                      <TableCell>{line.docNo ?? ""}</TableCell>
                      <TableCell>{line.date}</TableCell>
                      <TableCell>{line.description}</TableCell>
                      <TableCell className="text-right">{formatSignedMoney(line.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow key={`${group.taxCategoryId}-subtotal`} className="font-medium">
                    <TableCell colSpan={3}>Tổng cộng ({groupIndex + 1})</TableCell>
                    <TableCell className="text-right">{formatSignedMoney(group.subtotal)}</TableCell>
                  </TableRow>
                  <TableRow key={`${group.taxCategoryId}-gtgt`}>
                    <TableCell colSpan={3}>Thuế GTGT ({(group.gtgtRate * 100).toFixed(1)}%)</TableCell>
                    <TableCell className="text-right">{formatMoney(group.gtgtAmount)}</TableCell>
                  </TableRow>
                  <TableRow key={`${group.taxCategoryId}-tncn`}>
                    <TableCell colSpan={3}>Thuế TNCN ({(group.tncnRate * 100).toFixed(1)}%)</TableCell>
                    <TableCell className="text-right">{formatMoney(group.tncnAmount)}</TableCell>
                  </TableRow>
                </>
              ))}
              <TableRow className="font-semibold">
                <TableCell colSpan={3}>Tổng số thuế GTGT phải nộp</TableCell>
                <TableCell className="text-right">{formatMoney(ledger.totalGtgt)}</TableCell>
              </TableRow>
              <TableRow className="font-semibold">
                <TableCell colSpan={3}>Tổng số thuế TNCN phải nộp</TableCell>
                <TableCell className="text-right">{formatMoney(ledger.totalTncn)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <p className="text-xs text-muted-foreground print:hidden">
            Số liệu chỉ để tham khảo, cần đối chiếu với tờ khai chính thức và kế toán.
          </p>

          <div className="print:hidden">
            <h2 className="mb-2 text-lg font-semibold">Doanh thu nhập tay trong kỳ</h2>
            {manualEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có khoản doanh thu nhập tay nào.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Số phiếu</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Diễn giải</TableHead>
                    <TableHead>Nhóm ngành nghề</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manualEntries.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.entryNo}</TableCell>
                      <TableCell>{formatDateVN(new Date(m.entryDate))}</TableCell>
                      <TableCell>{m.description}</TableCell>
                      <TableCell>{m.taxCategoryName}</TableCell>
                      <TableCell className="text-right">{formatSignedMoney(m.amount)}</TableCell>
                      <TableCell>
                        {!m.hasReversal && !m.reversedOf ? (
                          <Button variant="outline" size="sm" onClick={() => void handleReverse(m)}>
                            Tạo phiếu đảo
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      )}

      <ManualRevenueEntryDialog
        open={manualDialogOpen}
        onOpenChange={setManualDialogOpen}
        taxCategories={taxCategories}
        onCreated={load}
      />
    </div>
  );
}
