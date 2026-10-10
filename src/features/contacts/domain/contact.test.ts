import { describe, expect, it } from "vitest";
import { contactInputSchema } from "./contact";

describe("contactInputSchema", () => {
  it("hợp lệ khi là khách hàng hoặc nhà cung cấp", () => {
    expect(contactInputSchema.safeParse({ name: "Chị Lan", isCustomer: true }).success).toBe(true);
    expect(contactInputSchema.safeParse({ name: "Vựa rau ABC", isSupplier: true }).success).toBe(true);
  });

  it("từ chối khi không chọn khách hàng hoặc nhà cung cấp", () => {
    const result = contactInputSchema.safeParse({ name: "Không rõ loại" });
    expect(result.success).toBe(false);
  });

  it("từ chối khi thiếu tên", () => {
    expect(contactInputSchema.safeParse({ name: "", isCustomer: true }).success).toBe(false);
  });

  it("chuyển chuỗi rỗng thành null", () => {
    const result = contactInputSchema.safeParse({ name: "A", isCustomer: true, phone: "", email: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeNull();
      expect(result.data.email).toBeNull();
    }
  });
});
