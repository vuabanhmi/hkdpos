"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CashCategoryOption } from "@/features/cashbook/actions/cashbook";

export interface CashEntryFiltersValue {
  kind: "income" | "expense" | "all";
  categoryId: string | "all";
  method: "cash" | "transfer" | "all";
  dateFrom: string;
  dateTo: string;
}

interface CashEntryFiltersProps {
  value: CashEntryFiltersValue;
  categories: CashCategoryOption[];
  onChange: (value: CashEntryFiltersValue) => void;
}

export function CashEntryFilters({ value, categories, onChange }: CashEntryFiltersProps) {
  const visibleCategories = value.kind === "all" ? categories : categories.filter((c) => c.kind === value.kind);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value.kind} onValueChange={(v) => onChange({ ...value, kind: (v ?? "all") as CashEntryFiltersValue["kind"], categoryId: "all" })}>
        <SelectTrigger>
          <SelectValue placeholder="Loại" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả</SelectItem>
          <SelectItem value="income">Thu</SelectItem>
          <SelectItem value="expense">Chi</SelectItem>
        </SelectContent>
      </Select>

      <Select value={value.categoryId} onValueChange={(v) => onChange({ ...value, categoryId: (v ?? "all") as string })}>
        <SelectTrigger>
          <SelectValue placeholder="Danh mục" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả danh mục</SelectItem>
          {visibleCategories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.method} onValueChange={(v) => onChange({ ...value, method: (v ?? "all") as CashEntryFiltersValue["method"] })}>
        <SelectTrigger>
          <SelectValue placeholder="Hình thức" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả hình thức</SelectItem>
          <SelectItem value="cash">Tiền mặt</SelectItem>
          <SelectItem value="transfer">Chuyển khoản</SelectItem>
        </SelectContent>
      </Select>

      <Input type="date" value={value.dateFrom} onChange={(e) => onChange({ ...value, dateFrom: e.target.value })} className="w-36" />
      <span className="text-sm text-muted-foreground">—</span>
      <Input type="date" value={value.dateTo} onChange={(e) => onChange({ ...value, dateTo: e.target.value })} className="w-36" />
    </div>
  );
}
