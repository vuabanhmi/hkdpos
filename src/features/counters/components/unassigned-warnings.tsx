"use client";

import { AlertTriangleIcon } from "lucide-react";
import type { GroupAssignmentRow, UnassignedProductRow } from "@/features/counters/actions/counters";

interface UnassignedWarningsProps {
  groups: GroupAssignmentRow[];
  products: UnassignedProductRow[];
}

export function UnassignedWarnings({ groups, products }: UnassignedWarningsProps) {
  const unassignedGroups = groups.filter((g) => g.counterId === null);
  if (unassignedGroups.length === 0 && products.length === 0) return null;

  return (
    <div className="space-y-1 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
      <div className="flex items-center gap-1.5 font-medium">
        <AlertTriangleIcon className="size-4" />
        Chưa gán quầy đầy đủ
      </div>
      {unassignedGroups.length > 0 ? (
        <p>Nhóm sản phẩm chưa gán quầy: {unassignedGroups.map((g) => g.groupName).join(", ")}</p>
      ) : null}
      {products.length > 0 ? (
        <p>
          Sản phẩm chưa có quầy hiệu lực: {products.map((p) => `${p.code} (${p.name})`).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
