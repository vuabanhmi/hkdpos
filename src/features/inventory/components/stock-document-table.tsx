"use client";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTimeVN } from "@/lib/date";
import { STOCK_DOC_TYPE_LABELS } from "@/features/inventory/domain/stock-document";
import type { StockDocumentListRow } from "@/features/inventory/actions/stock-documents";

interface StockDocumentTableProps {
  rows: StockDocumentListRow[];
  onView: (row: StockDocumentListRow) => void;
}

export function StockDocumentTable({ rows, onView }: StockDocumentTableProps) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Không có phiếu nào.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Số phiếu</TableHead>
          <TableHead>Loại</TableHead>
          <TableHead>Thời điểm</TableHead>
          <TableHead>Kho</TableHead>
          <TableHead>Đối tác</TableHead>
          <TableHead>Trạng thái</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} className="cursor-pointer" onClick={() => onView(row)}>
            <TableCell className="font-medium hover:underline">{row.docNo}</TableCell>
            <TableCell>{STOCK_DOC_TYPE_LABELS[row.docType]}</TableCell>
            <TableCell>{formatDateTimeVN(new Date(row.occurredAt))}</TableCell>
            <TableCell>{row.warehouseName}</TableCell>
            <TableCell>{row.contactName ?? "—"}</TableCell>
            <TableCell>
              <Badge variant={row.status === "posted" ? "default" : "outline"}>
                {row.status === "posted" ? "Đã ghi sổ" : "Đã hủy"}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
