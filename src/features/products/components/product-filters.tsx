"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReferenceOption } from "@/features/products/actions/reference-data";

export interface ProductFiltersValue {
  search: string;
  groupId: string | "all";
  status: "all" | "active" | "inactive";
}

interface ProductFiltersProps {
  value: ProductFiltersValue;
  groups: ReferenceOption[];
  onChange: (value: ProductFiltersValue) => void;
}

export function ProductFilters({ value, groups, onChange }: ProductFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Tìm theo mã, tên, mã vạch..."
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        className="w-64"
      />
      <Select
        value={value.groupId}
        onValueChange={(groupId) => onChange({ ...value, groupId: groupId ?? "all" })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Tất cả nhóm" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả nhóm</SelectItem>
          {groups.map((group) => (
            <SelectItem key={group.id} value={group.id}>
              {group.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={value.status}
        onValueChange={(status) => onChange({ ...value, status: status ?? "all" })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả trạng thái</SelectItem>
          <SelectItem value="active">Đang hoạt động</SelectItem>
          <SelectItem value="inactive">Đã vô hiệu hóa</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
