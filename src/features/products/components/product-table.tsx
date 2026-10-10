"use client";

import Link from "next/link";
import { AlertTriangleIcon, MoreHorizontalIcon } from "lucide-react";
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
import { formatMoney } from "@/lib/money";
import type { ProductListRow } from "@/features/products/actions/products";

interface ProductTableProps {
  rows: ProductListRow[];
  onEdit: (row: ProductListRow) => void;
  onDuplicate: (row: ProductListRow) => void;
  onToggleActive: (row: ProductListRow) => void;
}

export function ProductTable({ rows, onEdit, onDuplicate, onToggleActive }: ProductTableProps) {
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
          <TableHead>Giá vốn</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">
              <Link href={`/products/${row.id}`} className="hover:underline">
                {row.code}
              </Link>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5">
                {row.name}
                {!row.taxCategoryId ? (
                  <span title="Chưa gắn nhóm ngành nghề tính thuế">
                    <AlertTriangleIcon className="size-3.5 text-amber-500" />
                  </span>
                ) : null}
              </div>
              {row.barcode ? (
                <p className="text-xs text-muted-foreground">Mã vạch: {row.barcode}</p>
              ) : null}
            </TableCell>
            <TableCell>{row.unitName}</TableCell>
            <TableCell>{row.groupName ?? "—"}</TableCell>
            <TableCell>{formatMoney(row.costPrice)}</TableCell>
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
                  <DropdownMenuItem onClick={() => onDuplicate(row)}>Sao chép</DropdownMenuItem>
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
