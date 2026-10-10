"use server";

import ExcelJS from "exceljs";
import { createSupabaseServerClient } from "@/lib/db/server";
import { endOfDayVN, formatDateVN, startOfDayVN } from "@/lib/date";
import type { ActionResult } from "@/features/contacts/actions/contacts";
import { getBusinessProfile } from "./tax-settings";

export interface S2aLedgerLine {
  docNo: string | null;
  date: string;
  description: string;
  amount: number;
}

export interface S2aLedgerGroup {
  taxCategoryId: string;
  taxCategoryName: string;
  lines: S2aLedgerLine[];
  subtotal: number;
  gtgtRate: number;
  tncnRate: number;
  gtgtAmount: number;
  tncnAmount: number;
}

export interface S2aLedgerResult {
  periodStart: string;
  periodEnd: string;
  businessName: string | null;
  businessAddress: string | null;
  businessTaxCode: string | null;
  groups: S2aLedgerGroup[];
  totalGtgt: number;
  totalTncn: number;
}

/** Số tiền thuế tạm tính (gtgt_amount/tncn_amount) LUÔN lấy từ RPC revenue_by_tax_category (SQL) — không tính lại ở tầng UI/action. */
async function fetchS2aLedger(periodStart: string, periodEnd: string): Promise<S2aLedgerResult> {
  const supabase = await createSupabaseServerClient();

  const rangeStart = startOfDayVN(new Date(periodStart)).toISOString();
  const rangeEnd = endOfDayVN(new Date(periodEnd)).toISOString();

  const [{ data: summaryRows, error: summaryError }, { data: lineRows, error: lineError }, profile] = await Promise.all([
    supabase.rpc("revenue_by_tax_category", { p_period_start: periodStart, p_period_end: periodEnd }),
    supabase
      .from("revenue_ledger_lines")
      .select("doc_no, occurred_at, description, amount, tax_category_id")
      .gte("occurred_at", rangeStart)
      .lte("occurred_at", rangeEnd)
      .not("tax_category_id", "is", null)
      .order("occurred_at"),
    getBusinessProfile(),
  ]);

  if (summaryError) throw new Error(summaryError.message);
  if (lineError) throw new Error(lineError.message);

  const summaries = (summaryRows ?? []) as unknown as {
    tax_category_id: string;
    tax_category_name: string;
    revenue: number;
    gtgt_rate: number;
    tncn_rate: number;
    gtgt_amount: number;
    tncn_amount: number;
  }[];

  const lines = (lineRows ?? []) as unknown as {
    doc_no: string | null;
    occurred_at: string;
    description: string;
    amount: number;
    tax_category_id: string | null;
  }[];

  const groups: S2aLedgerGroup[] = summaries.map((s) => ({
    taxCategoryId: s.tax_category_id,
    taxCategoryName: s.tax_category_name,
    lines: lines
      .filter((l) => l.tax_category_id === s.tax_category_id)
      .map((l) => ({
        docNo: l.doc_no,
        date: formatDateVN(new Date(l.occurred_at)),
        description: l.description,
        amount: l.amount,
      })),
    subtotal: s.revenue,
    gtgtRate: s.gtgt_rate,
    tncnRate: s.tncn_rate,
    gtgtAmount: s.gtgt_amount,
    tncnAmount: s.tncn_amount,
  }));

  return {
    periodStart,
    periodEnd,
    businessName: profile.name,
    businessAddress: profile.address,
    businessTaxCode: profile.taxCode,
    groups,
    totalGtgt: groups.reduce((sum, g) => sum + g.gtgtAmount, 0),
    totalTncn: groups.reduce((sum, g) => sum + g.tncnAmount, 0),
  };
}

export async function getS2aLedger(periodStart: string, periodEnd: string): Promise<S2aLedgerResult> {
  return fetchS2aLedger(periodStart, periodEnd);
}

export async function exportS2aLedgerToExcel(
  periodStart: string,
  periodEnd: string,
): Promise<ActionResult<{ base64: string; filename: string }>> {
  const result = await fetchS2aLedger(periodStart, periodEnd);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("S2a-HKD");

  sheet.addRow(["SỔ DOANH THU BÁN HÀNG HÓA, DỊCH VỤ"]);
  sheet.addRow(["Mẫu số S2a-HKD (Kèm theo Thông tư số 152/2025/TT-BTC ngày 31/12/2025)"]);
  sheet.addRow([`Hộ, cá nhân kinh doanh: ${result.businessName ?? ""}`]);
  sheet.addRow([`Địa chỉ: ${result.businessAddress ?? ""}`]);
  sheet.addRow([`Mã số thuế: ${result.businessTaxCode ?? ""}`]);
  sheet.addRow([`Kỳ kê khai: ${formatDateVN(new Date(periodStart))} — ${formatDateVN(new Date(periodEnd))}`]);
  sheet.addRow([]);

  const headerRow = sheet.addRow(["Số hiệu", "Ngày, tháng", "Diễn giải", "Số tiền"]);
  headerRow.font = { bold: true };

  let groupIndex = 0;
  for (const group of result.groups) {
    groupIndex += 1;
    sheet.addRow(["", "", `${groupIndex}. Ngành nghề ${group.taxCategoryName}`, ""]).font = { bold: true };
    for (const line of group.lines) {
      sheet.addRow([line.docNo ?? "", line.date, line.description, line.amount]);
    }
    sheet.addRow(["", "", `Tổng cộng (${groupIndex})`, group.subtotal]).font = { bold: true };
    sheet.addRow(["", "", `Thuế GTGT (${(group.gtgtRate * 100).toFixed(0)}%)`, group.gtgtAmount]);
    sheet.addRow(["", "", `Thuế TNCN (${(group.tncnRate * 100).toFixed(0)}%)`, group.tncnAmount]);
  }

  sheet.addRow([]);
  const totalGtgtRow = sheet.addRow(["", "", "Tổng số thuế GTGT phải nộp", result.totalGtgt]);
  totalGtgtRow.font = { bold: true };
  const totalTncnRow = sheet.addRow(["", "", "Tổng số thuế TNCN phải nộp", result.totalTncn]);
  totalTncnRow.font = { bold: true };

  sheet.columns.forEach((col) => {
    col.width = 22;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    ok: true,
    data: {
      base64: Buffer.from(buffer).toString("base64"),
      filename: `so-doanh-thu-s2a-${periodStart}-den-${periodEnd}.xlsx`,
    },
  };
}
