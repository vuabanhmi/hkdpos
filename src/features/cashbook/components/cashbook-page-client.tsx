"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadBase64Xlsx } from "@/lib/download";
import {
  exportCashEntriesToExcel,
  getCashSummary,
  listCashCategories,
  listCashEntries,
  type CashCategoryOption,
  type CashLedgerRow,
} from "@/features/cashbook/actions/cashbook";
import { listActiveCustomers, listActiveSuppliers } from "@/features/contacts/actions/contacts";
import type { CashSummary } from "@/features/cashbook/domain/cash-summary";
import { CashEntryFilters, type CashEntryFiltersValue } from "./cash-entry-filters";
import { CashEntryFormDialog } from "./cash-entry-form-dialog";
import { CashEntryReversalDialog } from "./cash-entry-reversal-dialog";
import { CashEntryTable } from "./cash-entry-table";
import { CashSummaryCards } from "./cash-summary-cards";

const PAGE_SIZE = 20;

function emptySummary(): CashSummary {
  return { totalIncome: 0, totalExpense: 0, balance: 0 };
}

export function CashbookPageClient() {
  const [filters, setFilters] = useState<CashEntryFiltersValue>({
    kind: "all",
    categoryId: "all",
    method: "all",
    dateFrom: "",
    dateTo: "",
  });
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<CashLedgerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<CashSummary>(emptySummary());
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CashCategoryOption[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [reversing, setReversing] = useState<CashLedgerRow | null>(null);

  useEffect(() => {
    void (async () => {
      const [cats, customers, suppliers] = await Promise.all([
        listCashCategories(),
        listActiveCustomers(),
        listActiveSuppliers(),
      ]);
      setCategories(cats);
      const merged = new Map([...customers, ...suppliers].map((c) => [c.id, c]));
      setContacts([...merged.values()]);
    })();
  }, []);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const [result, summaryResult] = await Promise.all([
        listCashEntries({ ...filters, page, pageSize: PAGE_SIZE }),
        getCashSummary(filters.dateFrom || undefined, filters.dateTo || undefined),
      ]);
      setRows(result.rows);
      setTotal(result.total);
      setSummary(summaryResult);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void (async () => {
      await loadEntries();
    })();
  }, [loadEntries]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  async function handleExport() {
    const result = await exportCashEntriesToExcel(filters);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    downloadBase64Xlsx(result.data.base64, result.data.filename);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Thu chi</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            Xuất Excel
          </Button>
          <Button onClick={() => setFormOpen(true)}>Tạo phiếu</Button>
        </div>
      </div>

      <CashSummaryCards summary={summary} />

      <CashEntryFilters
        value={filters}
        categories={categories}
        onChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
      />

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Đang tải...</p>
      ) : (
        <CashEntryTable rows={rows} onReverse={setReversing} />
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Tổng {total} phiếu</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
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

      <CashEntryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        contacts={contacts}
        onCreated={loadEntries}
      />

      <CashEntryReversalDialog
        entry={reversing}
        onOpenChange={(open) => !open && setReversing(null)}
        onReversed={() => {
          setReversing(null);
          void loadEntries();
        }}
      />
    </div>
  );
}
