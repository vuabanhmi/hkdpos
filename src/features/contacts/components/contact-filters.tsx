"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ContactFiltersValue {
  search: string;
  type: "all" | "customer" | "supplier";
  status: "all" | "active" | "inactive";
}

interface ContactFiltersProps {
  value: ContactFiltersValue;
  onChange: (value: ContactFiltersValue) => void;
}

export function ContactFilters({ value, onChange }: ContactFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Tìm theo tên, điện thoại, mã số thuế..."
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        className="w-64"
      />
      <Select value={value.type} onValueChange={(type) => onChange({ ...value, type: type ?? "all" })}>
        <SelectTrigger>
          <SelectValue placeholder="Loại đối tác" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả</SelectItem>
          <SelectItem value="customer">Khách hàng</SelectItem>
          <SelectItem value="supplier">Nhà cung cấp</SelectItem>
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
