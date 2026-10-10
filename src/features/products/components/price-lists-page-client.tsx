"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateVN } from "@/lib/date";
import {
  listPriceLists,
  setDefaultPriceList,
  type PriceListRow,
} from "@/features/products/actions/price-lists";
import { PriceListFormDialog } from "./price-list-form-dialog";
import { PriceListItemsEditor } from "./price-list-items-editor";

export function PriceListsPageClient() {
  const [priceLists, setPriceLists] = useState<PriceListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PriceListRow | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listPriceLists();
    setPriceLists(data);
    setLoading(false);
    setSelectedId((current) => current ?? data.find((pl) => pl.isDefault)?.id ?? data[0]?.id ?? null);
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  async function handleSetDefault(id: string) {
    const result = await setDefaultPriceList(id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã đặt làm bảng giá mặc định");
    void load();
  }

  const selected = priceLists.find((pl) => pl.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bảng giá</h1>
        <Button
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          Thêm bảng giá
        </Button>
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Đang tải...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên bảng giá</TableHead>
              <TableHead>Hiệu lực</TableHead>
              <TableHead>Mặc định</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-48" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {priceLists.map((pl) => (
              <TableRow
                key={pl.id}
                className={pl.id === selectedId ? "bg-muted/50" : undefined}
              >
                <TableCell>
                  <button className="font-medium hover:underline" onClick={() => setSelectedId(pl.id)}>
                    {pl.name}
                  </button>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {pl.validFrom ? formatDateVN(new Date(pl.validFrom)) : "—"} —{" "}
                  {pl.validTo ? formatDateVN(new Date(pl.validTo)) : "—"}
                </TableCell>
                <TableCell>{pl.isDefault ? <Badge>Mặc định</Badge> : null}</TableCell>
                <TableCell>
                  <Badge variant={pl.isActive ? "default" : "outline"}>
                    {pl.isActive ? "Hoạt động" : "Vô hiệu hóa"}
                  </Badge>
                </TableCell>
                <TableCell className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(pl);
                      setFormOpen(true);
                    }}
                  >
                    Sửa
                  </Button>
                  {!pl.isDefault ? (
                    <Button size="sm" variant="outline" onClick={() => handleSetDefault(pl.id)}>
                      Đặt mặc định
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {selected ? (
        <PriceListItemsEditor priceListId={selected.id} priceListName={selected.name} />
      ) : null}

      <PriceListFormDialog open={formOpen} onOpenChange={setFormOpen} initial={editing} onSaved={load} />
    </div>
  );
}
