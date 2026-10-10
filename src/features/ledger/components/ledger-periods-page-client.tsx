"use client";

import { useCallback, useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateVN, formatISODateVN, quarterRangeVN } from "@/lib/date";
import {
  listLedgerPeriods,
  lockPeriod,
  unlockPeriod,
  type LedgerPeriodRow,
} from "@/features/ledger/actions/periods";
import type { DeclarationPeriod } from "@/features/ledger/actions/tax-settings";

const PERIOD_LABELS: Record<DeclarationPeriod, string> = { month: "Tháng", quarter: "Quý", year: "Năm" };

function defaultQuarterRange() {
  const now = new Date();
  const quarter = (Math.floor(now.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
  const { start, end } = quarterRangeVN(now.getFullYear(), quarter);
  return { start: formatISODateVN(start), end: formatISODateVN(end) };
}

function LockDialog({ open, onOpenChange, onLocked }: { open: boolean; onOpenChange: (o: boolean) => void; onLocked: () => void }) {
  const defaults = defaultQuarterRange();
  const [periodType, setPeriodType] = useState<DeclarationPeriod>("quarter");
  const [periodStart, setPeriodStart] = useState(defaults.start);
  const [periodEnd, setPeriodEnd] = useState(defaults.end);
  const [note, setNote] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [pending, setPending] = useState(false);

  async function handleConfirmLock() {
    setPending(true);
    const result = await lockPeriod(periodType, periodStart, periodEnd, note);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã khóa kỳ kê khai");
    setStep(1);
    onLocked();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setStep(1);
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Khóa kỳ kê khai</DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Loại kỳ</Label>
                <Select value={periodType} onValueChange={(v) => setPeriodType((v ?? "quarter") as DeclarationPeriod)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Tháng</SelectItem>
                    <SelectItem value="quarter">Quý</SelectItem>
                    <SelectItem value="year">Năm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Từ ngày</Label>
                  <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Đến ngày</Label>
                  <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Ghi chú (tùy chọn)</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button onClick={() => setStep(2)}>Tiếp tục</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <p className="text-sm">
              Xác nhận khóa kỳ <strong>{PERIOD_LABELS[periodType]}</strong> từ{" "}
              <strong>{formatDateVN(new Date(periodStart))}</strong> đến <strong>{formatDateVN(new Date(periodEnd))}</strong>?
              Sau khi khóa, không thể tạo hoặc sửa đơn hàng, phiếu kho, thu chi, doanh thu nhập tay có ngày trong kỳ này.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)} disabled={pending}>
                Quay lại
              </Button>
              <Button onClick={handleConfirmLock} disabled={pending}>
                {pending ? "Đang khóa..." : "Xác nhận khóa"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function UnlockFields({
  period,
  onCancel,
  onUnlocked,
}: {
  period: LedgerPeriodRow;
  onCancel: () => void;
  onUnlocked: () => void;
}) {
  const [reason, setReason] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    const result = await unlockPeriod(period.id, reason);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã mở khóa kỳ kê khai");
    onUnlocked();
  }

  return step === 1 ? (
    <>
      <div className="space-y-1.5">
        <Label>Lý do mở khóa</Label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Hủy
        </Button>
        <Button onClick={() => setStep(2)} disabled={!reason.trim()}>
          Tiếp tục
        </Button>
      </DialogFooter>
    </>
  ) : (
    <>
      <p className="text-sm">
        Xác nhận mở khóa kỳ từ <strong>{formatDateVN(new Date(period.periodStart))}</strong> đến{" "}
        <strong>{formatDateVN(new Date(period.periodEnd))}</strong>? Dữ liệu trong kỳ này sẽ có thể tạo/sửa trở lại.
      </p>
      <DialogFooter>
        <Button variant="outline" onClick={() => setStep(1)} disabled={pending}>
          Quay lại
        </Button>
        <Button onClick={handleConfirm} disabled={pending}>
          {pending ? "Đang mở khóa..." : "Xác nhận mở khóa"}
        </Button>
      </DialogFooter>
    </>
  );
}

function UnlockDialog({
  period,
  onOpenChange,
  onUnlocked,
}: {
  period: LedgerPeriodRow | null;
  onOpenChange: (o: boolean) => void;
  onUnlocked: () => void;
}) {
  return (
    <Dialog open={period !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mở khóa kỳ kê khai</DialogTitle>
        </DialogHeader>

        {period ? (
          <UnlockFields key={period.id} period={period} onCancel={() => onOpenChange(false)} onUnlocked={onUnlocked} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function LedgerPeriodsPageClient() {
  const [periods, setPeriods] = useState<LedgerPeriodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lockOpen, setLockOpen] = useState(false);
  const [unlocking, setUnlocking] = useState<LedgerPeriodRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPeriods(await listLedgerPeriods());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Khóa kỳ kê khai</h1>
        <Button onClick={() => setLockOpen(true)}>Khóa kỳ mới</Button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Đang tải...</p>
      ) : periods.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Chưa có kỳ nào được khóa.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Loại kỳ</TableHead>
              <TableHead>Từ ngày</TableHead>
              <TableHead>Đến ngày</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ghi chú</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{PERIOD_LABELS[p.periodType]}</TableCell>
                <TableCell>{formatDateVN(new Date(p.periodStart))}</TableCell>
                <TableCell>{formatDateVN(new Date(p.periodEnd))}</TableCell>
                <TableCell>
                  <Badge variant={p.status === "locked" ? "default" : "outline"}>
                    {p.status === "locked" ? "Đã khóa" : "Đang mở"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.status === "locked" ? p.lockNote ?? "—" : p.unlockReason ? `Mở khóa: ${p.unlockReason}` : "—"}
                </TableCell>
                <TableCell>
                  {p.status === "locked" ? (
                    <Button variant="outline" size="sm" onClick={() => setUnlocking(p)}>
                      Mở khóa
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <LockDialog open={lockOpen} onOpenChange={setLockOpen} onLocked={() => { setLockOpen(false); void load(); }} />
      <UnlockDialog period={unlocking} onOpenChange={(o) => !o && setUnlocking(null)} onUnlocked={() => { setUnlocking(null); void load(); }} />
    </div>
  );
}
