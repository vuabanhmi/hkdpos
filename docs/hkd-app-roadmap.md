# Kế hoạch phát triển app quản lý hộ kinh doanh (kèm prompt cho Claude Code)

Tài liệu này chia việc thành các bước nhỏ. Mỗi bước có mục tiêu, tiêu chí hoàn thành và một prompt để dán vào Claude Code. Làm xong bước nào, chạy test, commit, rồi mới sang bước kế tiếp.

Phạm vi:
- Giai đoạn 1: app cơ bản cho hộ kinh doanh (sản phẩm, giá, kho, bán hàng, thu chi, sổ doanh thu và kê khai thuế).
- Giai đoạn 2: thêm F&B (bàn, bếp, QR Order, in bill, ca).
- Giai đoạn 3: các hạng mục chưa làm ngay (hóa đơn điện tử, cổng ngân hàng...).

---

## 0. Chuẩn bị trước khi bắt đầu

### 0.1. Các việc Huy tự làm (Claude Code không nên đoán)

1. Tải mẫu sổ chính thức theo Thông tư 152/2025/TT-BTC (S1a, S2a, S2b, S2c, S2d, S2e-HKD, dạng Word hoặc PDF) và bỏ vào thư mục `docs/forms/`. Claude Code phải bám theo các cột và tiêu đề trong mẫu này, không tự nghĩ ra.
2. Chốt hộ của bạn thuộc nhóm nào (nhóm dùng S2a hay nhóm dùng bộ S2b đến S2e), ngành nghề kinh doanh và tỷ lệ thuế tương ứng. Ghi vào `docs/tax-rules.md`.
3. Hỏi lại kế toán hoặc cơ quan thuế quản lý về cách ghi sổ và kê khai. App chỉ là công cụ hỗ trợ, không thay thế tư vấn thuế.

### 0.2. File `CLAUDE.md` (đặt ở thư mục gốc dự án)

Nên đặt cùng nội dung vào `AGENTS.md` nếu bạn muốn thử so sánh với Antigravity.

```markdown
# Dự án: app quản lý hộ kinh doanh (dùng nội bộ, 1 hộ)

## Stack
Next.js (App Router) + TypeScript strict, Tailwind, shadcn/ui, Supabase (Postgres, Auth, RLS), Zod, Vitest.

## Quy tắc bắt buộc
- Tiền lưu bằng số nguyên đồng (bigint trong DB, number nguyên trong TS). Không dùng số thực cho tiền.
- Múi giờ nghiệp vụ là Asia/Ho_Chi_Minh. Ngày chốt sổ, kiểm kho, báo cáo ngày đều tính theo giờ Việt Nam.
- Dữ liệu sổ sách và kho chỉ ghi thêm, không sửa, không xóa (append-only). Sai thì tạo bút toán đảo.
- Đơn hàng phải lưu lại bản sao tên, giá, thuế tại thời điểm bán, không tham chiếu giá hiện tại.
- Mọi thay đổi schema đi qua migration trong `supabase/migrations`. Bật RLS cho mọi bảng.
- Logic nghiệp vụ nằm ở `src/features/<module>/domain`, có unit test. UI không chứa logic tính tiền hoặc tính thuế.
- Không tự điền tỷ lệ thuế, ngưỡng doanh thu. Đọc từ bảng cấu hình `tax_rules` có hiệu lực theo ngày.
- Mẫu sổ phải khớp file trong `docs/forms/`. Nếu thiếu mẫu thì dừng lại và hỏi.
- Giao diện tiếng Việt. Định dạng tiền 1.234.567 (dấu chấm ngăn nghìn), ngày dd/MM/yyyy.

## Cách làm việc
- Mỗi lần chỉ làm đúng một bước trong `docs/hkd-app-roadmap.md`.
- Trước khi code: đọc bước, tóm tắt kế hoạch ngắn, liệt kê file sẽ tạo hoặc sửa.
- Sau khi code: chạy typecheck, lint, test. Báo kết quả. Không tự sang bước khác.
- Không thêm tính năng ngoài phạm vi bước đang làm.
```

### 0.3. Khởi tạo dự án (Bước 0)

**Mục tiêu:** khung dự án chạy được, đăng nhập được, có migration và test mẫu.

**Hoàn thành khi:** `pnpm dev`, `pnpm test`, `pnpm lint`, `pnpm typecheck` đều chạy; đăng nhập được; trang dashboard rỗng sau đăng nhập; Supabase local chạy được.

**Prompt:**

```text
Đọc CLAUDE.md và docs/hkd-app-roadmap.md. Làm Bước 0 (khởi tạo dự án).

Việc cần làm:
1. Khởi tạo Next.js App Router + TypeScript strict + Tailwind + shadcn/ui, dùng pnpm.
2. Thiết lập Supabase local (supabase init, supabase start), file .env.example, client cho server và browser.
3. Auth bằng email + mật khẩu (Supabase Auth). Chỉ cho người dùng đăng nhập vào các trang trong nhóm (app). Dự án dùng cho một hộ, không có đăng ký công khai: tắt đăng ký tự do, tài khoản tạo thủ công.
4. Bảng app_users (id = auth.uid, display_name, role: owner | staff). RLS: chỉ người có trong app_users mới đọc ghi được dữ liệu nghiệp vụ. Viết sẵn một hàm SQL is_app_user() để các bảng sau dùng lại.
5. Layout có thanh bên với các mục: Tổng quan, Sản phẩm, Kho, Bán hàng, Đơn hàng, Thu chi, Sổ sách (mục chưa làm thì để trang trống).
6. Thư mục: src/app, src/features/<module>/{domain,components,actions}, src/lib/{money,date,db}.
7. src/lib/money: parse và format tiền VND (số nguyên). src/lib/date: hàm làm việc với Asia/Ho_Chi_Minh (đầu ngày, cuối ngày, khoảng tháng, quý).
8. Vitest + test mẫu cho money và date. Thêm script typecheck, lint, test.

Không làm tính năng nghiệp vụ nào ở bước này. Khi xong, chạy typecheck, lint, test và báo cáo.
```

---

## 1. Giai đoạn 1: hộ kinh doanh cơ bản

### Mô hình dữ liệu tổng quát

| Nhóm | Bảng chính | Ghi chú |
|---|---|---|
| Danh mục | `units`, `product_groups`, `tax_categories`, `products` | `tax_categories` là nhóm ngành nghề tính thuế, gắn vào sản phẩm |
| Giá | `price_lists`, `price_list_items`, `price_history` | `price_history` ghi tự động bằng trigger, không sửa |
| Đối tác | `contacts` (khách hàng và nhà cung cấp dùng chung, có cờ loại) | |
| Kho | `warehouses`, `stock_movements`, `stock_daily_snapshots`, `stocktakes`, `stocktake_lines` | Tồn kho là tổng các dòng trong `stock_movements` |
| Bán hàng | `orders`, `order_items`, `payments` | Đơn lưu bản sao giá, thuế tại thời điểm bán |
| Quầy | `counters`, `counter_product_groups` | Mỗi nhóm sản phẩm thuộc một quầy; `order_items` lưu quầy tại thời điểm bán |
| Thu chi | `cash_categories`, `cash_entries` | Phiếu thu và phiếu chi |
| Sổ và thuế | `tax_rules`, `ledger_periods`, `manual_revenue_entries` | Sổ doanh thu sinh từ đơn hàng và khoản nhập tay |
| Hệ thống | `app_users`, `audit_log` | |

Quyết định thiết kế cần giữ:
- Tồn kho không lưu thành một con số sửa trực tiếp. Tồn kho là tổng cộng dồn các dòng xuất nhập. Cần tốc độ thì dùng bảng snapshot cuối ngày.
- Hủy đơn, trả hàng, điều chỉnh kho đều là dòng mới ngược dấu, không xóa dòng cũ.
- Giá vốn tính theo bình quân gia quyền di động, ghi vào từng dòng xuất nhập.
- Mọi bảng nghiệp vụ có `created_at`, `created_by`. Hầu hết dùng xóa mềm (`is_active` hoặc `deleted_at`) thay vì xóa thật.

---

### Bước 1.1 (a): Sản phẩm, bảng giá, theo dõi giá biến động

**Mục tiêu:** quản lý danh mục sản phẩm và bảng giá. Mỗi lần giá đổi đều được lưu lại, xem được lịch sử và biểu đồ.

**Hoàn thành khi:**
- Thêm, sửa, tìm, lọc, vô hiệu hóa sản phẩm; nhập và xuất Excel.
- Có bảng giá mặc định "Bảng giá chung" và có thể tạo bảng giá khác có hiệu lực theo ngày.
- Đổi giá trong bảng giá thì tự có một dòng trong `price_history` (giá cũ, giá mới, thời điểm, người đổi, lý do). Lưu cùng giá thì không tạo dòng.
- Trang chi tiết sản phẩm có biểu đồ giá theo thời gian.
- Có test cho trigger lịch sử giá.

**Prompt:**

```text
Đọc CLAUDE.md và docs/hkd-app-roadmap.md. Làm Bước 1.1 (sản phẩm, bảng giá, lịch sử giá). Trước khi code, tóm tắt kế hoạch và danh sách file.

Database (migration mới, bật RLS bằng is_app_user()):
- units (id, name, description). Seed các đơn vị thông dụng: Cái, Chai, Hộp, Gói, Bao, Thùng, kg, g, Lít, ml, m, cm, Giờ, Bộ, Cuộn...
- product_groups (id, name, description).
- tax_categories (id, name, code, description). Đây là nhóm ngành nghề tính thuế, chưa gắn tỷ lệ ở bước này.
- products (id, code unique, name, barcode, unit_id, group_id, tax_category_id nullable, track_stock boolean default true, cost_price bigint default 0, is_active, note, created_at, created_by).
- price_lists (id, name, valid_from nullable, valid_to nullable, is_default, is_active). Chỉ cho phép một bảng giá is_default = true.
- price_list_items (id, price_list_id, product_id, price bigint not null check >= 0, updated_at, updated_by, unique(price_list_id, product_id)).
- price_history (id, price_list_id, product_id, old_price nullable, new_price, changed_at, changed_by, reason nullable). Chỉ cho INSERT. Chặn UPDATE và DELETE bằng trigger.
- Trigger trên price_list_items: sau INSERT hoặc UPDATE, nếu giá thực sự thay đổi thì ghi một dòng price_history. Lưu cùng giá thì không ghi. Lấy changed_by từ auth.uid().

UI:
- /products: bảng có tìm kiếm (mã, tên, barcode), lọc theo nhóm và trạng thái, phân trang. Thêm, sửa, sao chép, vô hiệu hóa. Cảnh báo những sản phẩm chưa có nhóm ngành nghề tính thuế.
- Nhập và xuất Excel (thư viện xlsx hoặc exceljs). Nhập phải có bước xem trước và báo lỗi từng dòng, không ghi nếu có lỗi nghiêm trọng.
- /price-lists: quản lý bảng giá, sửa giá hàng loạt theo bảng. Khi đổi giá cho phép nhập "lý do" (tùy chọn).
- /products/[id]: tab Thông tin và tab Lịch sử giá (bảng + biểu đồ đường bằng recharts, chọn bảng giá).

Test (Vitest + test DB hoặc pgTAP):
- Đổi giá sinh đúng một dòng lịch sử, lưu lại cùng giá không sinh dòng.
- Không sửa và không xóa được price_history.
- Chỉ có một bảng giá mặc định.

Xong thì chạy typecheck, lint, test, báo cáo và dừng.
```

**Tinh chỉnh bổ sung đã làm sau khi triển khai Bước 1.1 (theo yêu cầu thực tế dùng):**
- Nút "Tải file mẫu" trong dialog nhập Excel sản phẩm: file mẫu gồm sheet "Hướng dẫn" (giải thích định dạng, quy cách từng cột, liệt kê đúng danh mục đơn vị/nhóm sản phẩm/ngành nghề tính thuế đang có trong hệ thống) và sheet dữ liệu kèm vài dòng ví dụ hợp lệ (có thể sửa hoặc xóa). File nhập đọc đúng sheet dữ liệu theo tên, không phụ thuộc thứ tự sheet.
- `tax_categories` có thêm cờ `is_default` (chỉ một nhóm được mặc định, cùng cơ chế với `price_lists.is_default`/`warehouses.is_default`: trigger tự bỏ mặc định của nhóm khác + unique index). Form tạo sản phẩm mới tự chọn sẵn nhóm ngành nghề tính thuế mặc định; có nút "Đặt làm mặc định" ngay trong form.
- Mã sản phẩm (`products.code`) không còn bắt buộc nhập tay: bỏ trống thì hệ thống tự sinh theo hàm SQL `generate_product_code()` — dạng `SP001`, `SP002`... (lấy số lớn nhất trong các mã đúng dạng `SP<số>` hiện có rồi +1).

---

### Bước 1.2 (a): Kho nền tảng và tồn kho

**Mục tiêu:** có sổ cái xuất nhập kho. Nhập hàng, xuất hàng, điều chỉnh, xem tồn hiện tại và giá vốn bình quân.

**Hoàn thành khi:**
- Nhập kho từ nhà cung cấp (có giá nhập), xuất kho thủ công, điều chỉnh kho có lý do.
- Màn hình tồn kho hiện tại theo sản phẩm.
- Giá vốn bình quân được cập nhật mỗi lần nhập.
- Có lịch sử giá nhập theo sản phẩm (xem được biến động giá nhập).
- Cấu hình cho phép hoặc không cho phép tồn âm (mặc định không cho).

**Prompt:**

```text
Đọc CLAUDE.md và docs/hkd-app-roadmap.md. Làm Bước 1.2 (kho nền tảng). Tóm tắt kế hoạch trước khi code.

Database:
- contacts (id, name, phone, email, address, tax_code, bank_name, bank_account, is_customer, is_supplier, note, is_active).
- warehouses (id, code, name, is_default, is_active). Seed một kho mặc định "Kho bán hàng".
- stock_movements (id, warehouse_id, product_id, movement_type enum: purchase_in | sale_out | return_in | return_out | adjust_in | adjust_out | stocktake_adjust | transfer_in | transfer_out, quantity numeric(14,3) có dấu dương khi nhập và âm khi xuất, unit_cost bigint, avg_cost_after bigint, ref_type, ref_id, occurred_at timestamptz, note, created_at, created_by). Chỉ INSERT, chặn UPDATE và DELETE.
- stock_documents (id, doc_no unique, doc_type: purchase | issue | adjustment, contact_id nullable, occurred_at, note, status: posted | voided). Mỗi phiếu có nhiều dòng; khi ghi sổ thì sinh stock_movements. Hủy phiếu = sinh dòng đảo, đặt status voided.
- View hoặc hàm stock_on_hand(warehouse_id, product_id, as_of timestamptz default now()) tính từ stock_movements.
- Hàm tính giá vốn bình quân gia quyền di động khi nhập, lưu avg_cost_after, cập nhật products.cost_price.
- Bảng purchase_price_history ghi giá nhập mỗi lần nhập (product_id, contact_id, unit_cost, occurred_at) hoặc dùng luôn stock_movements để truy vấn. Chọn phương án đơn giản hơn và giải thích lý do.
- Cấu hình app_settings.allow_negative_stock (mặc định false). Khi false, phát hành xuất kho làm tồn âm thì báo lỗi.

Mọi thao tác ghi kho đi qua các hàm RPC (Postgres function) chạy trong một transaction, có khóa dòng để tránh hai người ghi đè nhau.

UI:
- /inventory: tồn kho hiện tại (tìm kiếm, lọc nhóm, hiển thị tồn, giá vốn, giá trị tồn, cảnh báo dưới mức tối thiểu nếu có cấu hình).
- /inventory/documents: danh sách phiếu nhập, xuất, điều chỉnh; tạo phiếu; xem chi tiết; hủy phiếu (sinh bút toán đảo).
- /contacts: khách hàng và nhà cung cấp (CRUD đơn giản, nhập xuất Excel).
- Trang chi tiết sản phẩm thêm tab "Thẻ kho" (các dòng xuất nhập) và biểu đồ giá nhập.

Test: nhập nhiều lần với giá khác nhau thì giá vốn bình quân đúng; xuất vượt tồn bị chặn khi tắt tồn âm; hủy phiếu đưa tồn về đúng; không sửa hoặc xóa được stock_movements.

Chạy typecheck, lint, test, báo cáo và dừng.
```

**Tinh chỉnh bổ sung đã làm sau khi triển khai Bước 1.2:**
- `/contacts` cũng có nút "Tải file mẫu" khi nhập Excel, cùng cơ chế sheet "Hướng dẫn" + dữ liệu ví dụ như mô tả ở Bước 1.1.

---

### Bước 1.3 (b): Bán hàng và đơn hàng

**Mục tiêu:** bán nhanh tại quầy, quản lý đơn hàng, trừ kho tự động, thanh toán, hủy và trả hàng.

**Hoàn thành khi:**
- Màn hình bán hàng: tìm sản phẩm (F1 hoặc quét mã vạch), thêm vào giỏ, chỉnh số lượng, giảm giá theo dòng hoặc theo đơn, chọn khách (hoặc khách lẻ), thanh toán tiền mặt, chuyển khoản, hoặc nhiều hình thức.
- Hoàn tất đơn thì trừ kho và ghi giá vốn.
- Danh sách đơn có các trạng thái: hoàn thành, đã hủy, có trả hàng, ghi nợ.
- Hủy đơn và trả hàng sinh dòng đảo trong kho và đảo doanh thu, không sửa dòng cũ.

**Prompt:**

```text
Đọc CLAUDE.md và docs/hkd-app-roadmap.md. Làm Bước 1.3 (bán hàng và đơn hàng). Tóm tắt kế hoạch trước khi code.

Database:
- orders (id, order_no unique dạng DH + yyyyMMdd + số thứ tự trong ngày, contact_id nullable, status: draft | completed | cancelled, sale_channel default 'counter', subtotal bigint, discount_total bigint, total bigint, paid_total bigint, debt_total bigint, note, ordered_at, completed_at, created_by).
- order_items (id, order_id, product_id, product_code_snapshot, product_name_snapshot, unit_name_snapshot, tax_category_id_snapshot, quantity numeric(14,3), unit_price bigint, discount bigint, line_total bigint, unit_cost_snapshot bigint). Lưu bản sao, không tham chiếu giá hiện tại.
- payments (id, order_id, method: cash | transfer | other, amount bigint, paid_at, note).
- order_returns và order_return_items cho trả hàng một phần hoặc toàn bộ (tham chiếu đơn gốc, ghi lý do).
- Hàm RPC complete_order(order_id): kiểm tra tồn, sinh stock_movements loại sale_out (dùng giá vốn bình quân hiện tại), chuyển trạng thái completed, trong một transaction. Hàm cancel_order và create_return sinh dòng đảo tương ứng, không sửa dữ liệu cũ.
- Giá bán lấy từ bảng giá mặc định lúc thêm vào giỏ, cho phép sửa tay (ghi nhận là giá sửa tay).

UI:
- /pos: màn hình bán hàng 2 cột (trái giỏ hàng, phải lưới sản phẩm). Phím tắt F1 tìm sản phẩm, F9 thanh toán. Hỗ trợ nhiều đơn nháp song song (tab). Có chọn khách, giảm giá theo dòng và theo đơn, thanh toán nhiều hình thức, ghi nợ phần chưa trả.
- /orders: danh sách đơn có tab trạng thái, lọc theo ngày, tìm theo mã đơn hoặc khách, xuất Excel. Trang chi tiết đơn có nút hủy, trả hàng, in lại hóa đơn bán hàng (bản in đơn giản bằng CSS print).
- Công nợ khách: ghi nhận thanh toán bổ sung cho đơn còn nợ.

Test: tính tiền đúng với giảm giá và làm tròn; hoàn tất đơn trừ đúng tồn và ghi đúng giá vốn; hủy đơn đưa tồn về cũ; trả một phần đúng số lượng và đúng tiền; không hoàn tất được đơn khi tồn không đủ (khi tắt tồn âm).

Chạy typecheck, lint, test, báo cáo và dừng.
```

---

### Bước 1.3b: Quầy bán hàng và thống kê theo quầy cuối ngày

**Mục tiêu:** chia cửa hàng thành nhiều quầy, mỗi quầy phụ trách một số nhóm sản phẩm. Cuối ngày xem được mỗi quầy bán bao nhiêu và thu về bao nhiêu tiền.

Quy tắc thiết kế cần giữ:
- Mỗi nhóm sản phẩm chỉ thuộc đúng một quầy, để một dòng hàng không bị đếm hai lần. Nếu cần ngoại lệ thì gán quầy riêng cho từng sản phẩm (gán ở sản phẩm sẽ ghi đè gán ở nhóm).
- Khi bán, mỗi dòng hàng lưu lại quầy của nó tại thời điểm bán (`counter_id` và tên quầy). Sau này đổi cấu hình quầy thì số liệu các ngày cũ không bị thay đổi.
- Sản phẩm chưa gán quầy vào dòng "Chưa gán quầy". Dòng này luôn hiện trong báo cáo, và tổng các quầy phải khớp tổng doanh thu cuối ngày.
- Thống kê theo dòng hàng, không theo đơn. Một đơn có thể gồm hàng của nhiều quầy mà vẫn tính đúng.
- Báo cáo có hai cách tính tiền. Doanh số gộp = số lượng x đơn giá bán (đúng như cách tính bạn mô tả). Doanh thu thực = doanh số gộp trừ giảm giá dòng và phần giảm giá cả đơn đã phân bổ về từng dòng theo tỷ lệ giá trị. Phần dư do làm tròn dồn vào dòng cuối để tổng khớp đến từng đồng.
- Trả hàng hiện thành cột riêng, tính vào quầy của dòng hàng gốc và vào ngày phát sinh việc trả. Đơn hủy không tính.
- Ngày thống kê tính theo giờ Việt Nam, theo thời điểm hoàn tất đơn.
- Quầy chỉ là chiều thống kê nội bộ. Sổ doanh thu và kê khai thuế (Bước 1.6) vẫn chia theo nhóm ngành nghề tính thuế, không chia theo quầy.

**Hoàn thành khi:**
- Tạo, sửa, vô hiệu hóa quầy; gán nhóm sản phẩm cho quầy; thấy ngay nhóm hoặc sản phẩm nào chưa được gán.
- Màn hình bán hàng hiển thị quầy của từng sản phẩm và lọc được lưới sản phẩm theo quầy.
- Báo cáo cuối ngày theo quầy: số lượng, doanh số gộp, giảm giá, trả hàng, doanh thu thực; bấm vào một quầy xem chi tiết từng sản phẩm; xuất Excel và in được.
- Tổng các quầy khớp tổng doanh thu cuối ngày, lệch thì báo cảnh báo.

**Prompt:**

```text
Đọc CLAUDE.md và docs/hkd-app-roadmap.md. Làm Bước 1.3b (quầy bán hàng và thống kê theo quầy). Bước 1.1 và 1.3 đã xong. Tóm tắt kế hoạch và danh sách file trước khi code.

Database (migration mới, bật RLS bằng is_app_user()):
- counters (id, code unique, name, manager_name nullable, sort_order, is_active, note).
- counter_product_groups (counter_id, product_group_id) với unique(product_group_id): một nhóm chỉ thuộc một quầy.
- products.counter_id nullable: nếu có thì ghi đè quầy của nhóm. Viết hàm SQL resolve_counter(product_id) trả về products.counter_id, nếu null thì quầy của nhóm, nếu vẫn null thì null.
- Thêm vào order_items: counter_id nullable, counter_name_snapshot, gross_amount bigint (= quantity x unit_price), line_discount bigint, allocated_order_discount bigint, net_amount bigint. Khi hoàn tất đơn (trong complete_order), ghi các cột này. Phần giảm giá cả đơn phân bổ theo tỷ lệ gross_amount của từng dòng, phần dư làm tròn dồn vào dòng cuối để tổng khớp đến từng đồng.
- Cập nhật các hàm trả hàng: dòng trả hàng ghi counter_id của dòng gốc, gross_amount và net_amount âm tương ứng.
- Hàm hoặc view counter_daily_report(date_from, date_to) trả theo (ngày, quầy): số đơn có hàng của quầy, tổng số lượng, gross, giảm giá, trả hàng, net. Luôn gồm một dòng "Chưa gán quầy" cho counter_id null. Tính ngày theo giờ Asia/Ho_Chi_Minh.
- Backfill: với các đơn đã hoàn thành trước migration, điền các cột mới bằng dữ liệu hiện có và ghi rõ trong tài liệu cách xử lý, không được làm thay đổi tổng doanh thu cũ.

UI:
- /counters: danh sách và CRUD quầy; màn hình gán nhóm sản phẩm cho quầy (hai cột, chọn nhiều); khu cảnh báo liệt kê nhóm chưa gán quầy và sản phẩm chưa gán quầy; cho phép gán quầy riêng cho từng sản phẩm ở trang sản phẩm.
- /pos: hiện nhãn quầy trên thẻ sản phẩm và thêm bộ lọc theo quầy. Chỉ có một màn hình thanh toán chung: khách mua hàng của nhiều quầy trong cùng một đơn rồi thanh toán một lần. Không làm chế độ mỗi quầy một máy hay mỗi quầy thu tiền riêng.
- /reports/counters: chọn ngày hoặc khoảng ngày; bảng theo quầy với các cột số đơn, tổng số lượng, doanh số gộp, giảm giá, trả hàng, doanh thu thực; dòng tổng cộng; dòng đối chiếu với tổng doanh thu cuối ngày và cảnh báo nếu lệch. Bấm vào quầy xem chi tiết theo sản phẩm (số lượng, thành tiền, đơn giá bình quân; nếu một sản phẩm bán nhiều mức giá thì vẫn cộng đúng từng dòng). Xuất Excel và bản in A4, K80 bằng CSS print.

Test (bắt buộc):
- Tổng các quầy (kể cả "Chưa gán quầy") bằng tổng doanh thu cuối ngày trong mọi trường hợp test.
- Một đơn gồm hàng của hai quầy được tách đúng.
- Đổi gán nhóm sang quầy khác sau khi bán thì số liệu ngày cũ không đổi.
- Giảm giá cả đơn phân bổ đúng, tổng phân bổ bằng đúng số giảm giá, không lệch một đồng.
- Trả hàng trừ đúng quầy gốc; đơn hủy không xuất hiện trong báo cáo.
- Đơn lúc 23:59 và 00:01 giờ Việt Nam rơi vào đúng ngày.
- Không gán được một nhóm cho hai quầy.

Chạy typecheck, lint, test, báo cáo và dừng.
```

---

### Bước 1.4 (c): Thu chi

**Mục tiêu:** ghi nhận khoản thu và khoản chi ngoài bán hàng, phục vụ sổ chi tiết tiền sau này.

**Hoàn thành khi:**
- Tạo phiếu thu, phiếu chi theo danh mục; chọn hình thức tiền (tiền mặt, chuyển khoản).
- Danh sách có lọc theo ngày, loại, danh mục; tổng thu, tổng chi, chênh lệch.
- Tiền bán hàng từ đơn hàng tự hiện trong báo cáo tiền, không cần nhập lại phiếu thu.
- Sửa sai bằng phiếu đảo, không sửa trực tiếp phiếu đã ghi.

**Prompt:**

```text
Đọc CLAUDE.md và docs/hkd-app-roadmap.md. Làm Bước 1.4 (thu chi). Tóm tắt kế hoạch trước khi code.

Database:
- cash_categories (id, name, kind: income | expense, is_active). Seed vài danh mục chi thông dụng (nhập hàng, điện nước, thuê mặt bằng, lương, vận chuyển, khác) và danh mục thu (thu khác, thu nợ khách).
- cash_entries (id, entry_no unique, kind: income | expense, category_id, contact_id nullable, amount bigint > 0, method: cash | transfer, occurred_at, description, evidence_note nullable, reversed_of nullable, created_by). Chỉ INSERT. Sửa sai bằng phiếu đảo (reversed_of trỏ phiếu gốc).
- View cash_ledger gộp: thanh toán từ payments của đơn hàng (thu), phiếu thu, phiếu chi, để ra dòng tiền theo ngày và theo hình thức.

UI:
- /cashbook: danh sách phiếu thu chi, tab Tất cả, Thu, Chi; bộ lọc ngày, danh mục, hình thức; tổng thu, tổng chi, số dư kỳ; xuất Excel.
- Form tạo phiếu: chọn loại, danh mục, số tiền, hình thức, ngày giờ, mô tả, đối tác.
- Nút "Tạo phiếu đảo" với lý do.

Test: tổng thu chi đúng theo kỳ; phiếu đảo triệt tiêu phiếu gốc trong báo cáo; không sửa hoặc xóa được phiếu đã ghi.

Chạy typecheck, lint, test, báo cáo và dừng.
```

---

### Bước 1.5 (d): Kho nâng cao, kiểm tồn kho theo ngày

**Mục tiêu:** chốt tồn cuối mỗi ngày và kiểm kho theo ngày, so sánh số sổ sách với số đếm thực tế.

**Hoàn thành khi:**
- Có tồn cuối ngày cho bất kỳ ngày nào (tự sinh snapshot hằng đêm và tính lại được khi cần).
- Tạo phiên kiểm kho cho một ngày: hệ thống chốt số tồn sổ sách tại thời điểm kiểm, nhập số đếm thực tế, ra chênh lệch.
- Duyệt phiên kiểm thì sinh phiếu điều chỉnh (loại `stocktake_adjust`), khóa phiên.
- Báo cáo xuất nhập tồn theo khoảng ngày (tồn đầu, nhập, xuất, tồn cuối, theo số lượng và giá trị).

**Prompt:**

```text
Đọc CLAUDE.md và docs/hkd-app-roadmap.md. Làm Bước 1.5 (kiểm tồn kho theo ngày và báo cáo xuất nhập tồn). Tóm tắt kế hoạch trước khi code.

Database:
- stock_daily_snapshots (snapshot_date date, warehouse_id, product_id, quantity, avg_cost, value, primary key(snapshot_date, warehouse_id, product_id)). Sinh bằng hàm SQL snapshot_stock(date) dùng stock_movements, theo mốc cuối ngày giờ Việt Nam. Lập lịch chạy hằng đêm bằng pg_cron nếu có, nếu không thì cung cấp route bảo vệ bằng secret để cron bên ngoài gọi, và nút "Chốt tồn thủ công".
- Hàm stock_as_of(date, warehouse_id) trả tồn tại cuối một ngày bất kỳ: ưu tiên snapshot gần nhất cộng các movement sau đó.
- stocktakes (id, stocktake_no, warehouse_id, stocktake_date, snapshot_taken_at, status: draft | counting | approved | cancelled, note, approved_by, approved_at).
- stocktake_lines (id, stocktake_id, product_id, system_qty (chốt lúc bắt đầu), counted_qty nullable, diff_qty generated, unit_cost, diff_value generated, reason nullable).
- Duyệt phiên (RPC approve_stocktake): sinh stock_movements loại stocktake_adjust cho các dòng chênh lệch, đổi trạng thái approved, khóa không cho sửa. Nếu có giao dịch phát sinh giữa lúc chốt số hệ thống và lúc duyệt thì tính chênh lệch dựa trên số hệ thống tại thời điểm kiểm, và ghi rõ trong tài liệu cách xử lý.

UI:
- /inventory/stocktakes: danh sách phiên; tạo phiên mới (chọn ngày, kho, toàn bộ hoặc theo nhóm); màn hình đếm (nhập số đếm, quét mã vạch tìm dòng, lọc "chưa đếm" và "có chênh lệch"); tổng kết chênh lệch cả số lượng lẫn giá trị; nút duyệt; xuất Excel.
- /reports/inventory: báo cáo xuất nhập tồn theo khoảng ngày; chọn kho, nhóm sản phẩm; cột tồn đầu, nhập, xuất, tồn cuối (số lượng và giá trị); xuất Excel.
- Trang tồn kho có ô chọn "Tồn tại ngày".

Test: snapshot khớp với tính trực tiếp từ movements; tồn tại ngày quá khứ đúng sau khi có giao dịch ngày sau đó; duyệt kiểm kho sinh đúng điều chỉnh; báo cáo xuất nhập tồn: tồn đầu + nhập - xuất = tồn cuối.

Chạy typecheck, lint, test, báo cáo và dừng.
```

---

### Bước 1.6 (e): Sổ doanh thu và kê khai thuế

**Mục tiêu:** sinh sổ doanh thu theo Thông tư 152/2025/TT-BTC từ dữ liệu đơn hàng và khoản nhập tay, xuất file đúng mẫu, và có bảng tính hỗ trợ kê khai theo kỳ.

Lưu ý quan trọng:
- Theo thông tin mình tìm được, Thông tư 152/2025/TT-BTC có hiệu lực từ 01/01/2026 và chia hộ kinh doanh thành các nhóm dùng sổ khác nhau: nhóm chỉ cần S1a-HKD, nhóm nộp thuế theo tỷ lệ phần trăm trên doanh thu dùng S2a-HKD, nhóm tính thuế theo thu nhập dùng bộ bốn sổ S2b, S2c, S2d, S2e-HKD. Hãy đối chiếu với văn bản gốc và mẫu chính thức trong `docs/forms/`.
- Ngưỡng doanh thu, tỷ lệ thuế theo ngành nghề, kỳ kê khai thay đổi theo quy định nên phải để trong bảng cấu hình có hiệu lực theo ngày, không viết cứng trong code.

**Hoàn thành khi:**
- Cấu hình hộ: nhóm sổ áp dụng, kỳ kê khai (quý hoặc tháng), danh sách `tax_categories` kèm tỷ lệ thuế có hiệu lực theo ngày.
- Sổ S2a-HKD (và S1a-HKD nếu cần) sinh tự động theo kỳ từ đơn hàng hoàn thành, trừ trả hàng, cộng khoản doanh thu nhập tay; xuất Excel và PDF đúng cột theo mẫu.
- Có khóa kỳ: khóa rồi thì không đổi số liệu kỳ đó, muốn sửa phải mở khóa có ghi nhận.
- Có bảng tính hỗ trợ kê khai theo kỳ (doanh thu theo nhóm ngành nghề, thuế tạm tính theo tỷ lệ cấu hình). App không nộp và không gửi gì cho cơ quan thuế.
- Có cảnh báo gần chạm ngưỡng doanh thu theo cấu hình.
- Bộ S2b đến S2e để làm sau (Bước 1.6b), chỉ làm nếu hộ thuộc nhóm đó.

**Prompt:**

```text
Đọc CLAUDE.md, docs/tax-rules.md và các mẫu trong docs/forms/. Làm Bước 1.6 (sổ doanh thu và hỗ trợ kê khai thuế). Nếu docs/forms/ chưa có mẫu sổ cần dùng hoặc docs/tax-rules.md chưa ghi nhóm sổ, tỷ lệ, ngưỡng thì DỪNG và hỏi tôi, không được tự đoán số liệu hay cột của mẫu.

Trước khi code, tóm tắt: cột nào của mẫu sổ lấy từ dữ liệu nào, và liệt kê các giả định cần tôi xác nhận.

Database:
- tax_rules (id, key, value jsonb, effective_from date, effective_to date nullable, source_note). Dùng để lưu: nhóm sổ áp dụng, kỳ kê khai, ngưỡng doanh thu, tỷ lệ thuế theo tax_category. Truy vấn theo ngày hiệu lực. Không hard-code số nào trong code.
- manual_revenue_entries (id, entry_date, description, amount bigint, payment_method, tax_category_id, evidence_note, reversed_of nullable). Cho doanh thu không đi qua POS. Chỉ INSERT.
- ledger_periods (id, period_type: month | quarter | year, period_start, period_end, status: open | locked, locked_at, locked_by, lock_note). Khóa kỳ chặn tạo đơn, phiếu có ngày trong kỳ đó (trigger hoặc kiểm tra trong RPC); mở khóa phải ghi vào audit_log.
- View revenue_ledger_lines: gộp đơn hoàn thành (theo ngày hoàn tất, giờ Việt Nam), trừ phần trả hàng (dòng âm), cộng manual_revenue_entries; có cột ngày, số hiệu chứng từ, diễn giải, số tiền, tax_category.

Chức năng:
- /settings/tax: cấu hình nhóm sổ, kỳ kê khai, bảng tỷ lệ theo ngành nghề (có ngày hiệu lực), ngưỡng doanh thu. Hiển thị rõ "nguồn" và ngày cập nhật của từng giá trị.
- /ledger/s2a (và /ledger/s1a nếu cấu hình yêu cầu): xem sổ theo kỳ, tổng cộng theo nhóm ngành nghề, xuất Excel và PDF đúng mẫu trong docs/forms/. Dùng exceljs, bám đúng tiêu đề, cột, chữ ký, thông tin hộ kinh doanh trong mẫu. Có thông tin hộ (tên, địa chỉ, mã số thuế) lấy từ business_profile.
- /ledger/periods: danh sách kỳ, khóa và mở khóa kỳ (xác nhận 2 bước, ghi audit_log).
- /tax/declaration-helper: bảng tính hỗ trợ kê khai theo kỳ: doanh thu theo nhóm ngành nghề, thuế tạm tính, so sánh với ngưỡng. Hiện dòng chữ nhắc: "Số liệu chỉ để tham khảo, cần đối chiếu với tờ khai chính thức và kế toán".
- Cảnh báo ở trang tổng quan khi doanh thu lũy kế gần ngưỡng cấu hình (mức cảnh báo cấu hình được).

Test (bắt buộc, vì liên quan tiền thuế):
- Doanh thu kỳ = tổng đơn hoàn thành trừ trả hàng cộng nhập tay; đơn hủy không tính.
- Đơn ở sát biên giới ngày (23:59 và 00:01 giờ Việt Nam) vào đúng kỳ.
- Đổi tỷ lệ thuế có hiệu lực theo ngày: kỳ cũ dùng tỷ lệ cũ, kỳ mới dùng tỷ lệ mới.
- Kỳ đã khóa không cho tạo thêm đơn hoặc sửa dữ liệu trong kỳ đó.
- File Excel xuất ra có đúng tiêu đề cột như mẫu (test snapshot).

Chạy typecheck, lint, test, báo cáo và dừng.
```

---

### Bước 1.7: Báo cáo cuối ngày, sao lưu, hoàn thiện

**Mục tiêu:** hoàn thiện để dùng thật hằng ngày.

**Hoàn thành khi:**
- Trang tổng quan: doanh thu hôm nay, số đơn, thu chi, cảnh báo tồn thấp, sản phẩm bán chạy.
- Báo cáo cuối ngày (in được): doanh thu theo hình thức thanh toán, thu chi, tiền mặt dự kiến trong két.
- Báo cáo lợi nhuận gộp theo sản phẩm (dùng giá vốn đã lưu trên từng dòng đơn).
- Nút xuất toàn bộ dữ liệu ra file để sao lưu; hướng dẫn sao lưu Supabase định kỳ.
- Nhật ký thao tác (`audit_log`) cho các việc nhạy cảm: đổi giá, hủy đơn, điều chỉnh kho, mở khóa kỳ.

**Prompt:**

```text
Đọc CLAUDE.md và docs/hkd-app-roadmap.md. Làm Bước 1.7 (báo cáo cuối ngày, sao lưu, hoàn thiện). Tóm tắt kế hoạch trước khi code.

Việc cần làm:
1. /dashboard: doanh thu hôm nay, số đơn, thu, chi, danh sách tồn thấp, top sản phẩm bán chạy trong 7 và 30 ngày, tiến độ doanh thu so với ngưỡng (nếu có cấu hình).
2. /reports/end-of-day: chọn ngày; doanh thu theo hình thức thanh toán, thu chi trong ngày, tiền mặt dự kiến; bản in A4 và K80 bằng CSS print, thêm phần tóm tắt doanh thu theo từng quầy lấy từ counter_daily_report của Bước 1.3b (có liên kết sang /reports/counters).
3. /reports/profit: lợi nhuận gộp theo sản phẩm và theo khoảng ngày, dùng unit_cost_snapshot trên order_items.
4. audit_log (id, at, user_id, action, entity, entity_id, before jsonb, after jsonb). Ghi các hành động: đổi giá, hủy đơn, trả hàng, điều chỉnh kho, duyệt kiểm kho, khóa hoặc mở khóa kỳ. Trang /settings/audit để xem và lọc.
5. Nút xuất toàn bộ dữ liệu (nhiều sheet Excel hoặc file JSON) và tài liệu docs/backup.md hướng dẫn sao lưu định kỳ Supabase.
6. Rà soát: các bảng đều có RLS; không có endpoint ghi dữ liệu nào thiếu kiểm tra đăng nhập; quét lại các chỗ dùng số thực cho tiền.

Test các báo cáo bằng dữ liệu mẫu cố định. Chạy typecheck, lint, test, báo cáo và dừng.
```

---

## 2. Giai đoạn 2: thêm F&B

Làm sau khi giai đoạn 1 chạy ổn định ít nhất một thời gian. Tất cả đều dựa trên đơn hàng và kho đã có, không làm lại từ đầu.

### Bước 2.1: Khu vực, bàn, sơ đồ bàn

**Hoàn thành khi:** quản lý khu vực và bàn; sơ đồ bàn kéo thả lưu được vị trí; bàn hiển thị trạng thái trống hoặc đang dùng.

```text
Đọc CLAUDE.md và docs/hkd-app-roadmap.md. Làm Bước 2.1 (khu vực, bàn, sơ đồ bàn). Tóm tắt kế hoạch trước khi code.

Database: areas (id, name, sort_order, is_active), tables (id, area_id, name, seats nullable, pos_x, pos_y, width, height, shape, qr_token unique, is_active). Cột table_status suy ra từ đơn đang mở của bàn, không lưu cứng.

UI: /tables quản lý danh sách; /tables/map là trình thiết kế mặt bằng kéo thả (dùng dnd-kit hoặc react-konva), có phóng to thu nhỏ, thêm bàn, thêm cửa hoặc vật cản (chỉ để trang trí), nút lưu vị trí. Màu bàn: xanh = trống, vàng = đang dùng. Trên màn hình bán hàng có chế độ xem sơ đồ bàn để chọn bàn.

Test: lưu và tải lại tọa độ đúng; không xóa được bàn đang có đơn mở.
Chạy typecheck, lint, test, báo cáo và dừng.
```

### Bước 2.2: Bán tại bàn, gộp, tách, chuyển bàn

**Hoàn thành khi:** mở bàn, thêm món nhiều lần, gộp hai bàn, tách món sang đơn mới, chuyển bàn, tạm tính và thanh toán theo bàn.

```text
Đọc CLAUDE.md và docs/hkd-app-roadmap.md. Làm Bước 2.2 (bán tại bàn). Tóm tắt kế hoạch trước khi code.

Mở rộng orders: thêm table_id nullable, service_type (dine_in | takeaway), guest_count nullable. Đơn của bàn ở trạng thái open cho đến khi thanh toán. Thêm các RPC: open_table_order, add_items, move_table, merge_orders, split_order (tách một số dòng sang đơn mới). Mọi thao tác phải bảo toàn tổng tiền và có ghi audit_log. Món chỉ trừ kho khi hoàn tất thanh toán (hoặc theo cấu hình), ghi rõ lựa chọn trong tài liệu.

UI: chọn bàn từ sơ đồ, màn hình đơn theo bàn, nút Tạm tính (in), Gộp, Tách, Chuyển bàn, Thanh toán.

Test: gộp rồi tách giữ nguyên tổng tiền; chuyển bàn cập nhật đúng trạng thái hai bàn; không thanh toán được đơn rỗng.
Chạy typecheck, lint, test, báo cáo và dừng.
```

### Bước 2.3: Món bán kèm (topping), ghi chú món

```text
Đọc CLAUDE.md và docs/hkd-app-roadmap.md. Làm Bước 2.3 (nhóm bán kèm và ghi chú món). Tóm tắt kế hoạch trước khi code.

Database: addon_groups (id, name, is_required, min_select, max_select), addon_group_items (group_id, product_id, extra_price), product_addon_groups (product_id, addon_group_id). order_item_addons (order_item_id, product_id, name_snapshot, extra_price, quantity). Thêm order_items.note.

UI: khi chọn món có nhóm bán kèm thì hiện hộp thoại chọn topping, bắt buộc chọn nếu nhóm đặt is_required. Tiền topping cộng vào dòng hàng; topping có theo dõi kho thì trừ kho.

Test: bắt buộc chọn đúng số lượng tối thiểu và tối đa; tổng tiền dòng đúng; trừ kho đúng khi bán món có topping.
Chạy typecheck, lint, test, báo cáo và dừng.
```

### Bước 2.4: Khu vực chế biến và màn hình bếp (KDS)

**Hoàn thành khi:** gửi món xuống bếp, bếp thấy món theo thời gian thực, đổi trạng thái món, hủy món có lý do.

```text
Đọc CLAUDE.md và docs/hkd-app-roadmap.md. Làm Bước 2.4 (khu vực chế biến và màn hình bếp). Tóm tắt kế hoạch trước khi code.

Database: prep_areas (id, name), products.prep_area_id nullable. Lưu ý: khu vực chế biến (định tuyến món xuống bếp) khác với quầy bán hàng ở Bước 1.3b (chiều thống kê doanh thu). Giữ hai khái niệm tách biệt, không dùng chung bảng. Trạng thái từng dòng món order_items.kitchen_status: pending | cooking | ready | served | cancelled, kèm sent_at, started_at, ready_at, cancelled_reason. Thêm nút "Báo bếp" gửi các dòng chưa gửi.

KDS /kitchen: dùng Supabase Realtime. Hai vùng "Chờ chế biến" và "Đã xong, chờ phục vụ". Ba kiểu xem: ưu tiên (theo thời gian chờ), theo món (gom cùng món), theo bàn. Có âm báo khi có món mới, đổi màu khi chờ quá lâu (ngưỡng cấu hình). Lọc theo khu vực chế biến.

Hủy món đã báo bếp bắt buộc có lý do, ghi audit_log.

Test: món chuyển trạng thái đúng thứ tự; hủy món sau khi bếp bắt đầu làm có cảnh báo; tổng tiền đơn cập nhật khi hủy món.
Chạy typecheck, lint, test, báo cáo và dừng.
```

### Bước 2.5: QR Order cho khách

**Hoàn thành khi:** khách quét QR tại bàn, xem thực đơn, gọi món, thu ngân xác nhận rồi đơn mới xuống bếp.

```text
Đọc CLAUDE.md và docs/hkd-app-roadmap.md. Làm Bước 2.5 (QR Order). Tóm tắt kế hoạch trước khi code, nhất là phần bảo mật.

Route công khai /o/[qr_token] không cần đăng nhập, hiển thị thực đơn theo một bảng giá chọn trong cấu hình (order_menu_price_list_id), ảnh sản phẩm tùy chọn, chọn topping và ghi chú. Gửi yêu cầu gọi món tạo bản ghi qr_order_requests (trạng thái pending) chứ không tạo thẳng đơn thật. Thu ngân thấy thông báo và bấm xác nhận để đưa vào đơn của bàn, hoặc từ chối.

Bảo mật: không dùng khóa service role ở client; qua RPC hoặc route server có kiểm tra qr_token; giới hạn tần suất theo IP và token; chặn dữ liệu bất hợp lệ bằng Zod; khách chỉ thấy sản phẩm đang bán, không thấy giá vốn hay dữ liệu nội bộ. Cho phép làm mới (đổi) qr_token của bàn. Có trang in mã QR cho từng bàn (nhiều bàn một lượt).

Test: token sai bị từ chối; gọi liên tục quá giới hạn bị chặn; yêu cầu chỉ thành đơn khi thu ngân xác nhận; khách không đọc được dữ liệu của bàn khác.
Chạy typecheck, lint, test, báo cáo và dừng.
```

### Bước 2.6: In ấn (tạm tính, hóa đơn bán hàng, phiếu bếp)

```text
Đọc CLAUDE.md và docs/hkd-app-roadmap.md. Làm Bước 2.6 (mẫu in). Tóm tắt kế hoạch trước khi code.

Làm hệ thống mẫu in dùng biến, ví dụ {ten_cua_hang}, {ma_don}, {ban}, {tong_cong}, cho các loại: tạm tính, thanh toán, phiếu bếp, phiếu hủy món, tem nhãn. Lưu mẫu trong bảng print_templates (loại, nội dung, khổ giấy K58 hoặc K80 hoặc A5). Trang cấu hình có xem trước trực tiếp. In bằng window.print với CSS print. Ghi rõ trong docs/printing.md các phương án in tự động không cần hộp thoại (ví dụ ứng dụng trung gian hoặc ESC/POS), nhưng chưa cài đặt ở bước này.

Test: render mẫu với dữ liệu giả ra đúng nội dung; biến không tồn tại không làm hỏng mẫu.
Chạy typecheck, lint, test, báo cáo và dừng.
```

### Bước 2.7: Ca làm việc và phụ thu, voucher (làm khi thật sự cần)

```text
Đọc CLAUDE.md và docs/hkd-app-roadmap.md. Làm Bước 2.7. Tóm tắt kế hoạch và hỏi tôi muốn làm phần nào trước (ca, phụ thu, voucher) rồi mới code.

Ca: shifts (mở ca với tiền đầu ca, chốt ca với tiền đếm thực tế, chênh lệch so với tiền mặt dự kiến). Cấu hình có bắt buộc mở ca trước khi bán hay không.
Phụ thu: surcharges (tên, loại cố định hoặc phần trăm, có thuế hay không), áp vào đơn, hiện rõ trên mẫu in và trong sổ doanh thu.
Voucher: vouchers (mã, loại giảm, điều kiện, hạn dùng, giới hạn lượt), áp vào đơn, ghi rõ khoản giảm trong order_items hoặc orders.

Mỗi phần có test riêng. Chạy typecheck, lint, test, báo cáo và dừng.
```

---

## 3. Giai đoạn 3: chưa làm ngay

Các hạng mục dưới đây phụ thuộc đối tác bên ngoài hoặc quy định pháp lý, nên chỉ làm khi thật sự cần và nên dùng dịch vụ có sẵn:

- **Hóa đơn điện tử** kết nối cơ quan thuế (mã cơ quan thuế, vòng đời hóa đơn hợp lệ, không hợp lệ, hủy, thay thế). Nên tích hợp qua nhà cung cấp hóa đơn điện tử thay vì tự làm.
- **Cổng thanh toán ngân hàng và đối soát giao dịch** (webhook, QR động).
- **Đồng bộ phần mềm kế toán** bên ngoài.
- **Nhiều chi nhánh, sàn thương mại điện tử, thẻ thành viên, phân quyền chi tiết.**
- **Bộ sổ S2b đến S2e-HKD** nếu hộ thuộc nhóm tính thuế theo thu nhập (Bước 1.6b).

---

## 4. Danh sách các điểm cần chốt trước khi code

1. Hộ của bạn thuộc nhóm sổ nào, kỳ kê khai theo quý hay tháng, ngành nghề và tỷ lệ thuế từng ngành.
2. Có cần theo dõi tồn kho cho tất cả sản phẩm không, hay chỉ một số (cờ `track_stock`).
3. Trừ kho khi nào (lúc hoàn tất đơn hay lúc bán tại bàn), đặc biệt cho F&B.
4. Có cho tồn âm không (mặc định: không).
5. Có cần giá nhập theo từng nhà cung cấp hay chỉ cần giá vốn bình quân.
6. Máy in dùng loại nào (K58, K80, A4) và có cần in tự động không.
7. Triển khai ở đâu (Vercel + Supabase cloud hay tự lưu trữ) và cách sao lưu.
8. Quầy bán hàng: đã chốt là thanh toán một lần cho cả đơn, không có chế độ mỗi quầy một máy.
9. Có tính giảm giá cả đơn vào doanh thu từng quầy không (kế hoạch mặc định có, kèm cột doanh số gộp để đối chiếu).

## 5. Lưu ý chung khi làm việc với Claude Code

- Mỗi lần chỉ dán một prompt. Đọc kế hoạch Claude Code tóm tắt trước khi cho nó code.
- Với các bước liên quan tiền, kho, thuế: yêu cầu xem test trước khi xem giao diện.
- Dữ liệu thật chỉ nhập sau khi các bước 1.1 đến 1.6 đã qua kiểm thử bằng dữ liệu mẫu.
- Khi quy định thuế thay đổi, chỉ sửa `tax_rules` và tài liệu, không sửa code.
- Nếu một bước quá lớn, bảo Claude Code chia nhỏ thành các commit riêng (schema, domain, UI, test).
