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
import { createCashEntryReversal } from "@/features/cashbook/actions/cashbook";
import type { CashLedgerRow } from "@/features/cashbook/actions/cashbook";

interface CashEntryReversalDialogProps {
  entry: CashLedgerRow | null;
  onOpenChange: (open: boolean) => void;
  onReversed: () => void;
}

export function CashEntryReversalDialog({ entry, onOpenChange, onReversed }: CashEntryReversalDialogProps) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (!entry) return;
    setPending(true);
    const result = await createCashEntryReversal(entry.sourceId, reason);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(`Đã tạo phiếu đảo ${result.data.entryNo}`);
    setReason("");
    onReversed();
  }

  return (
    <Dialog open={entry !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo phiếu đảo cho {entry?.entryNo}</DialogTitle>
        </DialogHeader>

        {entry ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sẽ tạo một phiếu {entry.kind === "income" ? "thu" : "chi"} mới với số tiền{" "}
              <strong>-{formatMoney(entry.amount)}</strong> để triệt tiêu phiếu gốc trong báo cáo. Không sửa hoặc
              xóa phiếu gốc.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="reversal-reason">Lý do</Label>
              <Input id="reversal-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Hủy
          </Button>
          <Button onClick={handleConfirm} disabled={pending || !reason.trim()}>
            {pending ? "Đang xử lý..." : "Xác nhận tạo phiếu đảo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
