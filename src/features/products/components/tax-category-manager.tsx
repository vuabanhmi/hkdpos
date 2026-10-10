"use client";

import { useState } from "react";
import { MoreHorizontalIcon } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createTaxCategory,
  setDefaultTaxCategory,
  setTaxCategoryActive,
  updateTaxCategory,
  type TaxCategoryManageRow,
} from "@/features/products/actions/reference-data";

interface TaxCategoryManagerProps {
  rows: TaxCategoryManageRow[];
  onChanged: () => void;
}

interface EditState {
  id: string | null;
  name: string;
  code: string;
  description: string;
}

export function TaxCategoryManager({ rows, onChanged }: TaxCategoryManagerProps) {
  const [editing, setEditing] = useState<EditState | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!editing) return;
    if (!editing.name.trim()) {
      setError("Thiếu tên");
      return;
    }
    if (editing.id && !editing.code.trim()) {
      setError("Thiếu mã");
      return;
    }

    setPending(true);
    setError(null);
    const result = editing.id
      ? await updateTaxCategory(editing.id, { name: editing.name, code: editing.code, description: editing.description || null })
      : await createTaxCategory(editing.name, editing.code);
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast.success(editing.id ? "Đã cập nhật nhóm ngành nghề tính thuế" : "Đã thêm nhóm ngành nghề tính thuế");
    setEditing(null);
    onChanged();
  }

  async function handleToggle(row: TaxCategoryManageRow) {
    const result = await setTaxCategoryActive(row.id, !row.isActive);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(row.isActive ? "Đã vô hiệu hóa" : "Đã kích hoạt lại");
    onChanged();
  }

  async function handleSetDefault(row: TaxCategoryManageRow) {
    const result = await setDefaultTaxCategory(row.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Đã đặt "${row.name}" làm mặc định`);
    onChanged();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ id: null, name: "", code: "", description: "" })}>
          Thêm nhóm ngành nghề
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Chưa có nhóm ngành nghề tính thuế nào.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.code}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {row.name}
                    {row.isDefault ? <Badge variant="secondary">Mặc định</Badge> : null}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{row.description ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={row.isActive ? "default" : "outline"}>
                    {row.isActive ? "Đang hoạt động" : "Đã vô hiệu hóa"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontalIcon />
                        </Button>
                      }
                    />
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() =>
                          setEditing({ id: row.id, name: row.name, code: row.code, description: row.description ?? "" })
                        }
                      >
                        Sửa
                      </DropdownMenuItem>
                      {!row.isDefault ? (
                        <DropdownMenuItem onClick={() => void handleSetDefault(row)}>Đặt làm mặc định</DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem onClick={() => void handleToggle(row)}>
                        {row.isActive ? "Vô hiệu hóa" : "Kích hoạt lại"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Sửa nhóm ngành nghề tính thuế" : "Thêm nhóm ngành nghề tính thuế"}</DialogTitle>
          </DialogHeader>

          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tc-code">Mã {editing.id ? "" : "(để trống sẽ tự tạo)"}</Label>
                  <Input id="tc-code" value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tc-name">Tên</Label>
                  <Input id="tc-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tc-description">Mô tả (tùy chọn)</Label>
                <Input
                  id="tc-description"
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={pending}>
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={pending}>
              {pending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
