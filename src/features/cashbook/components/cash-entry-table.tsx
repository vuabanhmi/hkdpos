"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTimeVN } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import type { CashLedgerRow } from "@/features/cashbook/actions/cashbook";

/** formatMoney chỉ nhận số không âm; phiếu đảo có amount âm nên hiển thị riêng dấu "-". */
function formatSignedMoney(amount: number): string {
  return amount < 0 ? `-${formatMoney(-amount)}` : formatMoney(amount);
}

interface CashEntryTableProps {
  rows: CashLedgerRow[];
  onReverse: (row: CashLedgerRow) => void;
}

export function CashEntryTable({ rows, onReverse }: CashEntryTableProps) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Không có phiếu nào.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Số phiếu</TableHead>
          <TableHead>Thời điểm</TableHead>
          <TableHead>Loại</TableHead>
          <TableHead>Danh mục</TableHead>
          <TableHead>Đối tác</TableHead>
          <TableHead>Hình thức</TableHead>
          <TableHead>Mô tả</TableHead>
          <TableHead>Số tiền</TableHead>
          <TableHead className="w-28" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.source}-${row.sourceId}`}>
            <TableCell className="font-medium">{row.entryNo ?? "—"}</TableCell>
            <TableCell>{formatDateTimeVN(new Date(row.occurredAt))}</TableCell>
            <TableCell>
              <Badge variant={row.kind === "income" ? "default" : "outline"}>
                {row.kind === "income" ? "Thu" : "Chi"}
              </Badge>
              {row.isReversal ? <Badge variant="secondary" className="ml-1">Phiếu đảo</Badge> : null}
            </TableCell>
            <TableCell>{row.categoryName ?? "Bán hàng"}</TableCell>
            <TableCell>{row.contactName ?? "—"}</TableCell>
            <TableCell>{row.method === "cash" ? "Tiền mặt" : "Chuyển khoản"}</TableCell>
            <TableCell>{row.description ?? "—"}</TableCell>
            <TableCell className={row.amount < 0 ? "text-destructive" : ""}>{formatSignedMoney(row.amount)}</TableCell>
            <TableCell>
              {row.source === "cash_entry" && !row.isReversal && !row.hasReversal ? (
                <Button size="sm" variant="outline" onClick={() => onReverse(row)}>
                  Tạo phiếu đảo
                </Button>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
