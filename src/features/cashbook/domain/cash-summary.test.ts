import { describe, expect, it } from "vitest";
import { summarizeCashLedger } from "./cash-summary";

describe("summarizeCashLedger", () => {
  it("tính đúng tổng thu, tổng chi, số dư", () => {
    const result = summarizeCashLedger([
      { kind: "income", amount: 500000 },
      { kind: "expense", amount: 200000 },
      { kind: "income", amount: 30000 },
    ]);
    expect(result).toEqual({ totalIncome: 530000, totalExpense: 200000, balance: 330000 });
  });

  it("phiếu đảo (amount âm) tự triệt tiêu đúng phiếu gốc cùng kind", () => {
    const result = summarizeCashLedger([
      { kind: "expense", amount: 200000 },
      { kind: "expense", amount: -200000 },
    ]);
    expect(result.totalExpense).toBe(0);
    expect(result.balance).toBe(0);
  });

  it("danh sách rỗng thì mọi thứ bằng 0", () => {
    expect(summarizeCashLedger([])).toEqual({ totalIncome: 0, totalExpense: 0, balance: 0 });
  });
});
