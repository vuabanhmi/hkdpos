"use client";

import { TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney, parseMoney } from "@/lib/money";
import { computeLineTotal, computeOrderTotals } from "@/features/sales/domain/order-totals";
import type { CartLine } from "./pos-page-client";

interface PosCartPanelProps {
  orderNo: string;
  lines: CartLine[];
  customers: { id: string; name: string }[];
  contactId: string | null;
  discountTotal: string;
  note: string;
  onChangeContact: (contactId: string | null) => void;
  onChangeDiscountTotal: (value: string) => void;
  onChangeNote: (value: string) => void;
  onChangeLine: (productId: string, patch: Partial<CartLine>) => void;
  onRemoveLine: (productId: string) => void;
  onCheckout: () => void;
}

export function PosCartPanel({
  orderNo,
  lines,
  customers,
  contactId,
  discountTotal,
  note,
  onChangeContact,
  onChangeDiscountTotal,
  onChangeNote,
  onChangeLine,
  onRemoveLine,
  onCheckout,
}: PosCartPanelProps) {
  const totals = computeOrderTotals(lines, parseMoney(discountTotal) ?? 0);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Đơn {orderNo}</h2>
      </div>

      <Select
        value={contactId}
        onValueChange={(v) => onChangeContact(v)}
        items={customers.map((c) => ({ value: c.id, label: c.name }))}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Khách lẻ" />
        </SelectTrigger>
        <SelectContent>
          {customers.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {lines.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Chưa có sản phẩm. Bấm F1 hoặc chọn từ lưới bên phải.
          </p>
        ) : (
          lines.map((line) => (
            <div key={line.productId} className="rounded-md border p-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{line.productName}</p>
                  <p className="text-xs text-muted-foreground">{line.unitName}</p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => onRemoveLine(line.productId)}>
                  <TrashIcon />
                </Button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">SL</Label>
                  <Input
                    value={String(line.quantity)}
                    onChange={(e) => onChangeLine(line.productId, { quantity: Number(e.target.value) || 0 })}
                    inputMode="decimal"
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">
                    Giá {line.defaultPrice !== null && line.unitPrice !== line.defaultPrice ? "(đã sửa)" : ""}
                  </Label>
                  <Input
                    value={String(line.unitPrice)}
                    onChange={(e) =>
                      onChangeLine(line.productId, { unitPrice: parseMoney(e.target.value) ?? 0 })
                    }
                    inputMode="numeric"
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Giảm</Label>
                  <Input
                    value={String(line.discount)}
                    onChange={(e) => onChangeLine(line.productId, { discount: parseMoney(e.target.value) ?? 0 })}
                    inputMode="numeric"
                    className="h-8"
                  />
                </div>
              </div>
              <p className="mt-1 text-right text-sm font-medium">{formatMoney(computeLineTotal(line))}</p>
            </div>
          ))
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pos-note" className="text-xs">
          Ghi chú
        </Label>
        <Textarea id="pos-note" value={note} onChange={(e) => onChangeNote(e.target.value)} rows={1} />
      </div>

      <div className="space-y-1 border-t pt-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tạm tính</span>
          <span>{formatMoney(totals.subtotal)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Giảm giá cả đơn</span>
          <Input
            value={discountTotal}
            onChange={(e) => onChangeDiscountTotal(e.target.value)}
            inputMode="numeric"
            className="h-7 w-28 text-right"
          />
        </div>
        <div className="flex justify-between text-base font-semibold">
          <span>Tổng cộng</span>
          <span>{formatMoney(totals.total)}</span>
        </div>
      </div>

      <Button size="lg" disabled={lines.length === 0} onClick={onCheckout}>
        Thanh toán (F9)
      </Button>
    </div>
  );
}
