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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { parseMoney } from "@/lib/money";
import { cashEntryInputSchema } from "@/features/cashbook/domain/cash-entry";
import { createCashEntry, type CashCategoryOption } from "@/features/cashbook/actions/cashbook";

interface CashEntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CashCategoryOption[];
  contacts: { id: string; name: string }[];
  onCreated: () => void;
}

function nowForInput(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function CashEntryFormFields({
  categories,
  contacts,
  onCancel,
  onSaved,
}: {
  categories: CashCategoryOption[];
  contacts: { id: string; name: string }[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer">("cash");
  const [occurredAt, setOccurredAt] = useState(nowForInput());
  const [description, setDescription] = useState("");
  const [contactId, setContactId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  const visibleCategories = categories.filter((c) => c.kind === kind);

  async function handleSubmit() {
    const parsed = cashEntryInputSchema.safeParse({
      kind,
      categoryId,
      amount: parseMoney(amount) ?? -1,
      method,
      occurredAt: new Date(occurredAt).toISOString(),
      description,
      contactId,
    });

    if (!parsed.success) {
      setErrors([...new Set(parsed.error.issues.map((i) => i.message))]);
      return;
    }

    setPending(true);
    setErrors([]);
    const result = await createCashEntry(parsed.data);
    setPending(false);

    if (!result.ok) {
      setErrors([result.error]);
      return;
    }

    toast.success(`Đã tạo phiếu ${result.data.entryNo}`);
    onSaved();
  }

  return (
    <>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Loại phiếu</Label>
            <Select
              value={kind}
              onValueChange={(v) => {
                setKind((v ?? "expense") as typeof kind);
                setCategoryId(null);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Phiếu thu</SelectItem>
                <SelectItem value="expense">Phiếu chi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Danh mục</Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn danh mục" />
              </SelectTrigger>
              <SelectContent>
                {visibleCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cash-amount">Số tiền</Label>
            <Input id="cash-amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
          </div>
          <div className="space-y-1.5">
            <Label>Hình thức</Label>
            <Select value={method} onValueChange={(v) => setMethod((v ?? "cash") as typeof method)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Tiền mặt</SelectItem>
                <SelectItem value="transfer">Chuyển khoản</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cash-occurred">Thời điểm</Label>
            <Input
              id="cash-occurred"
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Đối tác (tùy chọn)</Label>
            <Select value={contactId} onValueChange={(v) => setContactId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Không chọn" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cash-description">Mô tả</Label>
          <Textarea id="cash-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>

        {errors.length > 0 ? (
          <ul className="list-inside list-disc text-sm text-destructive">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} disabled={pending}>
          {pending ? "Đang lưu..." : "Tạo phiếu"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function CashEntryFormDialog({ open, onOpenChange, categories, contacts, onCreated }: CashEntryFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo phiếu thu/chi</DialogTitle>
        </DialogHeader>

        {open ? (
          <CashEntryFormFields
            categories={categories}
            contacts={contacts}
            onCancel={() => onOpenChange(false)}
            onSaved={() => {
              onOpenChange(false);
              onCreated();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
