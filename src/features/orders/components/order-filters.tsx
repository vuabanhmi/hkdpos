"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrderStatus } from "@/features/orders/actions/orders";

export interface OrderFiltersValue {
  status: OrderStatus | "all";
  search: string;
  dateFrom: string;
  dateTo: string;
}

interface OrderFiltersProps {
  value: OrderFiltersValue;
  onChange: (value: OrderFiltersValue) => void;
}

export function OrderFilters({ value, onChange }: OrderFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Tìm theo mã đơn..."
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        className="w-56"
      />
      <Select
        value={value.status}
        onValueChange={(v) => onChange({ ...value, status: (v ?? "all") as OrderStatus | "all" })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả</SelectItem>
          <SelectItem value="completed">Hoàn thành</SelectItem>
          <SelectItem value="cancelled">Đã hủy</SelectItem>
        </SelectContent>
      </Select>
      <Input
        type="date"
        value={value.dateFrom}
        onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
        className="w-36"
      />
      <span className="text-sm text-muted-foreground">—</span>
      <Input
        type="date"
        value={value.dateTo}
        onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
        className="w-36"
      />
    </div>
  );
}
