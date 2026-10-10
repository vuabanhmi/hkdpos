"use client";

import { MoreHorizontalIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ContactRow } from "@/features/contacts/actions/contacts";

interface ContactTableProps {
  rows: ContactRow[];
  onEdit: (row: ContactRow) => void;
  onToggleActive: (row: ContactRow) => void;
}

export function ContactTable({ rows, onEdit, onToggleActive }: ContactTableProps) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Không có đối tác nào.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tên</TableHead>
          <TableHead>Điện thoại</TableHead>
          <TableHead>Loại</TableHead>
          <TableHead>Mã số thuế</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell>{row.phone ?? "—"}</TableCell>
            <TableCell>
              <div className="flex gap-1">
                {row.isCustomer ? <Badge variant="secondary">Khách hàng</Badge> : null}
                {row.isSupplier ? <Badge variant="outline">Nhà cung cấp</Badge> : null}
              </div>
            </TableCell>
            <TableCell>{row.taxCode ?? "—"}</TableCell>
            <TableCell>
              <Badge variant={row.isActive ? "default" : "outline"}>
                {row.isActive ? "Đang hoạt động" : "Đã vô hiệu hóa"}
              </Badge>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontalIcon />
                    </Button>
                  }
                />
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => onEdit(row)}>Sửa</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onToggleActive(row)}>
                    {row.isActive ? "Vô hiệu hóa" : "Kích hoạt lại"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
