"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  exportOrdersToExcel,
  listOrders,
  type OrderListRow,
} from "@/features/orders/actions/orders";
import { downloadBase64Xlsx } from "@/lib/download";
import { OrderDetailDialog } from "./order-detail-dialog";
import { OrderFilters, type OrderFiltersValue } from "./order-filters";
import { OrderTable } from "./order-table";

const PAGE_SIZE = 20;

export function OrdersPageClient() {
  const [filters, setFilters] = useState<OrderFiltersValue>({
    status: "all",
    search: "",
    dateFrom: "",
    dateTo: "",
  });
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<OrderListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listOrders({
        status: filters.status,
        search: filters.search,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setRows(result.rows);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void (async () => {
      await loadOrders();
    })();
  }, [loadOrders]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  async function handleExport() {
    const result = await exportOrdersToExcel({
      status: filters.status,
      search: filters.search,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    downloadBase64Xlsx(result.data.base64, result.data.filename);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Đơn hàng</h1>
        <Button variant="outline" onClick={handleExport}>
          Xuất Excel
        </Button>
      </div>

      <OrderFilters
        value={filters}
        onChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
      />

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Đang tải...</p>
      ) : (
        <OrderTable rows={rows} onView={(row) => setViewingId(row.id)} />
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Tổng {total} đơn</span>
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

      <OrderDetailDialog
        orderId={viewingId}
        onOpenChange={(open) => !open && setViewingId(null)}
        onChanged={loadOrders}
      />
    </div>
  );
}
