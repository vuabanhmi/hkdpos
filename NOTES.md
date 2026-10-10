# Ghi chú tiến độ

Cập nhật lần cuối: 2026-10-10

## Đang ở đâu

- Roadmap: vừa làm xong **Bước 1.6** (Sổ doanh thu S2a-HKD và hỗ trợ kê khai thuế).
  Trước đó đã xong Bước 1.1 → 1.5. Chưa làm Bước 1.6b (bộ S2b-S2e) và Bước 1.7.
- Các việc ngoài-bước đã xử lý trước đó (xem lịch sử chat nếu cần chi tiết): fix
  crash prerender `(app)/layout.tsx`, fix 9 chỗ Select hiện UUID thô, thêm trang
  quản lý danh mục `/products/categories` (nhóm sản phẩm/đơn vị tính/nhóm ngành
  nghề tính thuế), fix lỗi flaky dùng `current_date` thay vì giờ VN trong
  `counters.test.sql`.

## Bước 1.6 — chi tiết đã làm

Xác nhận với người dùng trước khi code (không tự đoán số liệu thuế):
- Nhóm sổ: S2a-HKD (docs/tax-rules.md). Không làm S1a-HKD.
- Ngành nghề: dịch vụ ăn uống, GTGT 5%, TNCN 2% (docs/tax-rules.md).
- Kỳ kê khai: theo quý (người dùng xác nhận trực tiếp).
- Ngưỡng doanh thu cảnh báo: **1.000.000.000 đ/năm** (người dùng xác nhận trực
  tiếp — KHÔNG phải 500 triệu như tài liệu hướng dẫn chung ghi, vì người dùng đã
  chỉnh lại con số).

Database (`supabase/migrations/20261010120000_revenue_ledger_and_tax.sql`):
- `business_profile`, `tax_rules` (EAV, hiệu lực theo ngày, chỉ INSERT),
  `manual_revenue_entries` (append-only, đảo dấu như cash_entries),
  `ledger_periods` (khóa/mở khóa — audit_log chưa tồn tại nên lý do mở khóa lưu
  trực tiếp trên bảng này).
- `revenue_ledger_lines` (view gộp đơn hoàn thành + trả hàng + doanh thu nhập
  tay), `revenue_by_tax_category()`, `get_tax_rule_value()`.
- Đã thêm `assert_period_not_locked()` và gọi ở ĐẦU 9 RPC ghi dữ liệu đã có từ
  trước: `complete_order, cancel_order, create_return, post_stock_document,
  void_stock_document, create_cash_entry, create_cash_entry_reversal,
  approve_stocktake` + 2 RPC mới (`create_manual_revenue_entry*`) — khóa kỳ sẽ
  chặn tạo/sửa dữ liệu có ngày trong kỳ đó trên toàn bộ các module liên quan.
- Seed sẵn tax_category "Dịch vụ ăn uống" (code DVAU, đặt mặc định) + tỷ lệ
  GTGT 5%/TNCN 2%, hiệu lực từ 2026-01-01.
- pgTAP mới `supabase/tests/revenue_ledger.test.sql`: 14/14 pass. Tổng dự án
  92/92 (8 file test).

TypeScript: `src/features/ledger/domain/{tax-calc,manual-revenue-entry}.ts` +
test; `src/features/ledger/actions/{revenue,tax-settings,periods,s2a,
declaration-helper}.ts`; UI `src/features/ledger/components/*` + routes:
- `/ledger` (hub), `/ledger/s2a` (sổ S2a + ghi doanh thu khác + xuất Excel + in),
  `/ledger/periods` (khóa/mở khóa, xác nhận 2 bước)
- `/settings/business`, `/settings/tax` (kỳ kê khai, ngưỡng doanh thu, tỷ lệ
  theo ngành nghề — mỗi lần đổi thêm bản ghi mới có hiệu lực theo ngày, không
  sửa bản ghi cũ)
- `/tax/declaration-helper` (bảng tính + cảnh báo ngưỡng doanh thu lũy kế)

Giản lược đã ghi trong migration + cần biết khi quay lại:
- Cảnh báo ngưỡng doanh thu đặt ở `/tax/declaration-helper` (và hiển thị số
  hiện tại ở `/settings/tax`), KHÔNG đặt ở `/dashboard` vì trang đó vẫn
  "Chưa triển khai" (thuộc Bước 1.7) — tránh lấn phạm vi.
- "Xuất PDF đúng mẫu": làm bản in A4 bằng CSS print (nút "In" ở `/ledger/s2a`,
  `window.print()`) thay vì generate PDF điền đúng pixel file .docx mẫu. Xuất
  Excel bám đúng cột mẫu S2a-HKD.
- Nhóm sổ (`book_group`) hiển thị read-only ở `/settings/tax` — chưa cho đổi
  vì S1a và bộ S2b-S2e chưa được triển khai (đổi nhóm sổ mà chưa có sổ tương
  ứng sẽ gây hiểu nhầm).
- Đã verify đầy đủ: `supabase test db` (92/92), `pnpm typecheck/lint/test`
  (105/105), `pnpm build` (28 route), smoke test RLS thật (đăng nhập owner,
  test toàn bộ flow: business_profile, tax_rules, doanh thu nhập tay + đảo,
  khóa/mở khóa kỳ) — pass. `supabase db reset` để đưa DB về sạch sau test.

## Việc cần làm tiếp (nếu muốn, chưa yêu cầu)

- Chưa gửi báo cáo hoàn thành Bước 1.6 cho người dùng — cần gửi tóm tắt rồi
  dừng (CLAUDE.md: báo cáo kết quả rồi dừng, không tự ý làm thêm).
- Bước kế tiếp theo roadmap: **Bước 1.7** (Báo cáo cuối ngày, sao lưu, hoàn
  thiện — dashboard thật, audit_log, báo cáo lợi nhuận gộp...).
- Bước 1.6b (bộ sổ S2b-S2e) chỉ làm nếu sau này hộ chuyển nhóm sổ — hiện chưa
  cần vì tax-rules.md xác nhận dùng S2a.

## Ghi chú môi trường / kỹ thuật cần nhớ

- Thư mục dự án **không phải git repo**. Mọi thay đổi chỉ nằm trên đĩa.
- Sau khi restart máy: phải mở **Docker Desktop** rồi mới `supabase start`
  được (~1 phút để sẵn sàng). Vài service phụ (imgproxy, edge_runtime, pooler)
  có thể Stopped — không ảnh hưởng, dự án không dùng.
- Build production khi dev server đang chạy: thêm tạm
  `distDir: process.env.BUILD_DIST_DIR || ".next"` vào `next.config.ts`, build
  bằng `$env:BUILD_DIST_DIR = ".next-verify"; pnpm build` (PowerShell), xong
  revert `next.config.ts` + dòng `tsconfig.json` `include` tự thêm
  `.next-verify/...`, rồi xóa `.next-verify/`. Nếu dev server chưa chạy thì
  `pnpm build` thẳng, không cần kỹ thuật này.
- Supabase local: `supabase db reset` áp lại migrations, `supabase test db`
  chạy pgTAP (hiện 8 file, 92 case). Đăng nhập test: `owner@hkd.local` /
  `Owner@123`.
- Quy tắc làm việc theo `CLAUDE.md`: mỗi lần một việc, báo cáo kết quả rồi
  dừng, không tự mở rộng phạm vi.
