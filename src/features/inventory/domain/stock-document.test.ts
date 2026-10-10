import { describe, expect, it } from "vitest";
import { stockDocumentInputSchema } from "./stock-document";

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const WAREHOUSE_ID = "22222222-2222-4222-8222-222222222222";
const CONTACT_ID = "33333333-3333-4333-8333-333333333333";

function base(overrides: Record<string, unknown> = {}) {
  return {
    docType: "purchase",
    warehouseId: WAREHOUSE_ID,
    contactId: CONTACT_ID,
    occurredAt: new Date().toISOString(),
    lines: [{ productId: PRODUCT_ID, quantity: 10, unitCost: 1000 }],
    ...overrides,
  };
}

describe("stockDocumentInputSchema", () => {
  it("phiếu nhập hợp lệ thì pass", () => {
    expect(stockDocumentInputSchema.safeParse(base()).success).toBe(true);
  });

  it("phiếu nhập thiếu nhà cung cấp thì báo lỗi", () => {
    const result = stockDocumentInputSchema.safeParse(base({ contactId: null }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join(".") === "contactId")).toBe(true);
    }
  });

  it("phiếu nhập thiếu giá nhập ở một dòng thì báo lỗi", () => {
    const result = stockDocumentInputSchema.safeParse(
      base({ lines: [{ productId: PRODUCT_ID, quantity: 10 }] }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join(".") === "lines.0.unitCost")).toBe(true);
    }
  });

  it("phiếu nhập số lượng âm hoặc 0 thì báo lỗi", () => {
    expect(
      stockDocumentInputSchema.safeParse(
        base({ lines: [{ productId: PRODUCT_ID, quantity: -1, unitCost: 1000 }] }),
      ).success,
    ).toBe(false);
    expect(
      stockDocumentInputSchema.safeParse(
        base({ lines: [{ productId: PRODUCT_ID, quantity: 0, unitCost: 1000 }] }),
      ).success,
    ).toBe(false);
  });

  it("phiếu xuất không cần nhà cung cấp, không cần giá, nhưng số lượng phải > 0", () => {
    const valid = stockDocumentInputSchema.safeParse(
      base({ docType: "issue", contactId: null, lines: [{ productId: PRODUCT_ID, quantity: 3 }] }),
    );
    expect(valid.success).toBe(true);

    const invalid = stockDocumentInputSchema.safeParse(
      base({ docType: "issue", contactId: null, lines: [{ productId: PRODUCT_ID, quantity: -3 }] }),
    );
    expect(invalid.success).toBe(false);
  });

  it("phiếu điều chỉnh cho phép số lượng âm (giảm) hoặc dương (tăng)", () => {
    const decrease = stockDocumentInputSchema.safeParse(
      base({ docType: "adjustment", contactId: null, lines: [{ productId: PRODUCT_ID, quantity: -2 }] }),
    );
    expect(decrease.success).toBe(true);

    const increase = stockDocumentInputSchema.safeParse(
      base({ docType: "adjustment", contactId: null, lines: [{ productId: PRODUCT_ID, quantity: 2 }] }),
    );
    expect(increase.success).toBe(true);
  });

  it("phiếu không có dòng hàng nào thì báo lỗi", () => {
    expect(stockDocumentInputSchema.safeParse(base({ lines: [] })).success).toBe(false);
  });
});
