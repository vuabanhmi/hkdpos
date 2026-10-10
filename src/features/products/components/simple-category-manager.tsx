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
import type { ActionResult } from "@/features/contacts/actions/contacts";

export interface SimpleCategoryRow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

interface SimpleCategoryManagerProps {
  itemLabel: string;
  rows: SimpleCategoryRow[];
  onCreate: (name: string, description: string | null) => Promise<ActionResult<unknown>>;
  onUpdate: (id: string, name: string, description: string | null) => Promise<ActionResult<null>>;
  onToggleActive: (id: string, isActive: boolean) => Promise<ActionResult<null>>;
  onChanged: () => void;
}

interface EditState {
  id: string | null; // null = tạo mới
  name: string;
  description: string;
}

export function SimpleCategoryManager({
  itemLabel,
  rows,
  onCreate,
  onUpdate,
  onToggleActive,
  onChanged,
}: SimpleCategoryManagerProps) {
  const [editing, setEditing] = useState<EditState | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!editing) return;
    if (!editing.name.trim()) {
      setError(`Thiếu tên ${itemLabel.toLowerCase()}`);
      return;
    }

    setPending(true);
    setError(null);
    const result = editing.id
      ? await onUpdate(editing.id, editing.name, editing.description || null)
      : await onCreate(editing.name, editing.description || null);
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast.success(editing.id ? `Đã cập nhật ${itemLabel.toLowerCase()}` : `Đã thêm ${itemLabel.toLowerCase()}`);
    setEditing(null);
    onChanged();
  }

  async function handleToggle(row: SimpleCategoryRow) {
    const result = await onToggleActive(row.id, !row.isActive);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(row.isActive ? "Đã vô hiệu hóa" : "Đã kích hoạt lại");
    onChanged();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ id: null, name: "", description: "" })}>Thêm {itemLabel.toLowerCase()}</Button>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Chưa có {itemLabel.toLowerCase()} nào.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name}</TableCell>
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
                        onClick={() => setEditing({ id: row.id, name: row.name, description: row.description ?? "" })}
                      >
                        Sửa
                      </DropdownMenuItem>
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
            <DialogTitle>{editing?.id ? `Sửa ${itemLabel.toLowerCase()}` : `Thêm ${itemLabel.toLowerCase()}`}</DialogTitle>
          </DialogHeader>

          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="category-name">Tên</Label>
                <Input
                  id="category-name"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category-description">Mô tả (tùy chọn)</Label>
                <Input
                  id="category-description"
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
