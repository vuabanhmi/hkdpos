"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadBase64Xlsx } from "@/lib/download";
import {
  commitContactImport,
  exportContactImportTemplate,
  parseContactImportFile,
} from "@/features/contacts/actions/import-export";
import type { ContactImportSummary } from "@/features/contacts/domain/import";

interface ContactImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function ContactImportDialog({ open, onOpenChange, onImported }: ContactImportDialogProps) {
  const [summary, setSummary] = useState<ContactImportSummary | null>(null);
  const [fileName, setFileName] = useState("");
  const [pending, setPending] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setSummary(null);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDownloadTemplate() {
    setDownloadingTemplate(true);
    const result = await exportContactImportTemplate();
    setDownloadingTemplate(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    downloadBase64Xlsx(result.data.base64, result.data.filename);
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    setPending(true);
    const result = await parseContactImportFile(file);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSummary(result.data);
  }

  async function handleConfirm() {
    if (!summary || summary.hasErrors || summary.validRows.length === 0) return;
    setPending(true);
    const result = await commitContactImport(summary.validRows);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(`Đã nhập ${result.data.inserted} đối tác mới, cập nhật ${result.data.updated} đối tác`);
    reset();
    onOpenChange(false);
    onImported();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nhập đối tác từ Excel</DialogTitle>
          <DialogDescription>
            File .xlsx với các cột: Tên, Điện thoại, Email, Địa chỉ, Mã số thuế, Tên ngân hàng, Số tài
            khoản, Khách hàng (Có/Không), Nhà cung cấp (Có/Không), Ghi chú. Tên đã có sẽ được cập nhật.
          </DialogDescription>
        </DialogHeader>

        <Button
          type="button"
          variant="link"
          className="h-auto w-fit justify-start p-0 text-sm"
          onClick={handleDownloadTemplate}
          disabled={downloadingTemplate}
        >
          {downloadingTemplate ? "Đang tạo file mẫu..." : "Tải file mẫu (có hướng dẫn định dạng từng cột)"}
        </Button>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
          className="text-sm"
        />

        {summary ? (
          <div className="max-h-[50vh] overflow-y-auto">
            <p className="mb-2 text-sm">
              {fileName}: {summary.results.length} dòng,{" "}
              {summary.hasErrors ? (
                <span className="text-destructive">
                  có {summary.results.filter((r) => !r.ok).length} dòng lỗi — chưa ghi dữ liệu
                </span>
              ) : (
                <span className="text-emerald-600">tất cả hợp lệ, sẵn sàng nhập</span>
              )}
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dòng</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Kết quả</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.results.map((r) => (
                  <TableRow key={r.rowNumber}>
                    <TableCell>{r.rowNumber}</TableCell>
                    <TableCell>{r.data?.name ?? "—"}</TableCell>
                    <TableCell>
                      {r.ok ? (
                        <span className="text-emerald-600">
                          Hợp lệ {r.data?.existingContactId ? "(cập nhật)" : "(thêm mới)"}
                        </span>
                      ) : (
                        <span className="text-destructive">{r.errors.join("; ")}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Đóng
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={pending || !summary || summary.hasErrors || summary.validRows.length === 0}
          >
            {pending ? "Đang xử lý..." : "Xác nhận nhập"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
