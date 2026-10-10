"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignGroupToCounter, type CounterRow, type GroupAssignmentRow } from "@/features/counters/actions/counters";

interface GroupAssignmentPanelProps {
  counters: CounterRow[];
  groups: GroupAssignmentRow[];
  onChanged: () => void;
}

export function GroupAssignmentPanel({ counters, groups, onChanged }: GroupAssignmentPanelProps) {
  const [selectedCounterId, setSelectedCounterId] = useState<string | null>(counters[0]?.id ?? null);
  const [checkedLeft, setCheckedLeft] = useState<Set<string>>(new Set());
  const [checkedRight, setCheckedRight] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);

  const counterNameById = useMemo(() => new Map(counters.map((c) => [c.id, c.name])), [counters]);

  const leftGroups = groups.filter((g) => g.counterId !== selectedCounterId);
  const rightGroups = groups.filter((g) => g.counterId === selectedCounterId);

  function toggle(set: Set<string>, setSet: (s: Set<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSet(next);
  }

  async function handleAssign() {
    if (!selectedCounterId || checkedLeft.size === 0) return;
    setPending(true);
    for (const groupId of checkedLeft) {
      const result = await assignGroupToCounter(groupId, selectedCounterId);
      if (!result.ok) toast.error(result.error);
    }
    setPending(false);
    setCheckedLeft(new Set());
    toast.success(`Đã gán ${checkedLeft.size} nhóm vào quầy`);
    onChanged();
  }

  async function handleUnassign() {
    if (checkedRight.size === 0) return;
    setPending(true);
    for (const groupId of checkedRight) {
      const result = await assignGroupToCounter(groupId, null);
      if (!result.ok) toast.error(result.error);
    }
    setPending(false);
    setCheckedRight(new Set());
    toast.success(`Đã bỏ gán ${checkedRight.size} nhóm`);
    onChanged();
  }

  if (counters.length === 0) {
    return <p className="text-sm text-muted-foreground">Thêm quầy trước khi gán nhóm sản phẩm.</p>;
  }

  return (
    <div className="space-y-3">
      <Select
        value={selectedCounterId}
        onValueChange={(v) => setSelectedCounterId(v)}
        items={counters.map((c) => ({ value: c.id, label: c.name }))}
      >
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Chọn quầy để gán nhóm" />
        </SelectTrigger>
        <SelectContent>
          {counters.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md border">
          <p className="border-b bg-muted/30 px-3 py-2 text-sm font-medium">Nhóm khác / chưa gán</p>
          <div className="max-h-72 space-y-1 overflow-y-auto p-2">
            {leftGroups.map((g) => (
              <label key={g.groupId} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-accent">
                <Checkbox
                  checked={checkedLeft.has(g.groupId)}
                  onCheckedChange={() => toggle(checkedLeft, setCheckedLeft, g.groupId)}
                />
                {g.groupName}
                <span className="text-xs text-muted-foreground">
                  {g.counterId ? `(${counterNameById.get(g.counterId) ?? "?"})` : "(chưa gán)"}
                </span>
              </label>
            ))}
            {leftGroups.length === 0 ? <p className="px-1.5 py-1 text-sm text-muted-foreground">Không có</p> : null}
          </div>
        </div>

        <div className="rounded-md border">
          <p className="border-b bg-muted/30 px-3 py-2 text-sm font-medium">
            Thuộc quầy này ({counterNameById.get(selectedCounterId ?? "") ?? "—"})
          </p>
          <div className="max-h-72 space-y-1 overflow-y-auto p-2">
            {rightGroups.map((g) => (
              <label key={g.groupId} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-accent">
                <Checkbox
                  checked={checkedRight.has(g.groupId)}
                  onCheckedChange={() => toggle(checkedRight, setCheckedRight, g.groupId)}
                />
                {g.groupName}
              </label>
            ))}
            {rightGroups.length === 0 ? <p className="px-1.5 py-1 text-sm text-muted-foreground">Không có</p> : null}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" disabled={pending || checkedLeft.size === 0} onClick={handleAssign}>
          Gán vào quầy này →
        </Button>
        <Button size="sm" variant="outline" disabled={pending || checkedRight.size === 0} onClick={handleUnassign}>
          ← Bỏ gán
        </Button>
      </div>
    </div>
  );
}
