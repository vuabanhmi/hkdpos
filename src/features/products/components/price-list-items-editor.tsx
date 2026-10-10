"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTimeVN } from "@/lib/date";
import { parseMoney } from "@/lib/money";
import {
  bulkSetPrices,
  getPriceListItems,
  type PriceListItemRow,
} from "@/features/products/actions/price-lists";

interface PriceListItemsEditorProps {
  priceListId: string;
  priceListName: string;
}

export function PriceListItemsEditor({ priceListId, priceListName }: PriceListItemsEditorProps) {
  const [items, setItems] = useState<PriceListItemRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const data = await getPriceListItems(priceListId);
    setItems(data);
    setDrafts(Object.fromEntries(data.map((item) => [item.productId, String(item.price ?? 0)])));
    setLoading(false);
  }

  useEffect(() => {
    void (async () => {
      setReason("");
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceListId]);

  const changedItems = useMemo(() => {
    return items
      .map((item) => {
        const draftPrice = parseMoney(drafts[item.productId] ?? "");
        if (draftPrice === null) return null;
        if (draftPrice === (item.price ?? 0)) return null;
        return { productId: item.productId, price: draftPrice };
      })
      .filter((v): v is { productId: string; price: number } => v !== null);
  }, [items, drafts]);

  async function handleSave() {
    if (changedItems.length === 0) return;
    setSaving(true);
    const result = await bulkSetPrices(priceListId, changedItems, reason);
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(`Đã lưu ${changedItems.length} giá thay đổi`);
    setReason("");
    void load();
  }

  if (loading) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Đang tải...</p>;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-medium">Sửa giá — {priceListName}</h2>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã</TableHead>
            <TableHead>Tên sản phẩm</TableHead>
            <TableHead>Đơn vị</TableHead>
            <TableHead>Giá bán</TableHead>
            <TableHead>Cập nhật lần cuối</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.productId}>
              <TableCell>{item.code}</TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.unitName}</TableCell>
              <TableCell>
                <Input
                  value={drafts[item.productId] ?? ""}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [item.productId]: e.target.value }))
                  }
                  inputMode="numeric"
                  className="w-32"
                />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {item.updatedAt ? formatDateTimeVN(new Date(item.updatedAt)) : "Chưa có giá"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="reason">Lý do đổi giá (tùy chọn, áp dụng cho các dòng đã sửa)</Label>
          <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="w-80" />
        </div>
        <Button onClick={handleSave} disabled={saving || changedItems.length === 0}>
          {saving ? "Đang lưu..." : `Lưu thay đổi (${changedItems.length})`}
        </Button>
      </div>
    </div>
  );
}
