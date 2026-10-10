"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import type { InventoryFlowRow } from "@/features/inventory/actions/inventory-report";

export function InventoryReportTable({ rows }: { rows: InventoryFlowRow[] }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Không có dữ liệu.</p>;
  }

  const totals = rows.reduce(
    (acc, r) => ({
      beginValue: acc.beginValue + r.beginValue,
      inValue: acc.inValue + r.inValue,
      outValue: acc.outValue + r.outValue,
      endValue: acc.endValue + r.endValue,
    }),
    { beginValue: 0, inValue: 0, outValue: 0, endValue: 0 },
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead rowSpan={2}>Mã SP</TableHead>
          <TableHead rowSpan={2}>Tên sản phẩm</TableHead>
          <TableHead rowSpan={2}>Đơn vị</TableHead>
          <TableHead className="text-center" colSpan={2}>
            Tồn đầu
          </TableHead>
          <TableHead className="text-center" colSpan={2}>
            Nhập
          </TableHead>
          <TableHead className="text-center" colSpan={2}>
            Xuất
          </TableHead>
          <TableHead className="text-center" colSpan={2}>
            Tồn cuối
          </TableHead>
        </TableRow>
        <TableRow>
          <TableHead className="text-right">SL</TableHead>
          <TableHead className="text-right">Giá trị</TableHead>
          <TableHead className="text-right">SL</TableHead>
          <TableHead className="text-right">Giá trị</TableHead>
          <TableHead className="text-right">SL</TableHead>
          <TableHead className="text-right">Giá trị</TableHead>
          <TableHead className="text-right">SL</TableHead>
          <TableHead className="text-right">Giá trị</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.productId}>
            <TableCell>{r.productCode}</TableCell>
            <TableCell>{r.productName}</TableCell>
            <TableCell>{r.unitName}</TableCell>
            <TableCell className="text-right">{r.beginQty}</TableCell>
            <TableCell className="text-right">{formatMoney(r.beginValue)}</TableCell>
            <TableCell className="text-right">{r.inQty}</TableCell>
            <TableCell className="text-right">{formatMoney(r.inValue)}</TableCell>
            <TableCell className="text-right">{r.outQty}</TableCell>
            <TableCell className="text-right">{formatMoney(r.outValue)}</TableCell>
            <TableCell className="text-right">{r.endQty}</TableCell>
            <TableCell className="text-right">{formatMoney(r.endValue)}</TableCell>
          </TableRow>
        ))}
        <TableRow className="font-semibold">
          <TableCell colSpan={4}>Tổng cộng</TableCell>
          <TableCell className="text-right">{formatMoney(totals.beginValue)}</TableCell>
          <TableCell />
          <TableCell className="text-right">{formatMoney(totals.inValue)}</TableCell>
          <TableCell />
          <TableCell className="text-right">{formatMoney(totals.outValue)}</TableCell>
          <TableCell />
          <TableCell className="text-right">{formatMoney(totals.endValue)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
