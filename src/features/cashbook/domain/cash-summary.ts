/**
 * Tính tổng thu, tổng chi, số dư kỳ từ danh sách dòng sổ quỹ (cash_ledger).
 * Phiếu đảo đã có amount âm sẵn (xem migration cashbook), nên chỉ cần cộng dồn
 * theo kind — không cần logic triệt tiêu riêng ở tầng ứng dụng.
 */
export interface CashLedgerLine {
  kind: "income" | "expense";
  amount: number;
}

export interface CashSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export function summarizeCashLedger(lines: CashLedgerLine[]): CashSummary {
  let totalIncome = 0;
  let totalExpense = 0;

  for (const line of lines) {
    if (line.kind === "income") totalIncome += line.amount;
    else totalExpense += line.amount;
  }

  return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
}
