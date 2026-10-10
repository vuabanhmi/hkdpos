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
import { formatMoney, parseMoney } from "@/lib/money";
import { completeOrder, type PaymentInput } from "@/features/sales/actions/pos";

interface PosCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNo: string;
  total: number;
  hasContact: boolean;
  onCompleted: () => void;
}

interface PaymentDraft {
  method: "cash" | "transfer" | "other";
  amount: string;
}

function PosCheckoutFields({
  orderId,
  orderNo,
  total,
  hasContact,
  onCancel,
  onCompleted,
}: {
  orderId: string;
  orderNo: string;
  total: number;
  hasContact: boolean;
  onCancel: () => void;
  onCompleted: () => void;
}) {
  const [payments, setPayments] = useState<PaymentDraft[]>([{ method: "cash", amount: String(total) }]);
  const [pending, setPending] = useState(false);

  const paidTotal = payments.reduce((sum, p) => sum + (parseMoney(p.amount) ?? 0), 0);
  const debt = Math.max(0, total - paidTotal);

  function updatePayment(index: number, patch: Partial<PaymentDraft>) {
    setPayments((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  async function handleConfirm() {
    if (debt > 0 && !hasContact) {
      toast.error("Đơn còn nợ: phải chọn khách hàng trước khi thanh toán");
      return;
    }

    const parsedPayments: PaymentInput[] = payments
      .map((p) => ({ method: p.method, amount: parseMoney(p.amount) ?? 0 }))
      .filter((p) => p.amount > 0);

    setPending(true);
    const result = await completeOrder(orderId, parsedPayments);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(`Đã hoàn tất đơn ${result.data.orderNo}`);
    onCompleted();
  }

  return (
    <>
      <div className="space-y-3">
        <p className="text-lg font-semibold">
          Đơn {orderNo} — Tổng cộng {formatMoney(total)}
        </p>

        {payments.map((p, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="w-32 space-y-1.5">
              <Label className="text-xs">Hình thức</Label>
              <select
                value={p.method}
                onChange={(e) => updatePayment(i, { method: e.target.value as PaymentDraft["method"] })}
                className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
              >
                <option value="cash">Tiền mặt</option>
                <option value="transfer">Chuyển khoản</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Số tiền</Label>
              <Input value={p.amount} onChange={(e) => updatePayment(i, { amount: e.target.value })} />
            </div>
            {payments.length > 1 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPayments((prev) => prev.filter((_, idx) => idx !== i))}
              >
                Xóa
              </Button>
            ) : null}
          </div>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setPayments((prev) => [...prev, { method: "transfer", amount: "0" }])}
        >
          + Thêm hình thức thanh toán
        </Button>

        <p className="text-sm">
          Đã thu: <strong>{formatMoney(paidTotal)}</strong> — Còn nợ:{" "}
          <strong className={debt > 0 ? "text-destructive" : ""}>{formatMoney(debt)}</strong>
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Hủy
        </Button>
        <Button onClick={handleConfirm} disabled={pending}>
          {pending ? "Đang xử lý..." : "Xác nhận thanh toán"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function PosCheckoutDialog({
  open,
  onOpenChange,
  orderId,
  orderNo,
  total,
  hasContact,
  onCompleted,
}: PosCheckoutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thanh toán</DialogTitle>
        </DialogHeader>

        {open ? (
          <PosCheckoutFields
            key={orderId}
            orderId={orderId}
            orderNo={orderNo}
            total={total}
            hasContact={hasContact}
            onCancel={() => onOpenChange(false)}
            onCompleted={() => {
              onOpenChange(false);
              onCompleted();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
