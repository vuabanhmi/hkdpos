"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateVN } from "@/lib/date";
import { STOCKTAKE_STATUS_LABELS, type StocktakeListRow, type StocktakeStatus } from "@/features/inventory/actions/stocktakes";

const STATUS_VARIANT: Record<StocktakeStatus, "default" | "outline" | "secondary"> = {
  draft: "outline",
  counting: "secondary",
  approved: "default",
  cancelled: "outline",
};

export function StocktakeTable({ rows }: { rows: StocktakeListRow[] }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Chưa có phiên kiểm kho nào.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Số phiên</TableHead>
          <TableHead>Ngày kiểm</TableHead>
          <TableHead>Kho</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead>Ghi chú</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">
              <Link href={`/inventory/stocktakes/${row.id}`} className="hover:underline">
                {row.stocktakeNo}
              </Link>
            </TableCell>
            <TableCell>{formatDateVN(new Date(row.stocktakeDate))}</TableCell>
            <TableCell>{row.warehouseName}</TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[row.status]}>{STOCKTAKE_STATUS_LABELS[row.status]}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{row.note ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
