"use client";

import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import type { CounterReportResult } from "@/features/counters/actions/reports";

interface CounterReportTableProps {
  report: CounterReportResult;
  onSelectCounter: (counterId: string | null, counterName: string) => void;
}

export function CounterReportTable({ report, onSelectCounter }: CounterReportTableProps) {
  if (report.rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Không có doanh thu trong khoảng ngày này.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Quầy</TableHead>
          <TableHead>Số đơn</TableHead>
          <TableHead>Số lượng</TableHead>
          <TableHead>Doanh số gộp</TableHead>
          <TableHead>Giảm giá</TableHead>
          <TableHead>Trả hàng</TableHead>
          <TableHead>Doanh thu thực</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {report.rows.map((r) => (
          <TableRow
            key={r.counterId ?? "unassigned"}
            className="cursor-pointer"
            onClick={() => onSelectCounter(r.counterId, r.counterName)}
          >
            <TableCell className="font-medium hover:underline">{r.counterName}</TableCell>
            <TableCell>{r.orderCount}</TableCell>
            <TableCell>{r.totalQuantity}</TableCell>
            <TableCell>{formatMoney(r.grossAmount)}</TableCell>
            <TableCell>{formatMoney(r.discountAmount)}</TableCell>
            <TableCell>{formatMoney(r.returnAmount)}</TableCell>
            <TableCell className="font-medium">{formatMoney(r.netAmount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Tổng cộng</TableCell>
          <TableCell>{report.totals.orderCount}</TableCell>
          <TableCell>{report.totals.totalQuantity}</TableCell>
          <TableCell>{formatMoney(report.totals.grossAmount)}</TableCell>
          <TableCell>{formatMoney(report.totals.discountAmount)}</TableCell>
          <TableCell>{formatMoney(report.totals.returnAmount)}</TableCell>
          <TableCell>{formatMoney(report.totals.netAmount)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
