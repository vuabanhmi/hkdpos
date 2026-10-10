"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { listWarehouses, type WarehouseOption } from "@/features/inventory/actions/stock-documents";
import { listStocktakes, type StocktakeListRow } from "@/features/inventory/actions/stocktakes";
import { listProductGroups } from "@/features/products/actions/reference-data";
import type { ReferenceOption } from "@/features/products/actions/reference-data";
import { StocktakeCreateDialog } from "./stocktake-create-dialog";
import { StocktakeTable } from "./stocktake-table";

export function StocktakesPageClient() {
  const router = useRouter();
  const [rows, setRows] = useState<StocktakeListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [groups, setGroups] = useState<ReferenceOption[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listStocktakes());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const [w, g] = await Promise.all([listWarehouses(), listProductGroups()]);
      setWarehouses(w);
      setGroups(g);
    })();
    void (async () => {
      await load();
    })();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Kiểm kho theo ngày</h1>
        <Button onClick={() => setCreateOpen(true)}>Tạo phiên kiểm kho</Button>
      </div>

      {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Đang tải...</p> : <StocktakeTable rows={rows} />}

      <StocktakeCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        warehouses={warehouses}
        groups={groups}
        onCreated={(id) => router.push(`/inventory/stocktakes/${id}`)}
      />
    </div>
  );
}
