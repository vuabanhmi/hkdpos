import { z } from "zod";

export const contactInputSchema = z
  .object({
    name: z.string().trim().min(1, "Thiếu tên").max(200, "Tên quá dài"),
    phone: z
      .string()
      .trim()
      .max(30, "Số điện thoại quá dài")
      .nullable()
      .optional()
      .transform((v) => (v ? v : null)),
    email: z
      .string()
      .trim()
      .max(200, "Email quá dài")
      .nullable()
      .optional()
      .transform((v) => (v ? v : null)),
    address: z
      .string()
      .trim()
      .max(500, "Địa chỉ quá dài")
      .nullable()
      .optional()
      .transform((v) => (v ? v : null)),
    taxCode: z
      .string()
      .trim()
      .max(30, "Mã số thuế quá dài")
      .nullable()
      .optional()
      .transform((v) => (v ? v : null)),
    bankName: z
      .string()
      .trim()
      .max(200, "Tên ngân hàng quá dài")
      .nullable()
      .optional()
      .transform((v) => (v ? v : null)),
    bankAccount: z
      .string()
      .trim()
      .max(50, "Số tài khoản quá dài")
      .nullable()
      .optional()
      .transform((v) => (v ? v : null)),
    isCustomer: z.boolean().default(false),
    isSupplier: z.boolean().default(false),
    note: z
      .string()
      .trim()
      .max(2000, "Ghi chú quá dài")
      .nullable()
      .optional()
      .transform((v) => (v ? v : null)),
  })
  .refine((data) => data.isCustomer || data.isSupplier, {
    message: "Phải chọn ít nhất Khách hàng hoặc Nhà cung cấp",
    path: ["isCustomer"],
  });

export type ContactInput = z.infer<typeof contactInputSchema>;
