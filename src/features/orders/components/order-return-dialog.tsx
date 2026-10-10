"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";
import { computeRemainingReturnable, computeReturnAmount } from "@/features/orders/domain/return";
import { createOrderReturn, type OrderItemDetail } from "@/features/orders/actions/orders";

interface OrderReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  items: OrderItemDetail[];
  onReturned: () => void;
}

function OrderReturnFields({
  orderId,
  items,
  onCancel,
  onReturned,
}: {
  orderId: string;
  items: OrderItemDetail[];
  onCancel: () => void;
  onReturned: () => void;
}) {
  const returnable = items.filter((i) => computeRemainingReturnable(i.quantity, i.returnedQuantity) > 0);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  const lines = returnable
    .map((item) => {
      const qty = Number(quantities[item.id] ?? 0);
      return qty > 0 ? { item, qty } : null;
    })
    .filter((v): v is { item: OrderItemDetail; qty: number } => v !== null);

  const totalAmount = lines.reduce(
    (sum, l) => sum + computeReturnAmount(l.item.quantity, l.item.lineTotal, l.qty),
    0,
  );

  async function handleSubmit() {
    if (lines.length === 0) {
      toast.error("Chọn ít nhất một dòng hàng để trả");
      return;
    }
    if (!reason.trim()) {
      toast.error("Phải nhập lý do trả hàng");
      return;
    }

    setPending(true);
    const result = await createOrderReturn(
      orderId,
      lines.map((l) => ({ orderItemId: l.item.id, quantity: l.qty })),
      reason,
    );
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(`Đã tạo phiếu trả hàng ${result.data.returnNo} (${formatMoney(result.data.totalAmount)})`);
    onReturned();
  }

  return (
    <>
      <div className="space-y-3">
        {returnable.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không còn dòng hàng nào để trả.</p>
        ) : (
          returnable.map((item) => {
            const remaining = computeRemainingReturnable(item.quantity, item.returnedQuantity);
            return (
              <div key={item.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                <div>
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">Còn có thể trả: {remaining}</p>
                </div>
                <Input
                  className="w-24"
                  value={quantities[item.id] ?? ""}
                  onChange={(e) => setQuantities((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
            );
          })
        )}

        <div className="space-y-1.5">
          <Label htmlFor="return-reason">Lý do trả hàng</Label>
          <Input id="return-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>

        <p className="text-sm font-medium">Số tiền trả: {formatMoney(totalAmount)}</p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} disabled={pending || lines.length === 0}>
          {pending ? "Đang xử lý..." : "Xác nhận trả hàng"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function OrderReturnDialog({ open, onOpenChange, orderId, items, onReturned }: OrderReturnDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trả hàng</DialogTitle>
        </DialogHeader>

        {open ? (
          <OrderReturnFields
            orderId={orderId}
            items={items}
            onCancel={() => onOpenChange(false)}
            onReturned={() => {
              onOpenChange(false);
              onReturned();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
