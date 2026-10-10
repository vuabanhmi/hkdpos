import { z } from "zod";
import { isValidMoney } from "@/lib/money";

/** Mã sản phẩm: chữ, số, chấm, gạch dưới, gạch ngang, không khoảng trắng. */
export const PRODUCT_CODE_PATTERN = /^[A-Za-z0-9._-]+$/;

export const productInputSchema = z.object({
  // Để trống thì hệ thống tự sinh mã (xem generate_product_code trong actions/products.ts),
  // nên cho phép chuỗi rỗng ở đây; khi có nhập thì vẫn phải đúng định dạng.
  code: z
    .string()
    .trim()
    .max(32, "Mã sản phẩm tối đa 32 ký tự")
    .refine(
      (value) => value === "" || PRODUCT_CODE_PATTERN.test(value),
      "Mã chỉ gồm chữ, số, '.', '_', '-', không có khoảng trắng",
    ),
  name: z.string().trim().min(1, "Thiếu tên sản phẩm").max(200, "Tên sản phẩm quá dài"),
  barcode: z
    .string()
    .trim()
    .max(64, "Mã vạch quá dài")
    .nullable()
    .optional()
    .transform((value) => (value ? value : null)),
  unitId: z.uuid("Thiếu đơn vị tính"),
  groupId: z.uuid().nullable().optional(),
  taxCategoryId: z.uuid().nullable().optional(),
  trackStock: z.boolean().default(true),
  costPrice: z
    .number()
    .int("Giá vốn phải là số nguyên")
    .min(0, "Giá vốn không được âm")
    .default(0),
  note: z
    .string()
    .trim()
    .max(2000, "Ghi chú quá dài")
    .nullable()
    .optional()
    .transform((value) => (value ? value : null)),
});

export type ProductInput = z.infer<typeof productInputSchema>;

/** Kiểm tra giá vốn hợp lệ (số nguyên đồng, không âm), dùng lại logic tiền chung. */
export function isValidCostPrice(value: number): boolean {
  return isValidMoney(value);
}
