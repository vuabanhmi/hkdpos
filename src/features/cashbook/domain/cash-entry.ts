import { z } from "zod";

export const cashEntryInputSchema = z.object({
  kind: z.enum(["income", "expense"]),
  categoryId: z.uuid("Thiếu danh mục"),
  amount: z.number().int("Số tiền phải là số nguyên").positive("Số tiền phải lớn hơn 0"),
  method: z.enum(["cash", "transfer"]),
  occurredAt: z.string().min(1, "Thiếu thời điểm"),
  description: z
    .string()
    .trim()
    .max(1000, "Mô tả quá dài")
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
  contactId: z.uuid().nullable().optional(),
  evidenceNote: z
    .string()
    .trim()
    .max(500, "Ghi chú chứng từ quá dài")
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
});

export type CashEntryInput = z.infer<typeof cashEntryInputSchema>;

export const CASH_KIND_LABELS: Record<"income" | "expense", string> = {
  income: "Phiếu thu",
  expense: "Phiếu chi",
};

export const CASH_METHOD_LABELS: Record<"cash" | "transfer", string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
};
