"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { formatISODateVN } from "@/lib/date";
import { listInventory, snapshotStockManually, type InventoryRow } from "@/features/inventory/actions/inventory";
import { listProductGroups, type ReferenceOption } from "@/features/products/actions/reference-data";
import { InventoryTable } from "./inventory-table";

const PAGE_SIZE = 20;

export function InventoryPageClient() {
  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState<string | "all">("all");
  const [asOfDate, setAsOfDate] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<ReferenceOption[]>([]);
  const [snapshotting, setSnapshotting] = useState(false);

  useEffect(() => {
    void (async () => {
      setGroups(await listProductGroups());
    })();
  }, []);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listInventory({ search, groupId, asOfDate: asOfDate || null, page, pageSize: PAGE_SIZE });
      setRows(result.rows);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [search, groupId, asOfDate, page]);

  async function handleSnapshotNow() {
    setSnapshotting(true);
    const result = await snapshotStockManually(formatISODateVN(new Date()));
    setSnapshotting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã chốt tồn cuối ngày hôm nay");
  }

  useEffect(() => {
    void (async () => {
      await loadInventory();
    })();
  }, [loadInventory]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
  const belowMinimumCount = useMemo(() => rows.filter((r) => r.isBelowMinimum).length, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Kho — Tồn hiện tại</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSnapshotNow} disabled={snapshotting}>
            {snapshotting ? "Đang chốt..." : "Chốt tồn thủ công"}
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/inventory/stocktakes" />}>
            Kiểm kho
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/inventory/documents" />}>
            Phiếu nhập / xuất / điều chỉnh
          </Button>
        </div>
      </div>

      {belowMinimumCount > 0 ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          {belowMinimumCount} sản phẩm đang dưới mức tồn tối thiểu (trong trang hiện tại).
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Tìm theo mã, tên..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-64"
        />
        <Select
          value={groupId}
          onValueChange={(value) => {
            setGroupId(value ?? "all");
            setPage(1);
          }}
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
        <div className="flex items-center gap-1.5">
          <label htmlFor="as-of-date" className="text-sm text-muted-foreground">
            Tồn tại ngày
          </label>
          <Input
            id="as-of-date"
            type="date"
            value={asOfDate}
            onChange={(e) => {
              setAsOfDate(e.target.value);
              setPage(1);
            }}
            className="w-40"
          />
          {asOfDate ? (
            <Button variant="ghost" size="sm" onClick={() => setAsOfDate("")}>
              Xem hiện tại
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Đang tải...</p>
      ) : (
        <InventoryTable rows={rows} />
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Tổng {total} sản phẩm theo dõi tồn kho</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Trước
          </Button>
          <span>
            Trang {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Sau
          </Button>
        </div>
      </div>
    </div>
  );
}
