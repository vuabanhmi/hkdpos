"use client";

import Link from "next/link";
import { AlertTriangleIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import type { InventoryRow } from "@/features/inventory/actions/inventory";

export function InventoryTable({ rows }: { rows: InventoryRow[] }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Không có sản phẩm nào.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mã</TableHead>
          <TableHead>Tên sản phẩm</TableHead>
          <TableHead>Đơn vị</TableHead>
          <TableHead>Nhóm</TableHead>
          <TableHead>Tồn</TableHead>
          <TableHead>Giá vốn</TableHead>
          <TableHead>Giá trị tồn</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.productId}>
            <TableCell className="font-medium">
              <Link href={`/products/${row.productId}`} className="hover:underline">
                {row.code}
              </Link>
            </TableCell>
            <TableCell>{row.name}</TableCell>
            <TableCell>{row.unitName}</TableCell>
            <TableCell>{row.groupName ?? "—"}</TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5">
                {row.quantity}
                {row.isBelowMinimum ? (
                  <span title={`Dưới mức tối thiểu (${row.minStockQty})`}>
                    <AlertTriangleIcon className="size-3.5 text-amber-500" />
                  </span>
                ) : null}
              </div>
            </TableCell>
            <TableCell>{formatMoney(row.avgCost)}</TableCell>
            <TableCell>{formatMoney(row.value)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
