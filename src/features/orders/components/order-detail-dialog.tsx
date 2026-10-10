"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTimeVN } from "@/lib/date";
import { formatMoney, parseMoney } from "@/lib/money";
import {
  cancelOrder,
  getOrderDetail,
  recordOrderPayment,
  type OrderDetail,
} from "@/features/orders/actions/orders";
import { OrderPrintView } from "./order-print-view";
import { OrderReturnDialog } from "./order-return-dialog";

interface OrderDetailDialogProps {
  orderId: string | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

const METHOD_LABELS: Record<string, string> = { cash: "Tiền mặt", transfer: "Chuyển khoản", other: "Khác" };

export function OrderDetailDialog({ orderId, onOpenChange, onChanged }: OrderDetailDialogProps) {
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "other">("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);

  async function load() {
    if (!orderId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setCancelReason("");
    setPaymentAmount("");
    setDetail(await getOrderDetail(orderId));
    setLoading(false);
  }

  useEffect(() => {
    void (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function handleCancel() {
    if (!orderId) return;
    setCancelling(true);
    const result = await cancelOrder(orderId, cancelReason);
    setCancelling(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã hủy đơn");
    onChanged();
    void load();
  }

  async function handleRecordPayment() {
    if (!orderId) return;
    const amount = parseMoney(paymentAmount);
    if (!amount) {
      toast.error("Số tiền không hợp lệ");
      return;
    }

    setRecordingPayment(true);
    const result = await recordOrderPayment(orderId, { method: paymentMethod, amount });
    setRecordingPayment(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã ghi nhận thanh toán");
    setPaymentAmount("");
    onChanged();
    void load();
  }

  return (
    <Dialog open={orderId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Đơn hàng {detail?.orderNo}</DialogTitle>
        </DialogHeader>

        {loading || !detail ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Đang tải...</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={detail.status === "completed" ? "default" : "outline"}>
                {detail.status === "completed" ? "Hoàn thành" : "Đã hủy"}
              </Badge>
              <span>{formatDateTimeVN(new Date(detail.orderedAt))}</span>
              <span>Khách: {detail.contactName ?? "Khách lẻ"}</span>
              {detail.status === "cancelled" ? (
                <span className="text-muted-foreground">Lý do hủy: {detail.cancelReason}</span>
              ) : null}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>SL</TableHead>
                  <TableHead>Đơn giá</TableHead>
                  <TableHead>Giảm</TableHead>
                  <TableHead>Thành tiền</TableHead>
                  <TableHead>Đã trả</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatMoney(item.unitPrice)}</TableCell>
                    <TableCell>{formatMoney(item.discount)}</TableCell>
                    <TableCell>{formatMoney(item.lineTotal)}</TableCell>
                    <TableCell>{item.returnedQuantity > 0 ? item.returnedQuantity : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p>Tạm tính: {formatMoney(detail.subtotal)}</p>
                <p>Giảm giá: {formatMoney(detail.discountTotal)}</p>
                <p className="font-semibold">Tổng cộng: {formatMoney(detail.total)}</p>
                <p>Đã thanh toán: {formatMoney(detail.paidTotal)}</p>
                {detail.debtTotal > 0 ? (
                  <p className="text-destructive">Còn nợ: {formatMoney(detail.debtTotal)}</p>
                ) : null}
              </div>
              <div>
                <p className="mb-1 font-medium">Thanh toán</p>
                {detail.payments.length === 0 ? (
                  <p className="text-muted-foreground">Chưa có</p>
                ) : (
                  detail.payments.map((p) => (
                    <p key={p.id}>
                      {METHOD_LABELS[p.method]}: {formatMoney(p.amount)} ({formatDateTimeVN(new Date(p.paidAt))})
                    </p>
                  ))
                )}
                {detail.returns.length > 0 ? (
                  <>
                    <p className="mt-2 mb-1 font-medium">Trả hàng</p>
                    {detail.returns.map((r) => (
                      <p key={r.id}>
                        {r.returnNo}: {formatMoney(r.totalAmount)} — {r.reason}
                      </p>
                    ))}
                  </>
                ) : null}
              </div>
            </div>

            {detail.status === "completed" ? (
              <div className="space-y-3 border-t pt-3">
                {detail.debtTotal > 0 ? (
                  <div className="flex items-end gap-2">
                    <div className="w-32 space-y-1.5">
                      <Label className="text-xs">Hình thức</Label>
                      <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod((v ?? "cash") as typeof paymentMethod)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Tiền mặt</SelectItem>
                          <SelectItem value="transfer">Chuyển khoản</SelectItem>
                          <SelectItem value="other">Khác</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs">Số tiền thu thêm</Label>
                      <Input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                    </div>
                    <Button onClick={handleRecordPayment} disabled={recordingPayment}>
                      Ghi nhận
                    </Button>
                  </div>
                ) : null}

                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs">Lý do hủy đơn</Label>
                    <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                  </div>
                  <Button variant="outline" onClick={() => setReturnOpen(true)}>
                    Trả hàng
                  </Button>
                  <Button variant="destructive" onClick={handleCancel} disabled={cancelling || !cancelReason.trim()}>
                    Hủy đơn
                  </Button>
                </div>
              </div>
            ) : null}

            <OrderPrintView order={detail} />
          </div>
        )}

        <DialogFooter>
          {detail ? (
            <Button variant="outline" onClick={() => window.print()}>
              In hóa đơn
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>

        {detail ? (
          <OrderReturnDialog
            open={returnOpen}
            onOpenChange={setReturnOpen}
            orderId={detail.id}
            items={detail.items}
            onReturned={() => {
              onChanged();
              void load();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
