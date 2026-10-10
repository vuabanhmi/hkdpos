"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { parseMoney } from "@/lib/money";
import { productInputSchema, type ProductInput } from "@/features/products/domain/product";
import { createProduct, updateProduct } from "@/features/products/actions/products";
import {
  createProductGroup,
  createTaxCategory,
  setDefaultTaxCategory,
  type ReferenceOption,
  type TaxCategoryOption,
} from "@/features/products/actions/reference-data";

export interface ProductFormInitialValues {
  id?: string;
  code: string;
  name: string;
  barcode: string;
  unitId: string;
  groupId: string | null;
  taxCategoryId: string | null;
  trackStock: boolean;
  costPrice: string;
  note: string;
}

const EMPTY_VALUES: ProductFormInitialValues = {
  code: "",
  name: "",
  barcode: "",
  unitId: "",
  groupId: null,
  taxCategoryId: null,
  trackStock: true,
  costPrice: "0",
  note: "",
};

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: ProductFormInitialValues;
  units: ReferenceOption[];
  groups: ReferenceOption[];
  taxCategories: TaxCategoryOption[];
  onGroupCreated: (group: ReferenceOption) => void;
  onTaxCategoryCreated: (taxCategory: TaxCategoryOption) => void;
  onTaxCategoryDefaultChanged: (id: string) => void;
  onSaved: () => void;
}

function QuickAdd({
  label,
  placeholder,
  extraField,
  onAdd,
}: {
  label: string;
  placeholder: string;
  extraField?: { placeholder: string };
  onAdd: (name: string, extra: string) => Promise<string | null>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [extra, setExtra] = useState("");
  const [pending, setPending] = useState(false);

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="text-left text-xs text-primary hover:underline"
      >
        + {label}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        className="h-7 w-36 text-xs"
      />
      {extraField ? (
        <Input
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder={extraField.placeholder}
          className="h-7 w-20 text-xs"
        />
      ) : null}
      <Button
        type="button"
        size="xs"
        disabled={pending || !name.trim()}
        onClick={async () => {
          setPending(true);
          const error = await onAdd(name, extra);
          setPending(false);
          if (error) {
            toast.error(error);
          } else {
            setShowForm(false);
            setName("");
            setExtra("");
          }
        }}
      >
        Thêm
      </Button>
      <Button type="button" size="xs" variant="ghost" onClick={() => setShowForm(false)}>
        Hủy
      </Button>
    </div>
  );
}

/**
 * Mount mới (key theo id sản phẩm, xem ProductFormDialog) mỗi lần dialog mở, để state form
 * luôn khởi tạo lại đúng giá trị ban đầu mà không cần effect đồng bộ theo prop.
 */
function ProductFormFields({
  initialValues,
  units,
  groups,
  taxCategories,
  onGroupCreated,
  onTaxCategoryCreated,
  onTaxCategoryDefaultChanged,
  onCancel,
  onSaved,
}: {
  initialValues?: ProductFormInitialValues;
  units: ReferenceOption[];
  groups: ReferenceOption[];
  taxCategories: TaxCategoryOption[];
  onGroupCreated: (group: ReferenceOption) => void;
  onTaxCategoryCreated: (taxCategory: TaxCategoryOption) => void;
  onTaxCategoryDefaultChanged: (id: string) => void;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(initialValues?.id);
  const [values, setValues] = useState<ProductFormInitialValues>(
    initialValues ?? {
      ...EMPTY_VALUES,
      taxCategoryId: taxCategories.find((tc) => tc.isDefault)?.id ?? null,
    },
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [settingDefaultTax, setSettingDefaultTax] = useState(false);

  async function handleSubmit() {
    const costPrice = parseMoney(values.costPrice);
    const parsed = productInputSchema.safeParse({
      code: values.code,
      name: values.name,
      barcode: values.barcode,
      unitId: values.unitId,
      groupId: values.groupId,
      taxCategoryId: values.taxCategoryId,
      trackStock: values.trackStock,
      costPrice: costPrice ?? -1,
      note: values.note,
    } satisfies Partial<ProductInput>);

    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => issue.message));
      return;
    }

    setPending(true);
    setErrors([]);
    const result = isEdit
      ? await updateProduct(initialValues!.id as string, parsed.data)
      : await createProduct(parsed.data);
    setPending(false);

    if (!result.ok) {
      setErrors([result.error]);
      return;
    }

    toast.success(isEdit ? "Đã lưu sản phẩm" : "Đã thêm sản phẩm");
    onSaved();
  }

  return (
    <>
      <div className="grid max-h-[65vh] gap-3 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="code">Mã sản phẩm</Label>
            <Input
              id="code"
              value={values.code}
              onChange={(e) => setValues({ ...values, code: e.target.value })}
              disabled={isEdit}
              placeholder={isEdit ? undefined : "Để trống để tự sinh mã (SP001...)"}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="barcode">Mã vạch</Label>
            <Input
              id="barcode"
              value={values.barcode}
              onChange={(e) => setValues({ ...values, barcode: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name">Tên sản phẩm</Label>
          <Input
            id="name"
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Đơn vị tính</Label>
            <Select
              value={values.unitId || null}
              onValueChange={(unitId) => setValues({ ...values, unitId: unitId ?? "" })}
              items={units.map((unit) => ({ value: unit.id, label: unit.name }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn đơn vị" />
              </SelectTrigger>
              <SelectContent>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Giá vốn</Label>
            <Input
              value={values.costPrice}
              onChange={(e) => setValues({ ...values, costPrice: e.target.value })}
              inputMode="numeric"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Nhóm sản phẩm</Label>
            <Select
              value={values.groupId}
              onValueChange={(groupId) => setValues({ ...values, groupId })}
              items={groups.map((group) => ({ value: group.id, label: group.name }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Không có nhóm" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <QuickAdd
              label="Thêm nhóm mới"
              placeholder="Tên nhóm"
              onAdd={async (name) => {
                const result = await createProductGroup(name);
                if (!result.ok) return result.error;
                onGroupCreated(result.data);
                setValues((v) => ({ ...v, groupId: result.data.id }));
                return null;
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Nhóm ngành nghề tính thuế</Label>
            <Select
              value={values.taxCategoryId}
              onValueChange={(taxCategoryId) => setValues({ ...values, taxCategoryId })}
              items={taxCategories.map((tc) => ({ value: tc.id, label: tc.name }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chưa gắn" />
              </SelectTrigger>
              <SelectContent>
                {taxCategories.map((tc) => (
                  <SelectItem key={tc.id} value={tc.id}>
                    {tc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-between gap-2">
              <QuickAdd
                label="Thêm nhóm thuế mới"
                placeholder="Tên nhóm thuế"
                extraField={{ placeholder: "Mã (để trống sẽ tự tạo)" }}
                onAdd={async (name, code) => {
                  const result = await createTaxCategory(name, code);
                  if (!result.ok) return result.error;
                  onTaxCategoryCreated(result.data);
                  setValues((v) => ({ ...v, taxCategoryId: result.data.id }));
                  return null;
                }}
              />
              {values.taxCategoryId && !taxCategories.find((tc) => tc.id === values.taxCategoryId)?.isDefault ? (
                <button
                  type="button"
                  disabled={settingDefaultTax}
                  className="text-xs text-primary hover:underline disabled:opacity-50"
                  onClick={async () => {
                    setSettingDefaultTax(true);
                    const result = await setDefaultTaxCategory(values.taxCategoryId as string);
                    setSettingDefaultTax(false);
                    if (!result.ok) {
                      toast.error(result.error);
                      return;
                    }
                    onTaxCategoryDefaultChanged(values.taxCategoryId as string);
                  }}
                >
                  Đặt làm mặc định
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={values.trackStock}
            onCheckedChange={(checked) => setValues({ ...values, trackStock: checked === true })}
          />
          Theo dõi tồn kho cho sản phẩm này
        </label>

        <div className="space-y-1.5">
          <Label htmlFor="note">Ghi chú</Label>
          <Textarea
            id="note"
            value={values.note}
            onChange={(e) => setValues({ ...values, note: e.target.value })}
            rows={2}
          />
        </div>

        {errors.length > 0 ? (
          <ul className="list-inside list-disc text-sm text-destructive">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function ProductFormDialog({
  open,
  onOpenChange,
  initialValues,
  units,
  groups,
  taxCategories,
  onGroupCreated,
  onTaxCategoryCreated,
  onTaxCategoryDefaultChanged,
  onSaved,
}: ProductFormDialogProps) {
  const isEdit = Boolean(initialValues?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa sản phẩm" : "Thêm sản phẩm"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Cập nhật thông tin sản phẩm. Giá bán quản lý riêng ở Bảng giá."
              : "Nhập thông tin sản phẩm mới. Giá bán thêm sau ở Bảng giá."}
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <ProductFormFields
            key={initialValues?.id ?? "new"}
            initialValues={initialValues}
            units={units}
            groups={groups}
            taxCategories={taxCategories}
            onGroupCreated={onGroupCreated}
            onTaxCategoryCreated={onTaxCategoryCreated}
            onTaxCategoryDefaultChanged={onTaxCategoryDefaultChanged}
            onCancel={() => onOpenChange(false)}
            onSaved={() => {
              onOpenChange(false);
              onSaved();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
