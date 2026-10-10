"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listStockDocuments,
  listWarehouses,
  type StockDocumentListRow,
  type WarehouseOption,
} from "@/features/inventory/actions/stock-documents";
import {
  STOCK_DOC_TYPE_LABELS,
  STOCK_DOC_TYPES,
  type StockDocType,
} from "@/features/inventory/domain/stock-document";
import { listActiveSuppliers } from "@/features/contacts/actions/contacts";
import { listActiveProductOptions, type ProductPickerOption } from "@/features/products/actions/products";
import { AllowNegativeStockToggle } from "./allow-negative-stock-toggle";
import { StockDocumentDetailDialog } from "./stock-document-detail-dialog";
import { StockDocumentFormDialog } from "./stock-document-form-dialog";
import { StockDocumentTable } from "./stock-document-table";

const PAGE_SIZE = 20;

export function StockDocumentsPageClient() {
  const [docType, setDocType] = useState<StockDocType | "all">("all");
  const [status, setStatus] = useState<"all" | "posted" | "voided">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<StockDocumentListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<ProductPickerOption[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [w, s, p] = await Promise.all([
        listWarehouses(),
        listActiveSuppliers(),
        listActiveProductOptions(),
      ]);
      setWarehouses(w);
      setSuppliers(s);
      setProducts(p);
    })();
  }, []);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listStockDocuments({ docType, status, search, page, pageSize: PAGE_SIZE });
      setRows(result.rows);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [docType, status, search, page]);

  useEffect(() => {
    void (async () => {
      await loadDocuments();
    })();
  }, [loadDocuments]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Phiếu nhập / xuất / điều chỉnh</h1>
        <div className="flex items-center gap-2">
          <AllowNegativeStockToggle />
          <Button onClick={() => setFormOpen(true)}>Tạo phiếu</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Tìm theo số phiếu..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-56"
        />
        <Select
          value={docType}
          onValueChange={(v) => {
            setDocType((v ?? "all") as StockDocType | "all");
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Loại phiếu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            {STOCK_DOC_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {STOCK_DOC_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus((v ?? "all") as "all" | "posted" | "voided");
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="posted">Đã ghi sổ</SelectItem>
            <SelectItem value="voided">Đã hủy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Đang tải...</p>
      ) : (
        <StockDocumentTable rows={rows} onView={(row) => setViewingId(row.id)} />
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Tổng {total} phiếu</span>
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

      <StockDocumentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        warehouses={warehouses}
        suppliers={suppliers}
        products={products}
        onCreated={loadDocuments}
      />

      <StockDocumentDetailDialog
        documentId={viewingId}
        onOpenChange={(open) => !open && setViewingId(null)}
        onVoided={loadDocuments}
      />
    </div>
  );
}
