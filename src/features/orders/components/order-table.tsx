"use client";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTimeVN } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import type { OrderListRow } from "@/features/orders/actions/orders";

interface OrderTableProps {
  rows: OrderListRow[];
  onView: (row: OrderListRow) => void;
}

export function OrderTable({ rows, onView }: OrderTableProps) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Không có đơn hàng nào.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mã đơn</TableHead>
          <TableHead>Thời điểm</TableHead>
          <TableHead>Khách hàng</TableHead>
          <TableHead>Tổng tiền</TableHead>
          <TableHead>Trạng thái</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} className="cursor-pointer" onClick={() => onView(row)}>
            <TableCell className="font-medium hover:underline">{row.orderNo}</TableCell>
            <TableCell>{formatDateTimeVN(new Date(row.orderedAt))}</TableCell>
            <TableCell>{row.contactName ?? "Khách lẻ"}</TableCell>
            <TableCell>{formatMoney(row.total)}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                <Badge variant={row.status === "completed" ? "default" : "outline"}>
                  {row.status === "completed" ? "Hoàn thành" : "Đã hủy"}
                </Badge>
                {row.hasReturn ? <Badge variant="secondary">Có trả hàng</Badge> : null}
                {row.debtTotal > 0 ? <Badge variant="destructive">Ghi nợ {formatMoney(row.debtTotal)}</Badge> : null}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
