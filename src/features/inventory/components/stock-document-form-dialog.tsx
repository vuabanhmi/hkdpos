"use client";

import { useState } from "react";
import { PlusIcon, TrashIcon } from "lucide-react";
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
import {
  STOCK_DOC_TYPE_LABELS,
  STOCK_DOC_TYPES,
  stockDocumentInputSchema,
  type StockDocType,
} from "@/features/inventory/domain/stock-document";
import { createStockDocument, type WarehouseOption } from "@/features/inventory/actions/stock-documents";
import type { ProductPickerOption } from "@/features/products/actions/products";

interface StockDocumentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: WarehouseOption[];
  suppliers: { id: string; name: string }[];
  products: ProductPickerOption[];
  onCreated: () => void;
}

interface LineDraft {
  key: number;
  productId: string | null;
  quantity: string;
  unitCost: string;
  note: string;
}

function emptyLine(key: number): LineDraft {
  return { key, productId: null, quantity: "", unitCost: "", note: "" };
}

function nowForInput(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function StockDocumentFormFields({
  warehouses,
  suppliers,
  products,
  onCancel,
  onSaved,
}: {
  warehouses: WarehouseOption[];
  suppliers: { id: string; name: string }[];
  products: ProductPickerOption[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [docType, setDocType] = useState<StockDocType>("purchase");
  const [warehouseId, setWarehouseId] = useState<string | null>(
    warehouses.find((w) => w.isDefault)?.id ?? warehouses[0]?.id ?? null,
  );
  const [contactId, setContactId] = useState<string | null>(null);
  const [occurredAt, setOccurredAt] = useState(nowForInput());
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine(0)]);
  const [nextKey, setNextKey] = useState(1);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  function updateLine(key: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine(nextKey)]);
    setNextKey((k) => k + 1);
  }

  function removeLine(key: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((line) => line.key !== key) : prev));
  }

  async function handleSubmit() {
    const parsed = stockDocumentInputSchema.safeParse({
      docType,
      warehouseId,
      contactId: docType === "purchase" ? contactId : null,
      occurredAt: new Date(occurredAt).toISOString(),
      note,
      lines: lines.map((line) => ({
        productId: line.productId,
        quantity: Number(line.quantity),
        unitCost: docType === "purchase" ? parseMoney(line.unitCost) : null,
        note: line.note,
      })),
    });

    if (!parsed.success) {
      setErrors([...new Set(parsed.error.issues.map((issue) => issue.message))]);
      return;
    }

    setPending(true);
    setErrors([]);
    const result = await createStockDocument(parsed.data);
    setPending(false);

    if (!result.ok) {
      setErrors([result.error]);
      return;
    }

    toast.success(`Đã ghi sổ phiếu ${result.data.docNo}`);
    onSaved();
  }

  return (
    <>
      <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Loại phiếu</Label>
            <Select value={docType} onValueChange={(v) => setDocType((v ?? "purchase") as StockDocType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STOCK_DOC_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {STOCK_DOC_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Kho</Label>
            <Select
              value={warehouseId}
              onValueChange={(v) => setWarehouseId(v)}
              items={warehouses.map((w) => ({ value: w.id, label: w.name }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn kho" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="occurred-at">Thời điểm</Label>
            <Input
              id="occurred-at"
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </div>
        </div>

        {docType === "purchase" ? (
          <div className="space-y-1.5">
            <Label>Nhà cung cấp</Label>
            <Select value={contactId} onValueChange={(v) => setContactId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn nhà cung cấp" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Dòng hàng</Label>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <PlusIcon /> Thêm dòng
            </Button>
          </div>

          {lines.map((line) => (
            <div key={line.key} className="flex items-end gap-2 rounded-md border p-2">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs">Sản phẩm</Label>
                <Select value={line.productId} onValueChange={(v) => updateLine(line.key, { productId: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn sản phẩm" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28 space-y-1.5">
                <Label className="text-xs">
                  Số lượng {docType === "adjustment" ? "(+/-)" : ""}
                </Label>
                <Input
                  value={line.quantity}
                  onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                  inputMode="decimal"
                />
              </div>
              {docType === "purchase" ? (
                <div className="w-32 space-y-1.5">
                  <Label className="text-xs">Giá nhập</Label>
                  <Input
                    value={line.unitCost}
                    onChange={(e) => updateLine(line.key, { unitCost: e.target.value })}
                    inputMode="numeric"
                  />
                </div>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeLine(line.key)}
                disabled={lines.length <= 1}
              >
                <TrashIcon />
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="doc-note">Ghi chú</Label>
          <Textarea id="doc-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
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
          {pending ? "Đang ghi sổ..." : "Ghi sổ"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function StockDocumentFormDialog({
  open,
  onOpenChange,
  warehouses,
  suppliers,
  products,
  onCreated,
}: StockDocumentFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tạo phiếu nhập / xuất / điều chỉnh</DialogTitle>
        </DialogHeader>

        {open ? (
          <StockDocumentFormFields
            warehouses={warehouses}
            suppliers={suppliers}
            products={products}
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
