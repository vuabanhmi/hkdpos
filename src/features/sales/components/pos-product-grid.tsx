"use client";

import { forwardRef, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/money";
import type { PosProduct } from "@/features/sales/actions/pos";

interface PosProductGridProps {
  products: PosProduct[];
  onPick: (product: PosProduct) => void;
}

export const PosProductGrid = forwardRef<HTMLInputElement, PosProductGridProps>(function PosProductGrid(
  { products, onPick },
  searchInputRef,
) {
  const [search, setSearch] = useState("");
  const [counterFilter, setCounterFilter] = useState<string | "all">("all");

  const counters = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) {
      if (p.counterId) map.set(p.counterId, p.counterName ?? p.counterId);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [products]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      if (counterFilter !== "all") {
        if (counterFilter === "unassigned" ? p.counterId !== null : p.counterId !== counterFilter) return false;
      }
      if (!term) return true;
      return (
        p.code.toLowerCase().includes(term) ||
        p.name.toLowerCase().includes(term) ||
        (p.barcode ?? "").toLowerCase() === term
      );
    });
  }, [products, search, counterFilter]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex gap-2">
        <input
          ref={searchInputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filtered.length === 1) {
              onPick(filtered[0]);
              setSearch("");
            }
          }}
          placeholder="Tìm hoặc quét mã vạch sản phẩm (F1)"
          className="h-10 flex-1 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <Select value={counterFilter} onValueChange={(v) => setCounterFilter((v ?? "all") as typeof counterFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tất cả quầy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả quầy</SelectItem>
            <SelectItem value="unassigned">Chưa gán quầy</SelectItem>
            {counters.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((product) => (
          <button
            key={product.id}
            onClick={() => onPick(product)}
            className="flex flex-col items-start gap-1 rounded-lg border p-3 text-left text-sm hover:border-primary hover:bg-accent"
          >
            <span className="font-medium">{product.name}</span>
            <span className="text-xs text-muted-foreground">
              {product.code} · {product.unitName}
            </span>
            <span className="text-xs text-muted-foreground">{product.counterName ?? "Chưa gán quầy"}</span>
            <span className="text-sm font-semibold text-primary">
              {product.price !== null ? formatMoney(product.price) : "Chưa có giá"}
            </span>
          </button>
        ))}
        {filtered.length === 0 ? (
          <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
            Không tìm thấy sản phẩm.
          </p>
        ) : null}
      </div>
    </div>
  );
});
