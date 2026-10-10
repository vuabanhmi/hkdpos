import { z } from "zod";

export const STOCK_DOC_TYPES = ["purchase", "issue", "adjustment"] as const;
export type StockDocType = (typeof STOCK_DOC_TYPES)[number];

export const stockDocumentLineInputSchema = z.object({
  productId: z.uuid("Thiếu sản phẩm"),
  quantity: z.number().refine((v) => v !== 0, "Số lượng không được bằng 0"),
  unitCost: z
    .number()
    .int("Giá nhập phải là số nguyên")
    .min(0, "Giá nhập không được âm")
    .nullable()
    .optional(),
  note: z
    .string()
    .trim()
    .max(500, "Ghi chú quá dài")
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
});

export type StockDocumentLineInput = z.infer<typeof stockDocumentLineInputSchema>;

/**
 * Quy tắc theo loại phiếu — PHẢI khớp với phần validate trong hàm SQL
 * `post_stock_document`:
 * - purchase: phải chọn nhà cung cấp; mọi dòng số lượng > 0 và có giá nhập hợp lệ.
 * - issue: mọi dòng số lượng > 0 (không cần giá, định giá theo giá vốn hiện tại).
 * - adjustment: số lượng có thể dương (tăng) hoặc âm (giảm), không cần giá.
 */
export const stockDocumentInputSchema = z
  .object({
    docType: z.enum(STOCK_DOC_TYPES),
    warehouseId: z.uuid("Thiếu kho"),
    contactId: z.uuid().nullable().optional(),
    occurredAt: z.string().min(1, "Thiếu thời điểm"),
    note: z
      .string()
      .trim()
      .max(1000, "Ghi chú quá dài")
      .nullable()
      .optional()
      .transform((v) => (v ? v : null)),
    lines: z.array(stockDocumentLineInputSchema).min(1, "Phiếu phải có ít nhất một dòng hàng"),
  })
  .superRefine((data, ctx) => {
    if (data.docType === "purchase" && !data.contactId) {
      ctx.addIssue({ code: "custom", path: ["contactId"], message: "Phiếu nhập phải chọn nhà cung cấp" });
    }

    data.lines.forEach((line, index) => {
      if (data.docType !== "adjustment" && line.quantity <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["lines", index, "quantity"],
          message: "Số lượng phải lớn hơn 0",
        });
      }
      if (data.docType === "purchase" && (line.unitCost === null || line.unitCost === undefined)) {
        ctx.addIssue({
          code: "custom",
          path: ["lines", index, "unitCost"],
          message: "Phải nhập giá nhập cho dòng hàng này",
        });
      }
    });
  });

export type StockDocumentInput = z.infer<typeof stockDocumentInputSchema>;

export const STOCK_DOC_TYPE_LABELS: Record<StockDocType, string> = {
  purchase: "Phiếu nhập",
  issue: "Phiếu xuất",
  adjustment: "Phiếu điều chỉnh",
};

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  purchase_in: "Nhập hàng",
  sale_out: "Bán hàng",
  return_in: "Khách trả hàng",
  return_out: "Trả hàng nhà cung cấp",
  adjust_in: "Điều chỉnh tăng",
  adjust_out: "Điều chỉnh giảm",
  stocktake_adjust: "Điều chỉnh kiểm kê",
  transfer_in: "Chuyển kho (nhận)",
  transfer_out: "Chuyển kho (gửi)",
};
