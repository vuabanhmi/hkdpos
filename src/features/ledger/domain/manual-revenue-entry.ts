import { z } from "zod";

export const PAYMENT_METHODS = ["cash", "transfer", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
  other: "Khác",
};

export const manualRevenueEntryInputSchema = z.object({
  entryDate: z.string().min(1, "Thiếu ngày"),
  description: z.string().trim().min(1, "Thiếu diễn giải"),
  amount: z.number().int("Số tiền phải là số nguyên").positive("Số tiền phải lớn hơn 0"),
  paymentMethod: z.enum(PAYMENT_METHODS),
  taxCategoryId: z.uuid("Thiếu nhóm ngành nghề tính thuế"),
  evidenceNote: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
});

export type ManualRevenueEntryInput = z.infer<typeof manualRevenueEntryInputSchema>;
