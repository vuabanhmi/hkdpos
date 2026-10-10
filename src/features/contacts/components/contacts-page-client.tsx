"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listContacts, setContactActive, type ContactRow } from "@/features/contacts/actions/contacts";
import { exportContactsToExcel } from "@/features/contacts/actions/import-export";
import { downloadBase64Xlsx } from "@/lib/download";
import { ContactFilters, type ContactFiltersValue } from "./contact-filters";
import { ContactFormDialog } from "./contact-form-dialog";
import { ContactImportDialog } from "./contact-import-dialog";
import { ContactTable } from "./contact-table";

const PAGE_SIZE = 20;

export function ContactsPageClient() {
  const [filters, setFilters] = useState<ContactFiltersValue>({ search: "", type: "all", status: "all" });
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContactRow | undefined>();
  const [importOpen, setImportOpen] = useState(false);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listContacts({ ...filters, page, pageSize: PAGE_SIZE });
      setRows(result.rows);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void (async () => {
      await loadContacts();
    })();
  }, [loadContacts]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  async function handleToggleActive(row: ContactRow) {
    const result = await setContactActive(row.id, !row.isActive);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(row.isActive ? "Đã vô hiệu hóa đối tác" : "Đã kích hoạt lại đối tác");
    void loadContacts();
  }

  async function handleExport() {
    const result = await exportContactsToExcel();
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    downloadBase64Xlsx(result.data.base64, result.data.filename);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Đối tác</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            Xuất Excel
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            Nhập Excel
          </Button>
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            Thêm đối tác
          </Button>
        </div>
      </div>

      <ContactFilters
        value={filters}
        onChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
      />

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Đang tải...</p>
      ) : (
        <ContactTable
          rows={rows}
          onEdit={(row) => {
            setEditing(row);
            setFormOpen(true);
          }}
          onToggleActive={handleToggleActive}
        />
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Tổng {total} đối tác</span>
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

      <ContactFormDialog open={formOpen} onOpenChange={setFormOpen} initial={editing} onSaved={loadContacts} />
      <ContactImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={loadContacts} />
    </div>
  );
}
