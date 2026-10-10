"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  listCounters,
  listGroupAssignments,
  listProductsWithoutCounter,
  setCounterActive,
  type CounterRow,
  type GroupAssignmentRow,
  type UnassignedProductRow,
} from "@/features/counters/actions/counters";
import { CounterFormDialog } from "./counter-form-dialog";
import { CounterTable } from "./counter-table";
import { GroupAssignmentPanel } from "./group-assignment-panel";
import { UnassignedWarnings } from "./unassigned-warnings";

export function CountersPageClient() {
  const [counters, setCounters] = useState<CounterRow[]>([]);
  const [groups, setGroups] = useState<GroupAssignmentRow[]>([]);
  const [unassignedProducts, setUnassignedProducts] = useState<UnassignedProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CounterRow | undefined>();

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [c, g, p] = await Promise.all([listCounters(), listGroupAssignments(), listProductsWithoutCounter()]);
    setCounters(c);
    setGroups(g);
    setUnassignedProducts(p);
    setLoading(false);
  }, []);

  useEffect(() => {
    void (async () => {
      await loadAll();
    })();
  }, [loadAll]);

  async function handleToggleActive(row: CounterRow) {
    const result = await setCounterActive(row.id, !row.isActive);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(row.isActive ? "Đã vô hiệu hóa quầy" : "Đã kích hoạt lại quầy");
    void loadAll();
  }

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Đang tải...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quầy bán hàng</h1>
        <Button
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          Thêm quầy
        </Button>
      </div>

      <UnassignedWarnings groups={groups} products={unassignedProducts} />

      <CounterTable
        rows={counters}
        onEdit={(row) => {
          setEditing(row);
          setFormOpen(true);
        }}
        onToggleActive={handleToggleActive}
      />

      <div>
        <h2 className="mb-2 text-lg font-medium">Gán nhóm sản phẩm cho quầy</h2>
        <GroupAssignmentPanel counters={counters.filter((c) => c.isActive)} groups={groups} onChanged={loadAll} />
      </div>

      <CounterFormDialog open={formOpen} onOpenChange={setFormOpen} initial={editing} onSaved={loadAll} />
    </div>
  );
}
