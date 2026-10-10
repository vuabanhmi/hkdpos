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
import { createCounter, updateCounter, type CounterRow } from "@/features/counters/actions/counters";

interface CounterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: CounterRow;
  onSaved: () => void;
}

function CounterFormFields({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: CounterRow;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [managerName, setManagerName] = useState(initial?.managerName ?? "");
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [note, setNote] = useState(initial?.note ?? "");
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    if (!initial && !code.trim()) {
      toast.error("Thiếu mã quầy");
      return;
    }
    if (!name.trim()) {
      toast.error("Thiếu tên quầy");
      return;
    }

    setPending(true);
    const result = initial
      ? await updateCounter(initial.id, { code, name, managerName, sortOrder: Number(sortOrder) || 0, note })
      : await createCounter({ code, name, managerName, sortOrder: Number(sortOrder) || 0, note });
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Đã lưu quầy");
    onSaved();
  }

  return (
    <>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="counter-code">Mã quầy</Label>
            <Input id="counter-code" value={code} onChange={(e) => setCode(e.target.value)} disabled={Boolean(initial)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="counter-name">Tên quầy</Label>
            <Input id="counter-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="counter-manager">Người phụ trách</Label>
            <Input id="counter-manager" value={managerName} onChange={(e) => setManagerName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="counter-sort">Thứ tự hiển thị</Label>
            <Input id="counter-sort" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} inputMode="numeric" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="counter-note">Ghi chú</Label>
          <Input id="counter-note" value={note} onChange={(e) => setNote(e.target.value)} />
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

export function CounterFormDialog({ open, onOpenChange, initial, onSaved }: CounterFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Sửa quầy" : "Thêm quầy"}</DialogTitle>
        </DialogHeader>

        {open ? (
          <CounterFormFields
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
