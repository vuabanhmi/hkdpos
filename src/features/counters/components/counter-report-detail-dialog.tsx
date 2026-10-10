"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import { getCounterProductBreakdown, type CounterProductBreakdownRow } from "@/features/counters/actions/reports";

interface CounterReportDetailDialogProps {
  counterId: string | null;
  counterName: string | null;
  dateFrom: string;
  dateTo: string;
  onOpenChange: (open: boolean) => void;
}

export function CounterReportDetailDialog({
  counterId,
  counterName,
  dateFrom,
  dateTo,
  onOpenChange,
}: CounterReportDetailDialogProps) {
  const [rows, setRows] = useState<CounterProductBreakdownRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      if (counterName === null) {
        setRows([]);
        return;
      }
      setLoading(true);
      setRows(await getCounterProductBreakdown(counterId, dateFrom, dateTo));
      setLoading(false);
    })();
  }, [counterId, counterName, dateFrom, dateTo]);

  return (
    <Dialog open={counterName !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Chi tiết theo sản phẩm — {counterName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Đang tải...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sản phẩm</TableHead>
                <TableHead>Số lượng</TableHead>
                <TableHead>Đơn giá bình quân</TableHead>
                <TableHead>Doanh thu thực</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    Không có dữ liệu.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.productId}>
                    <TableCell>
                      {r.productCode} — {r.productName}
                    </TableCell>
                    <TableCell>{r.quantity}</TableCell>
                    <TableCell>{formatMoney(r.avgUnitPrice)}</TableCell>
                    <TableCell>{formatMoney(r.netAmount)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
