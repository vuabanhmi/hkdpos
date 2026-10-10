"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTimeVN } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import { getProduct, type ProductDetail } from "@/features/products/actions/products";
import { listCounters, setProductCounter, type CounterRow } from "@/features/counters/actions/counters";
import {
  getPriceHistory,
  listPriceLists,
  type PriceHistoryRow,
  type PriceListRow,
} from "@/features/products/actions/price-lists";
import {
  listProductGroups,
  listTaxCategories,
  listUnits,
  type ReferenceOption,
  type TaxCategoryOption,
} from "@/features/products/actions/reference-data";
import { ProductFormDialog, type ProductFormInitialValues } from "./product-form-dialog";
import { PriceHistoryChart } from "./price-history-chart";
import { StockCardTab } from "@/features/inventory/components/stock-card-tab";

interface ProductDetailClientProps {
  product: ProductDetail;
}

function toFormInitialValues(product: ProductDetail): ProductFormInitialValues {
  return {
    id: product.id,
    code: product.code,
    name: product.name,
    barcode: product.barcode ?? "",
    unitId: product.unitId,
    groupId: product.groupId,
    taxCategoryId: product.taxCategoryId,
    trackStock: product.trackStock,
    costPrice: String(product.costPrice),
    note: product.note ?? "",
  };
}

export function ProductDetailClient({ product: initialProduct }: ProductDetailClientProps) {
  const [product, setProduct] = useState(initialProduct);
  const [units, setUnits] = useState<ReferenceOption[]>([]);
  const [groups, setGroups] = useState<ReferenceOption[]>([]);
  const [taxCategories, setTaxCategories] = useState<TaxCategoryOption[]>([]);
  const [priceLists, setPriceLists] = useState<PriceListRow[]>([]);
  const [counters, setCounters] = useState<CounterRow[]>([]);
  const [selectedPriceListId, setSelectedPriceListId] = useState<string | "all">("all");
  const [history, setHistory] = useState<PriceHistoryRow[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [savingCounter, setSavingCounter] = useState(false);

  useEffect(() => {
    void Promise.all([
      listUnits(),
      listProductGroups(),
      listTaxCategories(),
      listPriceLists(),
      listCounters(),
    ]).then(([u, g, t, pl, ctr]) => {
      setUnits(u);
      setGroups(g);
      setTaxCategories(t);
      setPriceLists(pl);
      setCounters(ctr.filter((c) => c.isActive));
    });
  }, []);

  async function handleCounterOverrideChange(counterId: string | null) {
    setSavingCounter(true);
    const result = await setProductCounter(product.id, counterId);
    setSavingCounter(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const updated = await getProduct(product.id);
    if (updated) setProduct(updated);
  }

  const loadHistory = useCallback(async () => {
    const data = await getPriceHistory(
      product.id,
      selectedPriceListId === "all" ? undefined : selectedPriceListId,
    );
    setHistory(data);
  }, [product.id, selectedPriceListId]);

  useEffect(() => {
    void (async () => {
      await loadHistory();
    })();
  }, [loadHistory]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <p className="text-sm text-muted-foreground">Mã: {product.code}</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>Sửa</Button>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Thông tin</TabsTrigger>
          <TabsTrigger value="history">Lịch sử giá</TabsTrigger>
          <TabsTrigger value="stock-card">Thẻ kho</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-3 pt-2">
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Đơn vị tính</dt>
              <dd>{product.unitName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Nhóm sản phẩm</dt>
              <dd>{product.groupName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Nhóm ngành nghề tính thuế</dt>
              <dd>{product.taxCategoryName ?? "Chưa gắn"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Mã vạch</dt>
              <dd>{product.barcode ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Giá vốn</dt>
              <dd>{formatMoney(product.costPrice)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Giá bán (Bảng giá chung)</dt>
              <dd>{product.defaultPrice !== null ? formatMoney(product.defaultPrice) : "Chưa đặt"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Theo dõi tồn kho</dt>
              <dd>{product.trackStock ? "Có" : "Không"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Trạng thái</dt>
              <dd>
                <Badge variant={product.isActive ? "default" : "outline"}>
                  {product.isActive ? "Đang hoạt động" : "Đã vô hiệu hóa"}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                Quầy bán hàng {product.counterId === null ? "(theo nhóm)" : "(gán riêng)"}
              </dt>
              <dd className="flex items-center gap-2">
                <Select
                  value={product.counterId}
                  onValueChange={(v) => void handleCounterOverrideChange(v)}
                  disabled={savingCounter}
                  items={counters.map((c) => ({ value: c.id, label: c.name }))}
                >
                  <SelectTrigger className="h-7 w-full">
                    <SelectValue placeholder={product.resolvedCounterName ?? "Chưa gán quầy"} />
                  </SelectTrigger>
                  <SelectContent>
                    {counters.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {product.counterId !== null ? (
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => void handleCounterOverrideChange(null)}
                  >
                    Dùng theo nhóm
                  </button>
                ) : null}
              </dd>
            </div>
          </dl>
          {product.note ? (
            <div>
              <p className="text-sm text-muted-foreground">Ghi chú</p>
              <p className="text-sm">{product.note}</p>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="history" className="space-y-3 pt-2">
          <Select
            value={selectedPriceListId}
            onValueChange={(value) => setSelectedPriceListId(value ?? "all")}
            items={[{ value: "all", label: "Tất cả bảng giá" }, ...priceLists.map((pl) => ({ value: pl.id, label: pl.name }))]}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tất cả bảng giá" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả bảng giá</SelectItem>
              {priceLists.map((pl) => (
                <SelectItem key={pl.id} value={pl.id}>
                  {pl.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <PriceHistoryChart history={history} />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời điểm</TableHead>
                <TableHead>Bảng giá</TableHead>
                <TableHead>Giá cũ</TableHead>
                <TableHead>Giá mới</TableHead>
                <TableHead>Lý do</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history
                .slice()
                .reverse()
                .map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{formatDateTimeVN(new Date(h.changedAt))}</TableCell>
                    <TableCell>{h.priceListName}</TableCell>
                    <TableCell>{h.oldPrice !== null ? formatMoney(h.oldPrice) : "—"}</TableCell>
                    <TableCell>{formatMoney(h.newPrice)}</TableCell>
                    <TableCell>{h.reason ?? "—"}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="stock-card" className="pt-2">
          <StockCardTab productId={product.id} />
        </TabsContent>
      </Tabs>

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialValues={toFormInitialValues(product)}
        units={units}
        groups={groups}
        taxCategories={taxCategories}
        onGroupCreated={(group) => setGroups((prev) => [...prev, group])}
        onTaxCategoryCreated={(tc) => setTaxCategories((prev) => [...prev, tc])}
        onTaxCategoryDefaultChanged={(id) =>
          setTaxCategories((prev) => prev.map((tc) => ({ ...tc, isDefault: tc.id === id })))
        }
        onSaved={async () => {
          const updated = await getProduct(product.id);
          if (updated) setProduct(updated);
        }}
      />
    </div>
  );
}
