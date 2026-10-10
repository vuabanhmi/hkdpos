"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateVN, formatISODateVN } from "@/lib/date";
import { formatMoney, parseMoney } from "@/lib/money";
import {
  getTaxConfig,
  listTaxCategoryRates,
  setDeclarationPeriod,
  setRevenueThreshold,
  setTaxCategoryRate,
  type DeclarationPeriod,
  type TaxCategoryRateRow,
  type TaxConfig,
} from "@/features/ledger/actions/tax-settings";

const PERIOD_LABELS: Record<DeclarationPeriod, string> = { month: "Theo tháng", quarter: "Theo quý", year: "Theo năm" };

function RateEditFields({
  row,
  onCancel,
  onSaved,
}: {
  row: TaxCategoryRateRow;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [gtgt, setGtgt] = useState(row.gtgtRate !== null ? String(row.gtgtRate * 100) : "");
  const [tncn, setTncn] = useState(row.tncnRate !== null ? String(row.tncnRate * 100) : "");
  const [effectiveFrom, setEffectiveFrom] = useState(formatISODateVN(new Date()));
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSave() {
    const gtgtNum = Number(gtgt);
    const tncnNum = Number(tncn);
    if (Number.isNaN(gtgtNum) || Number.isNaN(tncnNum)) {
      toast.error("Tỷ lệ không hợp lệ");
      return;
    }

    setPending(true);
    const result = await setTaxCategoryRate(row.taxCategoryId, gtgtNum / 100, tncnNum / 100, effectiveFrom, note);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã cập nhật tỷ lệ thuế");
    onSaved();
  }

  return (
    <>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Tỷ lệ GTGT (%)</Label>
            <Input value={gtgt} onChange={(e) => setGtgt(e.target.value)} inputMode="decimal" />
          </div>
          <div className="space-y-1.5">
            <Label>Tỷ lệ TNCN (%)</Label>
            <Input value={tncn} onChange={(e) => setTncn(e.target.value)} inputMode="decimal" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Có hiệu lực từ ngày</Label>
          <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Nguồn / ghi chú (tùy chọn)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: theo thông báo của cơ quan thuế ngày..." />
        </div>
        <p className="text-xs text-muted-foreground">
          Không sửa tỷ lệ cũ — hệ thống thêm một bản ghi mới có hiệu lực từ ngày chọn. Các kỳ trước đó vẫn dùng tỷ lệ cũ.
        </p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Hủy
        </Button>
        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu"}
        </Button>
      </DialogFooter>
    </>
  );
}

function RateEditDialog({
  row,
  onOpenChange,
  onSaved,
}: {
  row: TaxCategoryRateRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={row !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đổi tỷ lệ thuế — {row?.taxCategoryName}</DialogTitle>
        </DialogHeader>
        {row ? (
          <RateEditFields key={row.taxCategoryId} row={row} onCancel={() => onOpenChange(false)} onSaved={onSaved} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function TaxSettingsPageClient() {
  const [config, setConfig] = useState<TaxConfig | null>(null);
  const [rates, setRates] = useState<TaxCategoryRateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRate, setEditingRate] = useState<TaxCategoryRateRow | null>(null);

  const [periodDraft, setPeriodDraft] = useState<DeclarationPeriod>("quarter");
  const [periodEffectiveFrom, setPeriodEffectiveFrom] = useState(formatISODateVN(new Date()));
  const [periodSaving, setPeriodSaving] = useState(false);

  const [thresholdDraft, setThresholdDraft] = useState("");
  const [warnPercentDraft, setWarnPercentDraft] = useState("80");
  const [thresholdEffectiveFrom, setThresholdEffectiveFrom] = useState(formatISODateVN(new Date()));
  const [thresholdSaving, setThresholdSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, r] = await Promise.all([getTaxConfig(), listTaxCategoryRates()]);
      setConfig(c);
      setRates(r);
      if (c.declarationPeriod) setPeriodDraft(c.declarationPeriod);
      if (c.revenueThresholdAmount !== null) setThresholdDraft(String(c.revenueThresholdAmount));
      if (c.revenueWarnPercent !== null) setWarnPercentDraft(String(Math.round(c.revenueWarnPercent * 100)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  async function handleSavePeriod() {
    setPeriodSaving(true);
    const result = await setDeclarationPeriod(periodDraft, periodEffectiveFrom);
    setPeriodSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã cập nhật kỳ kê khai");
    void load();
  }

  async function handleSaveThreshold() {
    const amount = parseMoney(thresholdDraft);
    const warnPercent = Number(warnPercentDraft) / 100;
    if (amount === null) {
      toast.error("Ngưỡng doanh thu không hợp lệ");
      return;
    }
    setThresholdSaving(true);
    const result = await setRevenueThreshold(amount, warnPercent, thresholdEffectiveFrom);
    setThresholdSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã cập nhật ngưỡng doanh thu");
    void load();
  }

  if (loading || !config) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Đang tải...</p>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Cấu hình thuế</h1>

      <section className="space-y-2 rounded-md border p-4">
        <h2 className="font-medium">Nhóm sổ áp dụng</h2>
        <p className="text-sm">
          Đang dùng: <span className="font-semibold uppercase">{config.bookGroup ?? "Chưa cấu hình"}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Hiện mới triển khai sổ S2a-HKD. Đổi nhóm sổ (S1a hoặc bộ S2b-S2e) cần làm thêm ở bước sau, nên mục này chỉ hiển thị, chưa cho sửa.
        </p>
      </section>

      <section className="space-y-3 rounded-md border p-4">
        <h2 className="font-medium">Kỳ kê khai</h2>
        <p className="text-sm">
          Đang dùng: <span className="font-semibold">{config.declarationPeriod ? PERIOD_LABELS[config.declarationPeriod] : "Chưa cấu hình"}</span>
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label>Đổi thành</Label>
            <Select value={periodDraft} onValueChange={(v) => setPeriodDraft((v ?? "quarter") as DeclarationPeriod)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Theo tháng</SelectItem>
                <SelectItem value="quarter">Theo quý</SelectItem>
                <SelectItem value="year">Theo năm</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Hiệu lực từ</Label>
            <Input type="date" value={periodEffectiveFrom} onChange={(e) => setPeriodEffectiveFrom(e.target.value)} />
          </div>
          <Button onClick={handleSavePeriod} disabled={periodSaving}>
            {periodSaving ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-md border p-4">
        <h2 className="font-medium">Ngưỡng doanh thu cảnh báo</h2>
        <p className="text-sm">
          Đang dùng:{" "}
          <span className="font-semibold">
            {config.revenueThresholdAmount !== null ? formatMoney(config.revenueThresholdAmount) : "Chưa cấu hình"} đ/năm
          </span>
          {config.revenueWarnPercent !== null ? ` — cảnh báo khi đạt ${Math.round(config.revenueWarnPercent * 100)}%` : null}
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label>Ngưỡng mới (đ/năm)</Label>
            <Input value={thresholdDraft} onChange={(e) => setThresholdDraft(e.target.value)} inputMode="numeric" className="w-48" />
          </div>
          <div className="space-y-1.5">
            <Label>Mức cảnh báo (%)</Label>
            <Input value={warnPercentDraft} onChange={(e) => setWarnPercentDraft(e.target.value)} inputMode="numeric" className="w-24" />
          </div>
          <div className="space-y-1.5">
            <Label>Hiệu lực từ</Label>
            <Input type="date" value={thresholdEffectiveFrom} onChange={(e) => setThresholdEffectiveFrom(e.target.value)} />
          </div>
          <Button onClick={handleSaveThreshold} disabled={thresholdSaving}>
            {thresholdSaving ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-md border p-4">
        <h2 className="font-medium">Tỷ lệ thuế theo nhóm ngành nghề</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>GTGT</TableHead>
              <TableHead>TNCN</TableHead>
              <TableHead>Hiệu lực từ</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.map((r) => (
              <TableRow key={r.taxCategoryId}>
                <TableCell>{r.taxCategoryCode}</TableCell>
                <TableCell>{r.taxCategoryName}</TableCell>
                <TableCell>{r.gtgtRate !== null ? `${(r.gtgtRate * 100).toFixed(1)}%` : "Chưa cấu hình"}</TableCell>
                <TableCell>{r.tncnRate !== null ? `${(r.tncnRate * 100).toFixed(1)}%` : "Chưa cấu hình"}</TableCell>
                <TableCell>{r.effectiveFrom ? formatDateVN(new Date(r.effectiveFrom)) : "—"}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => setEditingRate(r)}>
                    Đổi tỷ lệ
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có nhóm ngành nghề tính thuế nào. Tạo ở trang{" "}
            <Link href="/products/categories" className="underline">
              Quản lý danh mục
            </Link>
            .
          </p>
        ) : null}
      </section>

      <RateEditDialog row={editingRate} onOpenChange={(open) => !open && setEditingRate(null)} onSaved={() => { setEditingRate(null); void load(); }} />
    </div>
  );
}
