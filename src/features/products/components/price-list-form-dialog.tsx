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
import {
  createPriceList,
  updatePriceList,
  type PriceListRow,
} from "@/features/products/actions/price-lists";

interface PriceListFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: PriceListRow;
  onSaved: () => void;
}

/**
 * Mount mới (key theo id) mỗi lần mở dialog, để state form luôn khởi tạo lại đúng giá trị
 * ban đầu mà không cần effect đồng bộ theo prop (tránh cascading render không cần thiết).
 */
function PriceListFormFields({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: PriceListRow;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [validFrom, setValidFrom] = useState(initial?.validFrom ?? "");
  const [validTo, setValidTo] = useState(initial?.validTo ?? "");
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Thiếu tên bảng giá");
      return;
    }

    setPending(true);
    const result = initial
      ? await updatePriceList(initial.id, { name, validFrom: validFrom || null, validTo: validTo || null })
      : await createPriceList({ name, validFrom: validFrom || null, validTo: validTo || null });
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Đã lưu bảng giá");
    onSaved();
  }

  return (
    <>
      <div className="grid gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pl-name">Tên bảng giá</Label>
          <Input id="pl-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="pl-from">Hiệu lực từ (tùy chọn)</Label>
            <Input
              id="pl-from"
              type="date"
              value={validFrom ?? ""}
              onChange={(e) => setValidFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pl-to">Hiệu lực đến (tùy chọn)</Label>
            <Input
              id="pl-to"
              type="date"
              value={validTo ?? ""}
              onChange={(e) => setValidTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function PriceListFormDialog({ open, onOpenChange, initial, onSaved }: PriceListFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Sửa bảng giá" : "Thêm bảng giá"}</DialogTitle>
        </DialogHeader>

        {open ? (
          <PriceListFormFields
            key={initial?.id ?? "new"}
            initial={initial}
            onCancel={() => onOpenChange(false)}
            onSaved={() => {
              onOpenChange(false);
              onSaved();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
