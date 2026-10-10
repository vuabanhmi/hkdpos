"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { contactInputSchema, type ContactInput } from "@/features/contacts/domain/contact";
import { createContact, updateContact, type ContactRow } from "@/features/contacts/actions/contacts";

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ContactRow;
  onSaved: () => void;
}

/** Mount mới mỗi lần mở dialog (xem ghi chú ở product-form-dialog.tsx cho lý do). */
function ContactFormFields({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: ContactRow;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState({
    name: initial?.name ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    address: initial?.address ?? "",
    taxCode: initial?.taxCode ?? "",
    bankName: initial?.bankName ?? "",
    bankAccount: initial?.bankAccount ?? "",
    isCustomer: initial?.isCustomer ?? false,
    isSupplier: initial?.isSupplier ?? false,
    note: initial?.note ?? "",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    const parsed = contactInputSchema.safeParse(values satisfies Partial<ContactInput>);
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => issue.message));
      return;
    }

    setPending(true);
    setErrors([]);
    const result = initial
      ? await updateContact(initial.id, parsed.data)
      : await createContact(parsed.data);
    setPending(false);

    if (!result.ok) {
      setErrors([result.error]);
      return;
    }

    toast.success(initial ? "Đã lưu đối tác" : "Đã thêm đối tác");
    onSaved();
  }

  return (
    <>
      <div className="grid max-h-[65vh] gap-3 overflow-y-auto pr-1">
        <div className="space-y-1.5">
          <Label htmlFor="c-name">Tên</Label>
          <Input id="c-name" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={values.isCustomer}
              onCheckedChange={(checked) => setValues({ ...values, isCustomer: checked === true })}
            />
            Khách hàng
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={values.isSupplier}
              onCheckedChange={(checked) => setValues({ ...values, isSupplier: checked === true })}
            />
            Nhà cung cấp
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="c-phone">Điện thoại</Label>
            <Input
              id="c-phone"
              value={values.phone}
              onChange={(e) => setValues({ ...values, phone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-email">Email</Label>
            <Input
              id="c-email"
              value={values.email}
              onChange={(e) => setValues({ ...values, email: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="c-address">Địa chỉ</Label>
          <Input
            id="c-address"
            value={values.address}
            onChange={(e) => setValues({ ...values, address: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="c-tax">Mã số thuế</Label>
            <Input
              id="c-tax"
              value={values.taxCode}
              onChange={(e) => setValues({ ...values, taxCode: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-bank">Ngân hàng</Label>
            <Input
              id="c-bank"
              value={values.bankName}
              onChange={(e) => setValues({ ...values, bankName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-account">Số tài khoản</Label>
            <Input
              id="c-account"
              value={values.bankAccount}
              onChange={(e) => setValues({ ...values, bankAccount: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="c-note">Ghi chú</Label>
          <Textarea
            id="c-note"
            value={values.note}
            onChange={(e) => setValues({ ...values, note: e.target.value })}
            rows={2}
          />
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
          {pending ? "Đang lưu..." : "Lưu"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function ContactFormDialog({ open, onOpenChange, initial, onSaved }: ContactFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Sửa đối tác" : "Thêm đối tác"}</DialogTitle>
        </DialogHeader>

        {open ? (
          <ContactFormFields
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
