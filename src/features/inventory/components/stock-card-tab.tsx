"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTimeVN } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { getStockCard, type StockCardRow } from "@/features/inventory/actions/inventory";
import { PurchasePriceChart } from "./purchase-price-chart";

export function StockCardTab({ productId }: { productId: string }) {
  const [rows, setRows] = useState<StockCardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setRows(await getStockCard(productId));
      setLoading(false);
    })();
  }, [productId]);

  if (loading) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Đang tải...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Biểu đồ giá nhập</h3>
        <PurchasePriceChart movements={rows} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Thời điểm</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Kho</TableHead>
            <TableHead>Số lượng</TableHead>
            <TableHead>Giá</TableHead>
            <TableHead>Giá vốn sau</TableHead>
            <TableHead>Số phiếu</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                Chưa có dòng xuất nhập nào.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{formatDateTimeVN(new Date(row.occurredAt))}</TableCell>
                <TableCell>{row.movementTypeLabel}</TableCell>
                <TableCell>{row.warehouseName}</TableCell>
                <TableCell className={row.quantity < 0 ? "text-destructive" : "text-emerald-600"}>
                  {row.quantity > 0 ? `+${row.quantity}` : row.quantity}
                </TableCell>
                <TableCell>{formatMoney(row.unitCost)}</TableCell>
                <TableCell>{formatMoney(row.avgCostAfter)}</TableCell>
                <TableCell>{row.docNo ?? "—"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
