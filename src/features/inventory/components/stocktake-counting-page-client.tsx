"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadBase64Xlsx } from "@/lib/download";
import { formatDateVN } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { filterStocktakeLines, summarizeStocktake, type StocktakeLineFilter } from "@/features/inventory/domain/stocktake";
import {
  STOCKTAKE_STATUS_LABELS,
  approveStocktake,
  exportStocktakeToExcel,
  getStocktakeDetail,
  setStocktakeLineCount,
  type StocktakeDetail,
  type StocktakeLineDetail,
} from "@/features/inventory/actions/stocktakes";

const FILTER_LABELS: Record<StocktakeLineFilter, string> = {
  all: "Tất cả",
  uncounted: "Chưa đếm",
  diff: "Có chênh lệch",
};

function formatSignedMoney(amount: number): string {
  return amount < 0 ? `-${formatMoney(-amount)}` : formatMoney(amount);
}

function formatSignedQty(qty: number): string {
  return qty > 0 ? `+${qty}` : `${qty}`;
}

function CountInput({ line, locked, onSaved }: { line: StocktakeLineDetail; locked: boolean; onSaved: (value: number | null) => void }) {
  const [value, setValue] = useState(line.countedQty !== null ? String(line.countedQty) : "");
  const [pending, setPending] = useState(false);

  async function commit() {
    const trimmed = value.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed !== null && Number.isNaN(parsed)) {
      toast.error("Số lượng đếm không hợp lệ");
      return;
    }
    if (parsed === line.countedQty) return;

    setPending(true);
    const result = await setStocktakeLineCount(line.id, parsed, line.reason);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onSaved(parsed);
  }

  return (
    <Input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      disabled={locked || pending}
      inputMode="decimal"
      className="w-28"
      placeholder="Chưa đếm"
    />
  );
}

export function StocktakeCountingPageClient({ stocktakeId }: { stocktakeId: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<StocktakeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StocktakeLineFilter>("all");
  const [approving, setApproving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDetail(await getStocktakeDetail(stocktakeId));
    } finally {
      setLoading(false);
    }
  }, [stocktakeId]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const summary = useMemo(() => (detail ? summarizeStocktake(detail.lines) : null), [detail]);

  const visibleLines = useMemo(() => {
    if (!detail) return [];
    const byFilter = filterStocktakeLines(detail.lines, filter);
    const term = search.trim().toLowerCase();
    if (!term) return byFilter;
    return byFilter.filter(
      (l) => l.productCode.toLowerCase() === term || l.productCode.toLowerCase().includes(term) || l.productName.toLowerCase().includes(term),
    );
  }, [detail, filter, search]);

  function updateLineLocally(lineId: string, countedQty: number | null) {
    setDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        lines: prev.lines.map((l) => {
          if (l.id !== lineId) return l;
          const diffQty = (countedQty ?? l.systemQty) - l.systemQty;
          return { ...l, countedQty, diffQty, diffValue: Math.round(diffQty * l.unitCost) };
        }),
      };
    });
  }

  async function handleApprove() {
    if (!detail) return;
    if (!window.confirm(`Duyệt phiên kiểm kho ${detail.stocktakeNo}? Hệ thống sẽ sinh phiếu điều chỉnh kho cho các dòng có chênh lệch.`)) {
      return;
    }
    setApproving(true);
    const result = await approveStocktake(detail.id);
    setApproving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã duyệt phiên kiểm kho");
    void load();
  }

  async function handleExport() {
    const result = await exportStocktakeToExcel(stocktakeId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    downloadBase64Xlsx(result.data.base64, result.data.filename);
  }

  if (loading || !detail) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Đang tải...</p>;
  }

  const locked = detail.status !== "counting";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{detail.stocktakeNo}</h1>
            <Badge variant={detail.status === "approved" ? "default" : "secondary"}>
              {STOCKTAKE_STATUS_LABELS[detail.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Kho {detail.warehouseName} — Ngày {formatDateVN(new Date(detail.stocktakeDate))}
            {detail.note ? ` — ${detail.note}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/inventory/stocktakes")}>
            Quay lại danh sách
          </Button>
          <Button variant="outline" onClick={handleExport}>
            Xuất Excel
          </Button>
          {!locked ? (
            <Button onClick={handleApprove} disabled={approving}>
              {approving ? "Đang duyệt..." : "Duyệt"}
            </Button>
          ) : null}
        </div>
      </div>

      {summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Đã đếm</p>
            <p className="text-lg font-semibold">
              {summary.countedLines}/{summary.totalLines}
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Chưa đếm</p>
            <p className="text-lg font-semibold">{summary.uncountedLines}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Có chênh lệch</p>
            <p className="text-lg font-semibold">{summary.linesWithDiff}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Tổng chênh lệch (giá trị)</p>
            <p className="text-lg font-semibold">{formatSignedMoney(summary.totalDiffValue)}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Tìm hoặc quét mã vạch / mã sản phẩm..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        {(Object.keys(FILTER_LABELS) as StocktakeLineFilter[]).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {FILTER_LABELS[f]}
          </Button>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã SP</TableHead>
            <TableHead>Tên sản phẩm</TableHead>
            <TableHead>Đơn vị</TableHead>
            <TableHead className="text-right">Tồn sổ sách</TableHead>
            <TableHead>Đếm thực tế</TableHead>
            <TableHead className="text-right">Chênh lệch</TableHead>
            <TableHead className="text-right">Chênh lệch (giá trị)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleLines.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                Không có dòng nào khớp.
              </TableCell>
            </TableRow>
          ) : (
            visibleLines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>{line.productCode}</TableCell>
                <TableCell>{line.productName}</TableCell>
                <TableCell>{line.unitName}</TableCell>
                <TableCell className="text-right">{line.systemQty}</TableCell>
                <TableCell>
                  <CountInput line={line} locked={locked} onSaved={(value) => updateLineLocally(line.id, value)} />
                </TableCell>
                <TableCell className={`text-right ${line.diffQty !== 0 ? "font-medium text-amber-600" : ""}`}>
                  {line.countedQty === null ? "—" : formatSignedQty(line.diffQty)}
                </TableCell>
                <TableCell className="text-right">{line.countedQty === null ? "—" : formatSignedMoney(line.diffValue)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
