"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatISODateVN } from "@/lib/date";
import type { WarehouseOption } from "@/features/inventory/actions/stock-documents";
import {
  createStocktake,
  listStocktakeProductOptions,
  type StocktakeProductOption,
} from "@/features/inventory/actions/stocktakes";
import type { ReferenceOption } from "@/features/products/actions/reference-data";

interface StocktakeCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: WarehouseOption[];
  groups: ReferenceOption[];
  onCreated: (stocktakeId: string) => void;
}

function StocktakeCreateFields({
  warehouses,
  groups,
  onCancel,
  onSaved,
}: {
  warehouses: WarehouseOption[];
  groups: ReferenceOption[];
  onCancel: () => void;
  onSaved: (stocktakeId: string) => void;
}) {
  const [warehouseId, setWarehouseId] = useState<string | null>(
    warehouses.find((w) => w.isDefault)?.id ?? warehouses[0]?.id ?? null,
  );
  const [stocktakeDate, setStocktakeDate] = useState(formatISODateVN(new Date()));
  const [scope, setScope] = useState<"all" | "groups">("all");
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [products, setProducts] = useState<StocktakeProductOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void (async () => {
      setProducts(await listStocktakeProductOptions());
    })();
  }, []);

  function toggleGroup(groupId: string) {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  async function handleSubmit() {
    if (!warehouseId) {
      setError("Thiếu kho");
      return;
    }
    if (scope === "groups" && selectedGroupIds.size === 0) {
      setError("Chọn ít nhất một nhóm sản phẩm");
      return;
    }

    const productIds =
      scope === "all" ? null : products.filter((p) => p.groupId && selectedGroupIds.has(p.groupId)).map((p) => p.id);

    setPending(true);
    setError(null);
    const result = await createStocktake({ warehouseId, stocktakeDate, productIds, note });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast.success(`Đã tạo phiên kiểm kho ${result.data.stocktakeNo}`);
    onSaved(result.data.id);
  }

  return (
    <>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
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
            <Label htmlFor="stocktake-date">Ngày kiểm</Label>
            <Input
              id="stocktake-date"
              type="date"
              value={stocktakeDate}
              onChange={(e) => setStocktakeDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Phạm vi kiểm</Label>
          <Select value={scope} onValueChange={(v) => setScope((v ?? "all") as "all" | "groups")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toàn bộ sản phẩm theo dõi tồn</SelectItem>
              <SelectItem value="groups">Theo nhóm sản phẩm</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {scope === "groups" ? (
          <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto rounded-md border p-2">
            {groups.map((g) => (
              <label key={g.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={selectedGroupIds.has(g.id)} onCheckedChange={() => toggleGroup(g.id)} />
                {g.name}
              </label>
            ))}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="stocktake-note">Ghi chú</Label>
          <Textarea id="stocktake-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} disabled={pending}>
          {pending ? "Đang tạo..." : "Tạo phiên kiểm kho"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function StocktakeCreateDialog({ open, onOpenChange, warehouses, groups, onCreated }: StocktakeCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tạo phiên kiểm kho</DialogTitle>
        </DialogHeader>

        {open ? (
          <StocktakeCreateFields
            warehouses={warehouses}
            groups={groups}
            onCancel={() => onOpenChange(false)}
            onSaved={(id) => {
              onOpenChange(false);
              onCreated(id);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
