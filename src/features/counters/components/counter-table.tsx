"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CounterRow } from "@/features/counters/actions/counters";

interface CounterTableProps {
  rows: CounterRow[];
  onEdit: (row: CounterRow) => void;
  onToggleActive: (row: CounterRow) => void;
}

export function CounterTable({ rows, onEdit, onToggleActive }: CounterTableProps) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Chưa có quầy nào.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mã</TableHead>
          <TableHead>Tên quầy</TableHead>
          <TableHead>Người phụ trách</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead className="w-40" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">{row.code}</TableCell>
            <TableCell>{row.name}</TableCell>
            <TableCell>{row.managerName ?? "—"}</TableCell>
            <TableCell>
              <Badge variant={row.isActive ? "default" : "outline"}>
                {row.isActive ? "Hoạt động" : "Vô hiệu hóa"}
              </Badge>
            </TableCell>
            <TableCell className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onEdit(row)}>
                Sửa
              </Button>
              <Button size="sm" variant="outline" onClick={() => onToggleActive(row)}>
                {row.isActive ? "Vô hiệu hóa" : "Kích hoạt"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
