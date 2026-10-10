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
import { formatISODateVN } from "@/lib/date";
import { parseMoney } from "@/lib/money";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  manualRevenueEntryInputSchema,
  type PaymentMethod,
} from "@/features/ledger/domain/manual-revenue-entry";
import { createManualRevenueEntry } from "@/features/ledger/actions/revenue";
import type { TaxCategoryOption } from "@/features/products/actions/reference-data";

interface ManualRevenueEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taxCategories: TaxCategoryOption[];
  onCreated: () => void;
}

function Fields({
  taxCategories,
  onCancel,
  onSaved,
}: {
  taxCategories: TaxCategoryOption[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [entryDate, setEntryDate] = useState(formatISODateVN(new Date()));
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [taxCategoryId, setTaxCategoryId] = useState<string | null>(
    taxCategories.find((t) => t.isDefault)?.id ?? taxCategories[0]?.id ?? null,
  );
  const [evidenceNote, setEvidenceNote] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    const parsed = manualRevenueEntryInputSchema.safeParse({
      entryDate,
      description,
      amount: parseMoney(amount) ?? -1,
      paymentMethod,
      taxCategoryId,
      evidenceNote,
    });

    if (!parsed.success) {
      setErrors([...new Set(parsed.error.issues.map((i) => i.message))]);
      return;
    }

    setPending(true);
    setErrors([]);
    const result = await createManualRevenueEntry(parsed.data);
    setPending(false);

    if (!result.ok) {
      setErrors([result.error]);
      return;
    }

    toast.success(`Đã ghi doanh thu ${result.data.entryNo}`);
    onSaved();
  }

  return (
    <>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Ngày</Label>
            <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Số tiền</Label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Diễn giải</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Hình thức</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod((v ?? "cash") as PaymentMethod)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nhóm ngành nghề</Label>
            <Select
              value={taxCategoryId}
              onValueChange={(v) => setTaxCategoryId(v)}
              items={taxCategories.map((t) => ({ value: t.id, label: t.name }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn nhóm ngành nghề" />
              </SelectTrigger>
              <SelectContent>
                {taxCategories.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Chứng từ / ghi chú (tùy chọn)</Label>
          <Input value={evidenceNote} onChange={(e) => setEvidenceNote(e.target.value)} />
        </div>

        {errors.length > 0 ? (
          <ul className="list-inside list-disc text-sm text-destructive">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} disabled={pending}>
          {pending ? "Đang lưu..." : "Ghi doanh thu"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function ManualRevenueEntryDialog({ open, onOpenChange, taxCategories, onCreated }: ManualRevenueEntryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ghi doanh thu không qua POS</DialogTitle>
        </DialogHeader>
        {open ? (
          <Fields
            taxCategories={taxCategories}
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
