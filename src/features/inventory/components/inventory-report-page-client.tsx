"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadBase64Xlsx } from "@/lib/download";
import { formatISODateVN, startOfDayVN } from "@/lib/date";
import {
  exportInventoryFlowReportToExcel,
  getInventoryFlowReport,
  type InventoryFlowRow,
} from "@/features/inventory/actions/inventory-report";
import { listWarehouses, type WarehouseOption } from "@/features/inventory/actions/stock-documents";
import { listProductGroups } from "@/features/products/actions/reference-data";
import type { ReferenceOption } from "@/features/products/actions/reference-data";
import { InventoryReportTable } from "./inventory-report-table";

function defaultDateFrom(): string {
  const d = startOfDayVN(new Date());
  d.setDate(d.getDate() - 30);
  return formatISODateVN(d);
}

export function InventoryReportPageClient() {
  const [dateFrom, setDateFrom] = useState(defaultDateFrom());
  const [dateTo, setDateTo] = useState(formatISODateVN(new Date()));
  const [warehouseId, setWarehouseId] = useState<string | "all">("all");
  const [groupId, setGroupId] = useState<string | "all">("all");
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [groups, setGroups] = useState<ReferenceOption[]>([]);
  const [rows, setRows] = useState<InventoryFlowRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [w, g] = await Promise.all([listWarehouses(), listProductGroups()]);
      setWarehouses(w);
      setGroups(g);
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getInventoryFlowReport({ dateFrom, dateTo, warehouseId, groupId }));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, warehouseId, groupId]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  async function handleExport() {
    const result = await exportInventoryFlowReportToExcel({ dateFrom, dateTo, warehouseId, groupId });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    downloadBase64Xlsx(result.data.base64, result.data.filename);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Báo cáo xuất nhập tồn</h1>
        <Button variant="outline" onClick={handleExport}>
          Xuất Excel
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        <span className="text-sm text-muted-foreground">đến</span>
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />

        <Select value={warehouseId} onValueChange={(v) => setWarehouseId((v ?? "all") as string | "all")}>
          <SelectTrigger>
            <SelectValue placeholder="Tất cả kho" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả kho</SelectItem>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={groupId} onValueChange={(v) => setGroupId((v ?? "all") as string | "all")}>
          <SelectTrigger>
            <SelectValue placeholder="Tất cả nhóm" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả nhóm</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Đang tải...</p> : <InventoryReportTable rows={rows} />}
    </div>
  );
}
