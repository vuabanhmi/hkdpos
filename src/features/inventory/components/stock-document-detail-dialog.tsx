"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTimeVN } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { STOCK_DOC_TYPE_LABELS } from "@/features/inventory/domain/stock-document";
import {
  getStockDocumentDetail,
  voidStockDocument,
  type StockDocumentDetail,
} from "@/features/inventory/actions/stock-documents";

interface StockDocumentDetailDialogProps {
  documentId: string | null;
  onOpenChange: (open: boolean) => void;
  onVoided: () => void;
}

export function StockDocumentDetailDialog({
  documentId,
  onOpenChange,
  onVoided,
}: StockDocumentDetailDialogProps) {
  const [detail, setDetail] = useState<StockDocumentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!documentId) {
        setDetail(null);
        return;
      }
      setLoading(true);
      setVoidReason("");
      const data = await getStockDocumentDetail(documentId);
      setDetail(data);
      setLoading(false);
    })();
  }, [documentId]);

  async function handleVoid() {
    if (!documentId) return;
    setVoiding(true);
    const result = await voidStockDocument(documentId, voidReason);
    setVoiding(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Đã hủy phiếu");
    onOpenChange(false);
    onVoided();
  }

  return (
    <Dialog open={documentId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chi tiết phiếu {detail?.docNo}</DialogTitle>
        </DialogHeader>

        {loading || !detail ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Đang tải...</p>
        ) : (
          <div className="space-y-3">
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Loại phiếu</dt>
                <dd>{STOCK_DOC_TYPE_LABELS[detail.docType]}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Kho</dt>
                <dd>{detail.warehouseName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Đối tác</dt>
                <dd>{detail.contactName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Thời điểm</dt>
                <dd>{formatDateTimeVN(new Date(detail.occurredAt))}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Trạng thái</dt>
                <dd>
                  <Badge variant={detail.status === "posted" ? "default" : "outline"}>
                    {detail.status === "posted" ? "Đã ghi sổ" : "Đã hủy"}
                  </Badge>
                </dd>
              </div>
            </dl>

            {detail.note ? <p className="text-sm">Ghi chú: {detail.note}</p> : null}
            {detail.status === "voided" ? (
              <p className="text-sm text-muted-foreground">
                Hủy lúc {detail.voidedAt ? formatDateTimeVN(new Date(detail.voidedAt)) : ""} — lý do:{" "}
                {detail.voidReason}
              </p>
            ) : null}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Đơn vị</TableHead>
                  <TableHead>Số lượng</TableHead>
                  <TableHead>Giá nhập</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      {line.productCode} — {line.productName}
                    </TableCell>
                    <TableCell>{line.unitName}</TableCell>
                    <TableCell>{line.quantity}</TableCell>
                    <TableCell>{line.unitCost !== null ? formatMoney(line.unitCost) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {detail.status === "posted" ? (
              <div className="flex items-end gap-2 border-t pt-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="void-reason">Lý do hủy phiếu</Label>
                  <Input
                    id="void-reason"
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={handleVoid}
                  disabled={voiding || !voidReason.trim()}
                >
                  {voiding ? "Đang hủy..." : "Hủy phiếu"}
                </Button>
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
