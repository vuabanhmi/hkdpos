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