"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  listProducts,
  setProductActive,
  type ProductListRow,
} from "@/features/products/actions/products";
import {
  listProductGroups,
  listTaxCategories,
  listUnits,
  type ReferenceOption,
  type TaxCategoryOption,
} from "@/features/products/actions/reference-data";
import { exportProductsToExcel } from "@/features/products/actions/import-export";
import { downloadBase64Xlsx } from "@/lib/download";
import { ProductFilters, type ProductFiltersValue } from "./product-filters";
import { ProductFormDialog, type ProductFormInitialValues } from "./product-form-dialog";
import { ProductImportDialog } from "./product-import-dialog";
import { ProductTable } from "./product-table";

const PAGE_SIZE = 20;

function toFormInitialValues(row: ProductListRow, duplicate: boolean): ProductFormInitialValues {
  return {
    id: duplicate ? undefined : row.id,
    code: duplicate ? "" : row.code,
    name: duplicate ? `${row.name} (bản sao)` : row.name,
    barcode: duplicate ? "" : row.barcode ?? "",
    unitId: row.unitId,
    groupId: row.groupId,
    taxCategoryId: row.taxCategoryId,
    trackStock: row.trackStock,
    costPrice: String(row.costPrice),
    note: duplicate ? "" : row.note ?? "",
  };
}

export function ProductsPageClient() {
  const [filters, setFilters] = useState<ProductFiltersValue>({ search: "", groupId: "all", status: "all" });
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ProductListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [units, setUnits] = useState<ReferenceOption[]>([]);
  const [groups, setGroups] = useState<ReferenceOption[]>([]);
  const [taxCategories, setTaxCategories] = useState<TaxCategoryOption[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [formInitialValues, setFormInitialValues] = useState<ProductFormInitialValues | undefined>();
  const [importOpen, setImportOpen] = useState(false);

  const loadReferenceData = useCallback(async () => {
    const [u, g, t] = await Promise.all([listUnits(), listProductGroups(), listTaxCategories()]);
    setUnits(u);
    setGroups(g);
    setTaxCategories(t);
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listProducts({ ...filters, page, pageSize: PAGE_SIZE });
      setRows(result.rows);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void (async () => {
      await loadReferenceData();
    })();
  }, [loadReferenceData]);

  useEffect(() => {
    void (async () => {
      await loadProducts();
    })();
  }, [loadProducts]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  async function handleToggleActive(row: ProductListRow) {
    const result = await setProductActive(row.id, !row.isActive);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(row.isActive ? "Đã vô hiệu hóa sản phẩm" : "Đã kích hoạt lại sản phẩm");
    void loadProducts();
  }

  async function handleExport() {
    const result = await exportProductsToExcel();
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    downloadBase64Xlsx(result.data.base64, result.data.filename);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Sản phẩm</h1>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/products/categories" />}>
            Quản lý danh mục
          </Button>
          <Button variant="outline" onClick={handleExport}>
            Xuất Excel
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            Nhập Excel
          </Button>
          <Button
            onClick={() => {
              setFormInitialValues(undefined);
              setFormOpen(true);
            }}
          >
            Thêm sản phẩm
          </Button>
        </div>
      </div>

      <ProductFilters
        value={filters}
        groups={groups}
        onChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
      />

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Đang tải...</p>
      ) : (
        <ProductTable
          rows={rows}
          onEdit={(row) => {
            setFormInitialValues(toFormInitialValues(row, false));
            setFormOpen(true);
          }}
          onDuplicate={(row) => {
            setFormInitialValues(toFormInitialValues(row, true));
            setFormOpen(true);
          }}
          onToggleActive={handleToggleActive}
        />
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Tổng {total} sản phẩm</span>
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

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialValues={formInitialValues}
        units={units}
        groups={groups}
        taxCategories={taxCategories}
        onGroupCreated={(group) => setGroups((prev) => [...prev, group])}
        onTaxCategoryCreated={(tc) => setTaxCategories((prev) => [...prev, tc])}
        onTaxCategoryDefaultChanged={(id) =>
          setTaxCategories((prev) => prev.map((tc) => ({ ...tc, isDefault: tc.id === id })))
        }
        onSaved={loadProducts}
      />

      <ProductImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={loadProducts} />
    </div>
  );
}
