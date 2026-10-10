-- Bước 1.6: Sổ doanh thu (S2a-HKD) và hỗ trợ kê khai thuế.
--
-- Xác nhận với người dùng trước khi code (không tự đoán số liệu thuế):
-- - Nhóm sổ: S2a-HKD (docs/tax-rules.md). Không cần S1a-HKD (chỉ dùng cho hộ
--   miễn thuế, hộ này đã xác nhận dùng S2a).
-- - Ngành nghề: dịch vụ ăn uống, GTGT 5%, TNCN 2% (docs/tax-rules.md).
-- - Kỳ kê khai: theo quý (xác nhận trực tiếp bởi người dùng, phiên 2026-10-10).
-- - Ngưỡng doanh thu cảnh báo: 1.000.000.000 đ/năm (xác nhận trực tiếp bởi
--   người dùng, phiên 2026-10-10 — KHÔNG lấy theo con số 500 triệu trong tài
--   liệu hướng dẫn chung, vì người dùng đã chỉnh lại).
-- - Không hard-code số nào trong code: mọi giá trị trên nằm trong bảng tax_rules
--   (có ngày hiệu lực, có source_note ghi rõ nguồn).
--
-- Quyết định thiết kế:
-- - tax_rules là bảng EAV đơn giản (key/value jsonb, hiệu lực theo ngày) đúng như
--   roadmap mô tả, để không phải thêm migration mỗi khi đổi quy định.
-- - manual_revenue_entries dùng đúng cơ chế đảo dấu như cash_entries (Bước 1.4):
--   bản gốc amount > 0, phiếu đảo amount < 0, reversed_of trỏ về bản gốc — SUM
--   tự triệt tiêu, không cần logic đặc biệt.
-- - ledger_periods: khóa/mở khóa. audit_log CHƯA tồn tại (thuộc Bước 1.7) nên ghi
--   trực tiếp unlocked_at/unlocked_by/unlock_reason lên chính bảng này thay vì
--   một bảng audit_log riêng.
-- - Khóa kỳ chặn tạo MỚI dữ liệu ảnh hưởng doanh thu/kho có ngày trong kỳ đó:
--   kiểm tra ngay trong từng RPC ghi dữ liệu (không dùng trigger chung, vì mỗi
--   RPC có một cột ngày khác nhau cần map: complete_order/cancel_order/
--   create_return/create_cash_entry_reversal/approve_stocktake dùng thời điểm
--   THỰC HIỆN hành động (clock_timestamp(), vì đó là lúc dữ liệu mới được ghi);
--   post_stock_document/create_cash_entry/create_manual_revenue_entry dùng đúng
--   ngày người dùng nhập (p_occurred_at / p_entry_date), vì các phiếu này cho
--   phép ghi lùi ngày.
--
-- Giản lược đã thống nhất (ghi trong báo cáo, không phải tự quyết âm thầm):
-- - Cảnh báo gần ngưỡng doanh thu đặt ở /tax/declaration-helper (và /settings/tax),
--   KHÔNG đặt ở /dashboard vì trang đó thuộc Bước 1.7 (hiện vẫn "Chưa triển khai"),
--   tránh lấn phạm vi bước.
-- - "Xuất PDF đúng mẫu": làm bản in A4 bằng CSS print (window.print, giống các
--   báo cáo khác trong app) thay vì generate PDF điền đúng pixel file .docx mẫu.
--   Xuất Excel bám đúng cột mẫu S2a-HKD.

-- ---------------------------------------------------------------------------
-- business_profile: thông tin hộ kinh doanh (một dòng), hiển thị trên sổ in ra.
-- ---------------------------------------------------------------------------
create table public.business_profile (
  id boolean primary key default true check (id = true),
  name text,
  address text,
  tax_code text,
  updated_at timestamptz not null default clock_timestamp(),
  updated_by uuid references public.app_users (id)
);

alter table public.business_profile enable row level security;

create policy "business_profile_select" on public.business_profile
  for select to authenticated using (public.is_app_user());
create policy "business_profile_update" on public.business_profile
  for update to authenticated using (public.is_app_user()) with check (public.is_app_user());

insert into public.business_profile (id) values (true);

-- ---------------------------------------------------------------------------
-- tax_rules: cấu hình có hiệu lực theo ngày — nhóm sổ, kỳ kê khai, ngưỡng doanh
-- thu, tỷ lệ thuế theo từng nhóm ngành nghề. Không hard-code số nào trong code.
-- ---------------------------------------------------------------------------
create table public.tax_rules (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  value jsonb not null,
  effective_from date not null,
  effective_to date,
  source_note text,
  created_at timestamptz not null default clock_timestamp(),
  created_by uuid references public.app_users (id) default auth.uid()
);

create index tax_rules_key_effective_idx on public.tax_rules (key, effective_from desc);

alter table public.tax_rules enable row level security;

create policy "tax_rules_select" on public.tax_rules
  for select to authenticated using (public.is_app_user());
create policy "tax_rules_insert" on public.tax_rules
  for insert to authenticated with check (public.is_app_user());

comment on table public.tax_rules is
  'Cấu hình thuế có hiệu lực theo ngày (nhóm sổ, kỳ kê khai, ngưỡng doanh thu, tỷ lệ theo ngành nghề). Chỉ INSERT — đổi quy định thì thêm dòng mới với effective_from mới, không sửa dòng cũ.';

create or replace function public.get_tax_rule_value(p_key text, p_as_of date)
returns jsonb
language sql
stable
as $$
  select value
  from public.tax_rules
  where key = p_key
    and effective_from <= p_as_of
    and (effective_to is null or effective_to >= p_as_of)
  order by effective_from desc
  limit 1;
$$;

comment on function public.get_tax_rule_value is
  'Giá trị tax_rules có hiệu lực tại một ngày bất kỳ cho một key — ưu tiên bản ghi effective_from gần nhất không vượt quá ngày hỏi.';

grant execute on function public.get_tax_rule_value(text, date) to authenticated;

-- Seed: nhóm sổ, kỳ kê khai, ngưỡng doanh thu — hiệu lực từ ngày Thông tư
-- 152/2025/TT-BTC có hiệu lực (01/01/2026).
insert into public.tax_rules (key, value, effective_from, source_note) values
  ('book_group', '{"group": "s2a"}'::jsonb, '2026-01-01',
   'Xác nhận trong docs/tax-rules.md: hộ kinh doanh dùng nhóm sổ S2a'),
  ('declaration_period', '{"period": "quarter"}'::jsonb, '2026-01-01',
   'Xác nhận trực tiếp bởi người dùng (phiên làm việc 2026-10-10): kê khai theo quý'),
  ('revenue_threshold', '{"amount": 1000000000, "warn_percent": 0.8}'::jsonb, '2026-01-01',
   'Xác nhận trực tiếp bởi người dùng (phiên làm việc 2026-10-10): ngưỡng doanh thu 1.000.000.000 đ/năm. Mức cảnh báo (warn_percent) đặt mặc định 80%, chỉnh được ở /settings/tax.');

-- Seed nhóm ngành nghề tính thuế "Dịch vụ ăn uống" (duy nhất, theo tax-rules.md)
-- kèm tỷ lệ GTGT 5% / TNCN 2%, và đặt làm mặc định vì đây là ngành nghề duy nhất
-- của hộ (dùng lại trigger một-mặc-định đã có từ Bước 1.1).
do $$
declare
  v_tax_category_id uuid;
begin
  insert into public.tax_categories (name, code, is_default)
  values ('Dịch vụ ăn uống', 'DVAU', true)
  returning id into v_tax_category_id;

  insert into public.tax_rules (key, value, effective_from, source_note) values (
    'tax_category_rate:' || v_tax_category_id::text,
    jsonb_build_object('gtgt_rate', 0.05, 'tncn_rate', 0.02),
    '2026-01-01',
    'Xác nhận trong docs/tax-rules.md: ngành dịch vụ ăn uống — GTGT 5%, TNCN 2%'
  );
end $$;

-- ---------------------------------------------------------------------------
-- manual_revenue_entries: doanh thu không đi qua POS. Chỉ INSERT, sửa sai bằng
-- phiếu đảo (reversed_of), cùng cơ chế dấu với cash_entries (Bước 1.4).
-- ---------------------------------------------------------------------------
create table public.manual_revenue_entries (
  id uuid primary key default gen_random_uuid(),
  entry_no text not null unique,
  entry_date date not null,
  description text not null,
  amount bigint not null,
  payment_method text not null check (payment_method in ('cash', 'transfer', 'other')),
  tax_category_id uuid not null references public.tax_categories (id),
  evidence_note text,
  reversed_of uuid references public.manual_revenue_entries (id),
  created_at timestamptz not null default clock_timestamp(),
  created_by uuid references public.app_users (id) default auth.uid(),
  constraint manual_revenue_entries_sign_matches_reversal check (
    (reversed_of is null and amount > 0) or (reversed_of is not null and amount < 0)
  )
);

create index manual_revenue_entries_date_idx on public.manual_revenue_entries (entry_date);

comment on table public.manual_revenue_entries is
  'Doanh thu nhập tay (không qua POS). Append-only — chỉ INSERT, chặn UPDATE/DELETE bằng trigger. Sửa sai bằng phiếu đảo (reversed_of).';

alter table public.manual_revenue_entries enable row level security;

create policy "manual_revenue_entries_select" on public.manual_revenue_entries
  for select to authenticated using (public.is_app_user());
create policy "manual_revenue_entries_insert" on public.manual_revenue_entries
  for insert to authenticated with check (public.is_app_user());

create trigger manual_revenue_entries_block_update
  before update on public.manual_revenue_entries
  for each row execute function public.trg_block_mutation();

create trigger manual_revenue_entries_block_delete
  before delete on public.manual_revenue_entries
  for each row execute function public.trg_block_mutation();

create or replace function public.generate_manual_revenue_entry_no(p_entry_date date)
returns text
language plpgsql
as $$
declare
  v_date_part text := to_char(p_entry_date, 'YYYYMMDD');
  v_seq int;
begin
  select count(*) + 1 into v_seq
  from public.manual_revenue_entries
  where to_char(entry_date, 'YYYYMMDD') = v_date_part;

  return 'DT' || v_date_part || '-' || lpad(v_seq::text, 3, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- ledger_periods: khóa/mở khóa kỳ kê khai. audit_log chưa tồn tại (Bước 1.7)
-- nên ghi trực tiếp unlocked_at/unlocked_by/unlock_reason lên bảng này.
-- ---------------------------------------------------------------------------
create table public.ledger_periods (
  id uuid primary key default gen_random_uuid(),
  period_type text not null check (period_type in ('month', 'quarter', 'year')),
  period_start date not null,
  period_end date not null,
  status text not null default 'open' check (status in ('open', 'locked')),
  locked_at timestamptz,
  locked_by uuid references public.app_users (id),
  lock_note text,
  unlocked_at timestamptz,
  unlocked_by uuid references public.app_users (id),
  unlock_reason text,
  created_at timestamptz not null default clock_timestamp(),
  unique (period_type, period_start, period_end)
);

alter table public.ledger_periods enable row level security;

create policy "ledger_periods_select" on public.ledger_periods
  for select to authenticated using (public.is_app_user());
create policy "ledger_periods_insert" on public.ledger_periods
  for insert to authenticated with check (public.is_app_user());
create policy "ledger_periods_update" on public.ledger_periods
  for update to authenticated using (public.is_app_user()) with check (public.is_app_user());

create or replace function public.assert_period_not_locked(p_at timestamptz)
returns void
language plpgsql
stable
as $$
declare
  v_date date := (p_at at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if exists (
    select 1 from public.ledger_periods
    where status = 'locked'
      and period_start <= v_date
      and period_end >= v_date
  ) then
    raise exception 'Kỳ kê khai chứa ngày % đã bị khóa, không thể tạo hoặc sửa dữ liệu', v_date;
  end if;
end;
$$;

comment on function public.assert_period_not_locked is
  'Chặn ghi dữ liệu mới nếu thời điểm (quy đổi ra ngày giờ Việt Nam) rơi vào một kỳ đã khóa. Gọi ở đầu các RPC ghi dữ liệu ảnh hưởng doanh thu/kho.';

create or replace function public.lock_period(
  p_period_type text,
  p_period_start date,
  p_period_end date,
  p_note text default null
) returns public.ledger_periods
language plpgsql
security invoker
as $$
declare
  v_period public.ledger_periods;
begin
  if p_period_type not in ('month', 'quarter', 'year') then
    raise exception 'Loại kỳ không hợp lệ: %', p_period_type;
  end if;
  if p_period_end < p_period_start then
    raise exception 'Ngày kết thúc kỳ phải sau ngày bắt đầu';
  end if;

  select * into v_period from public.ledger_periods
    where period_type = p_period_type and period_start = p_period_start and period_end = p_period_end
    for update;

  if found then
    if v_period.status = 'locked' then
      raise exception 'Kỳ này đã được khóa trước đó';
    end if;
    update public.ledger_periods
      set status = 'locked', locked_at = clock_timestamp(), locked_by = auth.uid(), lock_note = p_note,
          unlocked_at = null, unlocked_by = null, unlock_reason = null
      where id = v_period.id
    returning * into v_period;
  else
    insert into public.ledger_periods (period_type, period_start, period_end, status, locked_at, locked_by, lock_note)
    values (p_period_type, p_period_start, p_period_end, 'locked', clock_timestamp(), auth.uid(), p_note)
    returning * into v_period;
  end if;

  return v_period;
end;
$$;

comment on function public.lock_period is
  'Khóa một kỳ kê khai: chặn tạo/sửa dữ liệu doanh thu, kho, thu chi có ngày trong kỳ đó.';

grant execute on function public.lock_period(text, date, date, text) to authenticated;

create or replace function public.unlock_period(p_id uuid, p_reason text)
returns public.ledger_periods
language plpgsql
security invoker
as $$
declare
  v_period public.ledger_periods;
begin
  select * into v_period from public.ledger_periods where id = p_id for update;
  if not found then
    raise exception 'Không tìm thấy kỳ kê khai';
  end if;
  if v_period.status <> 'locked' then
    raise exception 'Kỳ này không ở trạng thái đã khóa';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'Phải nhập lý do mở khóa';
  end if;

  update public.ledger_periods
    set status = 'open', unlocked_at = clock_timestamp(), unlocked_by = auth.uid(), unlock_reason = p_reason
    where id = p_id
  returning * into v_period;

  return v_period;
end;
$$;

comment on function public.unlock_period is
  'Mở khóa một kỳ đã khóa — bắt buộc ghi lý do (audit_log chưa có ở bước này, lý do lưu trực tiếp trên ledger_periods).';

grant execute on function public.unlock_period(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: ghi nhận / đảo doanh thu nhập tay.
-- ---------------------------------------------------------------------------
create or replace function public.create_manual_revenue_entry(
  p_entry_date date,
  p_description text,
  p_amount bigint,
  p_payment_method text,
  p_tax_category_id uuid,
  p_evidence_note text default null
) returns public.manual_revenue_entries
language plpgsql
security invoker
as $$
declare
  v_entry public.manual_revenue_entries;
begin
  perform public.assert_period_not_locked(public.vn_day_start(p_entry_date));

  if p_description is null or btrim(p_description) = '' then
    raise exception 'Phải nhập diễn giải';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Số tiền phải lớn hơn 0';
  end if;
  if p_payment_method not in ('cash', 'transfer', 'other') then
    raise exception 'Hình thức thanh toán không hợp lệ: %', p_payment_method;
  end if;
  if not exists (select 1 from public.tax_categories where id = p_tax_category_id) then
    raise exception 'Nhóm ngành nghề tính thuế không tồn tại';
  end if;

  insert into public.manual_revenue_entries (
    entry_no, entry_date, description, amount, payment_method, tax_category_id, evidence_note
  ) values (
    public.generate_manual_revenue_entry_no(p_entry_date), p_entry_date, p_description, p_amount,
    p_payment_method, p_tax_category_id, p_evidence_note
  )
  returning * into v_entry;

  return v_entry;
end;
$$;

grant execute on function public.create_manual_revenue_entry(date, text, bigint, text, uuid, text) to authenticated;

create or replace function public.create_manual_revenue_entry_reversal(
  p_entry_id uuid,
  p_reason text
) returns public.manual_revenue_entries
language plpgsql
security invoker
as $$
declare
  v_original public.manual_revenue_entries;
  v_reversal public.manual_revenue_entries;
  v_today date := (clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  perform public.assert_period_not_locked(clock_timestamp());

  select * into v_original from public.manual_revenue_entries where id = p_entry_id;
  if not found then
    raise exception 'Không tìm thấy khoản doanh thu nhập tay';
  end if;
  if v_original.reversed_of is not null then
    raise exception 'Không thể tạo phiếu đảo cho một phiếu đảo khác';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'Phải nhập lý do tạo phiếu đảo';
  end if;
  if exists (select 1 from public.manual_revenue_entries where reversed_of = p_entry_id) then
    raise exception 'Khoản này đã có phiếu đảo';
  end if;

  insert into public.manual_revenue_entries (
    entry_no, entry_date, description, amount, payment_method, tax_category_id, reversed_of
  ) values (
    public.generate_manual_revenue_entry_no(v_today), v_today,
    'Đảo phiếu ' || v_original.entry_no || ': ' || p_reason,
    -v_original.amount, v_original.payment_method, v_original.tax_category_id, v_original.id
  )
  returning * into v_reversal;

  return v_reversal;
end;
$$;

grant execute on function public.create_manual_revenue_entry_reversal(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- revenue_ledger_lines: gộp doanh thu đơn hàng hoàn thành (theo dòng hàng, trừ
-- trả hàng) + doanh thu nhập tay. Ngày tính theo completed_at/occurred_at của
-- từng dòng (giờ Việt Nam) — ĐÚNG quy ước trả hàng ở Bước 1.3b: trả hàng tính
-- vào ngày phát sinh việc trả, không phải ngày bán gốc.
-- ---------------------------------------------------------------------------
create view public.revenue_ledger_lines as
select
  oi.id as source_id,
  'order_item'::text as source_type,
  o.completed_at as occurred_at,
  o.order_no as doc_no,
  oi.product_name_snapshot as description,
  oi.net_amount as amount,
  oi.tax_category_id_snapshot as tax_category_id
from public.order_items oi
join public.orders o on o.id = oi.order_id
where o.status = 'completed'

union all

select
  ori.id as source_id,
  'order_return_item'::text as source_type,
  orr.occurred_at,
  orr.return_no as doc_no,
  oi.product_name_snapshot as description,
  ori.net_amount as amount,
  oi.tax_category_id_snapshot as tax_category_id
from public.order_return_items ori
join public.order_returns orr on orr.id = ori.order_return_id
join public.order_items oi on oi.id = ori.order_item_id

union all

select
  mre.id as source_id,
  'manual_revenue_entry'::text as source_type,
  public.vn_day_start(mre.entry_date) as occurred_at,
  mre.entry_no as doc_no,
  mre.description,
  mre.amount,
  mre.tax_category_id
from public.manual_revenue_entries mre;

comment on view public.revenue_ledger_lines is
  'Sổ doanh thu gộp: đơn hoàn thành (theo dòng hàng) trừ trả hàng, cộng doanh thu nhập tay. Nguồn cho sổ S2a-HKD và bảng hỗ trợ kê khai.';

-- ---------------------------------------------------------------------------
-- revenue_by_tax_category: tổng hợp doanh thu + thuế tạm tính theo nhóm ngành
-- nghề cho một khoảng ngày (dùng tỷ lệ có hiệu lực tại period_end).
-- ---------------------------------------------------------------------------
create or replace function public.revenue_by_tax_category(p_period_start date, p_period_end date)
returns table (
  tax_category_id uuid,
  tax_category_name text,
  tax_category_code text,
  revenue bigint,
  gtgt_rate numeric,
  tncn_rate numeric,
  gtgt_amount bigint,
  tncn_amount bigint
)
language plpgsql
stable
as $$
declare
  v_tc record;
  v_revenue bigint;
  v_rates jsonb;
  v_gtgt numeric;
  v_tncn numeric;
begin
  for v_tc in select id, name, code from public.tax_categories order by name loop
    select coalesce(sum(rll.amount), 0) into v_revenue
    from public.revenue_ledger_lines rll
    where rll.tax_category_id = v_tc.id
      and rll.occurred_at >= public.vn_day_start(p_period_start)
      and rll.occurred_at < public.vn_day_end_exclusive(p_period_end);

    if v_revenue = 0 then
      continue;
    end if;

    v_rates := public.get_tax_rule_value('tax_category_rate:' || v_tc.id::text, p_period_end);
    v_gtgt := coalesce((v_rates ->> 'gtgt_rate')::numeric, 0);
    v_tncn := coalesce((v_rates ->> 'tncn_rate')::numeric, 0);

    tax_category_id := v_tc.id;
    tax_category_name := v_tc.name;
    tax_category_code := v_tc.code;
    revenue := v_revenue;
    gtgt_rate := v_gtgt;
    tncn_rate := v_tncn;
    gtgt_amount := round(v_revenue * v_gtgt)::bigint;
    tncn_amount := round(v_revenue * v_tncn)::bigint;

    return next;
  end loop;
end;
$$;

comment on function public.revenue_by_tax_category is
  'Doanh thu và thuế GTGT/TNCN tạm tính theo nhóm ngành nghề cho một khoảng ngày — tỷ lệ lấy có hiệu lực tại ngày cuối kỳ (period_end).';

grant execute on function public.revenue_by_tax_category(date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Thêm kiểm tra khóa kỳ vào các RPC ghi dữ liệu đã có từ trước (Bước 1.2-1.5).
-- Chỉ thêm một dòng perform assert_period_not_locked(...) ở đầu mỗi hàm, giữ
-- nguyên toàn bộ phần còn lại.
-- ---------------------------------------------------------------------------

-- complete_order: khóa kiểm tra tại thời điểm hoàn tất (completed_at = clock_timestamp()).
create or replace function public.complete_order(
  p_order_id uuid,
  p_payments jsonb
) returns public.orders
language plpgsql
security invoker
as $$
declare
  v_order public.orders;
  v_item record;
  v_warehouse_id uuid;
  v_allow_negative boolean;
  v_on_hand numeric(14, 3);
  v_avg_cost bigint;
  v_payment jsonb;
  v_paid_total bigint := 0;
  v_amount bigint;
  v_method text;
  v_line_count int;
  v_line_idx int := 0;
  v_running_discount bigint := 0;
  v_resolved_counter uuid;
  v_counter_name text;
  v_gross bigint;
  v_allocated bigint;
begin
  perform public.assert_period_not_locked(clock_timestamp());

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Không tìm thấy đơn hàng';
  end if;
  if v_order.status <> 'draft' then
    raise exception 'Chỉ hoàn tất được đơn còn ở trạng thái nháp';
  end if;
  if not exists (select 1 from public.order_items where order_id = p_order_id) then
    raise exception 'Đơn hàng chưa có sản phẩm nào';
  end if;

  select id into v_warehouse_id from public.warehouses where is_default = true;
  select allow_negative_stock into v_allow_negative from public.app_settings where id = true;

  for v_item in
    select oi.id, oi.product_id, oi.quantity, p.track_stock
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = p_order_id
  loop
    if v_item.track_stock then
      select cost_price into v_avg_cost from public.products where id = v_item.product_id for update;

      if not v_allow_negative then
        v_on_hand := public.stock_on_hand(v_warehouse_id, v_item.product_id);
        if v_on_hand - v_item.quantity < 0 then
          raise exception 'Sản phẩm % không đủ tồn để bán (tồn %, cần %)',
            v_item.product_id, v_on_hand, v_item.quantity;
        end if;
      end if;

      insert into public.stock_movements (
        warehouse_id, product_id, movement_type, quantity, unit_cost, avg_cost_after,
        ref_type, ref_id, occurred_at, note
      ) values (
        v_warehouse_id, v_item.product_id, 'sale_out', -v_item.quantity, v_avg_cost, v_avg_cost,
        'order', p_order_id, clock_timestamp(), null
      );

      update public.order_items set unit_cost_snapshot = v_avg_cost where id = v_item.id;
    end if;
  end loop;

  select count(*) into v_line_count from public.order_items where order_id = p_order_id;

  for v_item in
    select id, product_id, quantity, unit_price, discount, line_total
    from public.order_items
    where order_id = p_order_id
    order by created_at, id
  loop
    v_line_idx := v_line_idx + 1;
    v_resolved_counter := public.resolve_counter(v_item.product_id);
    select name into v_counter_name from public.counters where id = v_resolved_counter;
    v_gross := round(v_item.quantity * v_item.unit_price)::bigint;

    if v_order.subtotal = 0 or v_order.discount_total = 0 then
      v_allocated := 0;
    elsif v_line_idx = v_line_count then
      v_allocated := v_order.discount_total - v_running_discount;
    else
      v_allocated := round(v_order.discount_total * v_item.line_total::numeric / v_order.subtotal)::bigint;
      v_running_discount := v_running_discount + v_allocated;
    end if;

    update public.order_items
      set counter_id = v_resolved_counter,
          counter_name_snapshot = coalesce(v_counter_name, 'Chưa gán quầy'),
          gross_amount = v_gross,
          allocated_order_discount = v_allocated,
          net_amount = v_gross - v_item.discount - v_allocated
      where id = v_item.id;
  end loop;

  for v_payment in select * from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb))
  loop
    v_method := v_payment ->> 'method';
    v_amount := (v_payment ->> 'amount')::bigint;

    if v_amount is null or v_amount <= 0 then
      raise exception 'Số tiền thanh toán phải lớn hơn 0';
    end if;
    if v_method not in ('cash', 'transfer', 'other') then
      raise exception 'Hình thức thanh toán không hợp lệ: %', v_method;
    end if;

    insert into public.payments (order_id, method, amount, note)
    values (p_order_id, v_method, v_amount, v_payment ->> 'note');

    v_paid_total := v_paid_total + v_amount;
  end loop;

  update public.orders
    set status = 'completed',
        completed_at = clock_timestamp(),
        paid_total = v_paid_total,
        debt_total = greatest(total - v_paid_total, 0)
    where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

-- cancel_order: khóa kiểm tra tại thời điểm hủy (dòng đảo kho dùng clock_timestamp()).
create or replace function public.cancel_order(
  p_order_id uuid,
  p_reason text
) returns public.orders
language plpgsql
security invoker
as $$
declare
  v_order public.orders;
  v_movement record;
begin
  perform public.assert_period_not_locked(clock_timestamp());

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Không tìm thấy đơn hàng';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'Đơn đã được hủy trước đó';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'Phải nhập lý do hủy đơn';
  end if;

  if v_order.status = 'completed' then
    for v_movement in
      select * from public.stock_movements where ref_type = 'order' and ref_id = p_order_id
    loop
      insert into public.stock_movements (
        warehouse_id, product_id, movement_type, quantity, unit_cost, avg_cost_after,
        ref_type, ref_id, occurred_at, note
      ) values (
        v_movement.warehouse_id, v_movement.product_id, 'adjust_in', -v_movement.quantity,
        v_movement.unit_cost, v_movement.unit_cost,
        'order_cancel', p_order_id, clock_timestamp(), 'Hủy đơn ' || v_order.order_no || ': ' || p_reason
      );
    end loop;
  end if;

  update public.orders
    set status = 'cancelled', cancelled_at = clock_timestamp(), cancel_reason = p_reason
    where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

-- create_return: khóa kiểm tra tại thời điểm trả hàng (order_returns.occurred_at = clock_timestamp()).
create or replace function public.create_return(
  p_order_id uuid,
  p_lines jsonb,
  p_reason text
) returns public.order_returns
language plpgsql
security invoker
as $$
declare
  v_order public.orders;
  v_return public.order_returns;
  v_line jsonb;
  v_order_item record;
  v_quantity numeric(14, 3);
  v_already_returned numeric(14, 3);
  v_effective_unit_price numeric;
  v_amount bigint;
  v_total_amount bigint := 0;
  v_warehouse_id uuid;
  v_return_gross bigint;
  v_return_net bigint;
begin
  perform public.assert_period_not_locked(clock_timestamp());

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Không tìm thấy đơn hàng';
  end if;
  if v_order.status <> 'completed' then
    raise exception 'Chỉ trả hàng được cho đơn đã hoàn tất';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'Phải nhập lý do trả hàng';
  end if;
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Phải chọn ít nhất một dòng hàng để trả';
  end if;

  select id into v_warehouse_id from public.warehouses where is_default = true;

  insert into public.order_returns (return_no, order_id, reason, total_amount)
  values (public.generate_return_no(clock_timestamp()), p_order_id, p_reason, 0)
  returning * into v_return;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_quantity := (v_line ->> 'quantity')::numeric(14, 3);
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Số lượng trả phải lớn hơn 0';
    end if;

    select oi.id, oi.product_id, oi.product_name_snapshot, oi.quantity, oi.unit_price, oi.line_total,
           oi.unit_cost_snapshot, oi.counter_id, oi.counter_name_snapshot, oi.net_amount, p.track_stock
      into v_order_item
      from public.order_items oi
      join public.products p on p.id = oi.product_id
      where oi.id = (v_line ->> 'order_item_id')::uuid and oi.order_id = p_order_id;
    if not found then
      raise exception 'Dòng hàng không tồn tại trong đơn này';
    end if;

    select coalesce(sum(ori.quantity), 0) into v_already_returned
      from public.order_return_items ori
      where ori.order_item_id = v_order_item.id;

    if v_quantity > (v_order_item.quantity - v_already_returned) then
      raise exception 'Số lượng trả vượt quá số lượng còn có thể trả của dòng %',
        v_order_item.product_name_snapshot;
    end if;

    v_effective_unit_price := v_order_item.line_total::numeric / v_order_item.quantity;
    v_amount := round(v_quantity * v_effective_unit_price);
    v_return_gross := -round(v_quantity * v_order_item.unit_price)::bigint;
    v_return_net := -round(v_quantity * coalesce(v_order_item.net_amount, 0)::numeric / v_order_item.quantity)::bigint;

    insert into public.order_return_items (
      order_return_id, order_item_id, quantity, amount,
      counter_id, counter_name_snapshot, gross_amount, net_amount
    )
    values (
      v_return.id, v_order_item.id, v_quantity, v_amount,
      v_order_item.counter_id, v_order_item.counter_name_snapshot, v_return_gross, v_return_net
    );

    if v_order_item.track_stock then
      insert into public.stock_movements (
        warehouse_id, product_id, movement_type, quantity, unit_cost, avg_cost_after,
        ref_type, ref_id, occurred_at, note
      ) values (
        v_warehouse_id, v_order_item.product_id, 'return_in', v_quantity,
        coalesce(v_order_item.unit_cost_snapshot, 0), coalesce(v_order_item.unit_cost_snapshot, 0),
        'order_return', v_return.id, clock_timestamp(), 'Trả hàng đơn ' || v_order.order_no
      );
    end if;

    v_total_amount := v_total_amount + v_amount;
  end loop;

  update public.order_returns set total_amount = v_total_amount where id = v_return.id
  returning * into v_return;

  return v_return;
end;
$$;

-- post_stock_document: khóa kiểm tra theo đúng ngày người dùng nhập (p_occurred_at),
-- vì phiếu kho cho phép ghi lùi ngày.
create or replace function public.post_stock_document(
  p_doc_type text,
  p_warehouse_id uuid,
  p_lines jsonb,
  p_contact_id uuid default null,
  p_occurred_at timestamptz default clock_timestamp(),
  p_note text default null
) returns public.stock_documents
language plpgsql
security invoker
as $$
declare
  v_doc public.stock_documents;
  v_line jsonb;
  v_product_id uuid;
  v_quantity numeric(14, 3);
  v_unit_cost bigint;
  v_line_note text;
  v_movement_type text;
  v_current_qty numeric(14, 3);
  v_current_avg bigint;
  v_new_avg bigint;
  v_allow_negative boolean;
  v_on_hand numeric(14, 3);
begin
  perform public.assert_period_not_locked(p_occurred_at);

  if p_doc_type not in ('purchase', 'issue', 'adjustment') then
    raise exception 'Loại phiếu không hợp lệ: %', p_doc_type;
  end if;

  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Phiếu phải có ít nhất một dòng hàng';
  end if;

  select allow_negative_stock into v_allow_negative from public.app_settings where id = true;

  insert into public.stock_documents (doc_no, doc_type, warehouse_id, contact_id, occurred_at, note, status)
  values (
    public.generate_stock_doc_no(p_doc_type, p_occurred_at),
    p_doc_type, p_warehouse_id, p_contact_id, p_occurred_at, p_note, 'posted'
  )
  returning * into v_doc;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_product_id := (v_line ->> 'product_id')::uuid;
    v_quantity := (v_line ->> 'quantity')::numeric(14, 3);
    v_unit_cost := case when v_line ->> 'unit_cost' is null then null else (v_line ->> 'unit_cost')::bigint end;
    v_line_note := v_line ->> 'note';

    if v_quantity is null or v_quantity = 0 then
      raise exception 'Số lượng dòng hàng không được bằng 0';
    end if;

    if p_doc_type in ('purchase', 'issue') and v_quantity <= 0 then
      raise exception 'Số lượng dòng hàng phải lớn hơn 0 cho phiếu nhập/xuất';
    end if;

    if p_doc_type = 'purchase' and (v_unit_cost is null or v_unit_cost < 0) then
      raise exception 'Phiếu nhập: phải có giá nhập hợp lệ cho từng dòng';
    end if;

    insert into public.stock_document_lines (stock_document_id, product_id, quantity, unit_cost, note)
    values (v_doc.id, v_product_id, v_quantity, v_unit_cost, v_line_note);

    select cost_price into v_current_avg from public.products where id = v_product_id for update;
    if not found then
      raise exception 'Sản phẩm không tồn tại: %', v_product_id;
    end if;

    if p_doc_type = 'purchase' then
      v_movement_type := 'purchase_in';
      v_current_qty := public.stock_on_hand_total(v_product_id, p_occurred_at);
      if v_current_qty + v_quantity <= 0 then
        v_new_avg := v_unit_cost;
      else
        v_new_avg := round((v_current_qty * v_current_avg + v_quantity * v_unit_cost) / (v_current_qty + v_quantity));
      end if;
    else
      v_new_avg := v_current_avg;
      v_unit_cost := v_current_avg;
      if p_doc_type = 'issue' then
        v_movement_type := 'adjust_out';
        v_quantity := -v_quantity;
      else
        v_movement_type := case when v_quantity > 0 then 'adjust_in' else 'adjust_out' end;
      end if;
    end if;

    if v_quantity < 0 and not v_allow_negative then
      v_on_hand := public.stock_on_hand(p_warehouse_id, v_product_id, p_occurred_at);
      if v_on_hand + v_quantity < 0 then
        raise exception 'Sản phẩm % không đủ tồn tại kho (tồn %, cần xuất %)',
          v_product_id, v_on_hand, -v_quantity;
      end if;
    end if;

    insert into public.stock_movements (
      warehouse_id, product_id, movement_type, quantity, unit_cost, avg_cost_after,
      ref_type, ref_id, occurred_at, note
    ) values (
      p_warehouse_id, v_product_id, v_movement_type, v_quantity, v_unit_cost, v_new_avg,
      'stock_document', v_doc.id, p_occurred_at, v_line_note
    );

    update public.products set cost_price = v_new_avg where id = v_product_id;
  end loop;

  return v_doc;
end;
$$;

-- void_stock_document: khóa kiểm tra tại thời điểm hủy (dòng đảo dùng clock_timestamp()).
create or replace function public.void_stock_document(
  p_document_id uuid,
  p_reason text
) returns public.stock_documents
language plpgsql
security invoker
as $$
declare
  v_doc public.stock_documents;
  v_line record;
  v_reversed_type text;
  v_reversed_qty numeric(14, 3);
  v_current_avg bigint;
  v_allow_negative boolean;
  v_on_hand numeric(14, 3);
begin
  perform public.assert_period_not_locked(clock_timestamp());

  select * into v_doc from public.stock_documents where id = p_document_id for update;
  if not found then
    raise exception 'Không tìm thấy phiếu';
  end if;
  if v_doc.status = 'voided' then
    raise exception 'Phiếu đã được hủy trước đó';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'Phải nhập lý do hủy phiếu';
  end if;

  select allow_negative_stock into v_allow_negative from public.app_settings where id = true;

  for v_line in
    select * from public.stock_movements
    where ref_type = 'stock_document' and ref_id = v_doc.id
    order by created_at
  loop
    v_reversed_qty := -v_line.quantity;
    v_reversed_type := case when v_reversed_qty > 0 then 'adjust_in' else 'adjust_out' end;

    select cost_price into v_current_avg from public.products where id = v_line.product_id for update;

    if v_reversed_qty < 0 and not v_allow_negative then
      v_on_hand := public.stock_on_hand(v_line.warehouse_id, v_line.product_id);
      if v_on_hand + v_reversed_qty < 0 then
        raise exception 'Không thể hủy phiếu: sản phẩm % sẽ bị âm tồn tại kho', v_line.product_id;
      end if;
    end if;

    insert into public.stock_movements (
      warehouse_id, product_id, movement_type, quantity, unit_cost, avg_cost_after,
      ref_type, ref_id, occurred_at, note
    ) values (
      v_line.warehouse_id, v_line.product_id, v_reversed_type, v_reversed_qty, v_current_avg, v_current_avg,
      'stock_document_void', v_doc.id, clock_timestamp(),
      'Hủy phiếu ' || v_doc.doc_no || ': ' || p_reason
    );
  end loop;

  update public.stock_documents
    set status = 'voided', voided_at = clock_timestamp(), voided_by = auth.uid(), void_reason = p_reason
    where id = v_doc.id
  returning * into v_doc;

  return v_doc;
end;
$$;

-- create_cash_entry: khóa kiểm tra theo đúng ngày người dùng nhập (p_occurred_at).
create or replace function public.create_cash_entry(
  p_kind text,
  p_category_id uuid,
  p_amount bigint,
  p_method text,
  p_occurred_at timestamptz,
  p_description text default null,
  p_contact_id uuid default null,
  p_evidence_note text default null
) returns public.cash_entries
language plpgsql
security invoker
as $$
declare
  v_entry public.cash_entries;
  v_category_kind text;
begin
  perform public.assert_period_not_locked(p_occurred_at);

  if p_kind not in ('income', 'expense') then
    raise exception 'Loại phiếu không hợp lệ: %', p_kind;
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Số tiền phải lớn hơn 0';
  end if;
  if p_method not in ('cash', 'transfer') then
    raise exception 'Hình thức thanh toán không hợp lệ: %', p_method;
  end if;

  select kind into v_category_kind from public.cash_categories where id = p_category_id;
  if not found then
    raise exception 'Danh mục không tồn tại';
  end if;
  if v_category_kind <> p_kind then
    raise exception 'Danh mục không khớp loại phiếu (thu/chi)';
  end if;

  insert into public.cash_entries (
    entry_no, kind, category_id, contact_id, amount, method, occurred_at, description, evidence_note
  ) values (
    public.generate_cash_entry_no(p_kind, p_occurred_at), p_kind, p_category_id, p_contact_id, p_amount,
    p_method, p_occurred_at, p_description, p_evidence_note
  )
  returning * into v_entry;

  return v_entry;
end;
$$;

-- create_cash_entry_reversal: khóa kiểm tra tại thời điểm đảo (occurred_at = clock_timestamp()).
create or replace function public.create_cash_entry_reversal(
  p_entry_id uuid,
  p_reason text
) returns public.cash_entries
language plpgsql
security invoker
as $$
declare
  v_original public.cash_entries;
  v_reversal public.cash_entries;
begin
  perform public.assert_period_not_locked(clock_timestamp());

  select * into v_original from public.cash_entries where id = p_entry_id;
  if not found then
    raise exception 'Không tìm thấy phiếu';
  end if;
  if v_original.reversed_of is not null then
    raise exception 'Không thể tạo phiếu đảo cho một phiếu đảo khác';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'Phải nhập lý do tạo phiếu đảo';
  end if;
  if exists (select 1 from public.cash_entries where reversed_of = p_entry_id) then
    raise exception 'Phiếu này đã có phiếu đảo';
  end if;

  insert into public.cash_entries (
    entry_no, kind, category_id, contact_id, amount, method, occurred_at, description, reversed_of
  ) values (
    public.generate_cash_entry_no(v_original.kind, clock_timestamp()), v_original.kind, v_original.category_id,
    v_original.contact_id, -v_original.amount, v_original.method, clock_timestamp(),
    'Đảo phiếu ' || v_original.entry_no || ': ' || p_reason, v_original.id
  )
  returning * into v_reversal;

  return v_reversal;
end;
$$;

-- approve_stocktake: khóa kiểm tra tại thời điểm duyệt (stock_movements dùng clock_timestamp()).
create or replace function public.approve_stocktake(p_stocktake_id uuid)
returns public.stocktakes
language plpgsql
security invoker
as $$
declare
  v_stocktake public.stocktakes;
  v_line record;
  v_allow_negative boolean;
  v_on_hand numeric(14, 3);
begin
  perform public.assert_period_not_locked(clock_timestamp());

  select * into v_stocktake from public.stocktakes where id = p_stocktake_id for update;
  if not found then
    raise exception 'Không tìm thấy phiên kiểm kho';
  end if;
  if v_stocktake.status <> 'counting' then
    raise exception 'Phiên kiểm kho không ở trạng thái đang kiểm, không thể duyệt';
  end if;

  if exists (select 1 from public.stocktake_lines where stocktake_id = p_stocktake_id and counted_qty is null) then
    raise exception 'Còn sản phẩm chưa đếm, không thể duyệt phiên kiểm kho';
  end if;

  select allow_negative_stock into v_allow_negative from public.app_settings where id = true;

  for v_line in
    select * from public.stocktake_lines
    where stocktake_id = p_stocktake_id and diff_qty <> 0
  loop
    if v_line.diff_qty < 0 and not v_allow_negative then
      v_on_hand := public.stock_on_hand(v_stocktake.warehouse_id, v_line.product_id);
      if v_on_hand + v_line.diff_qty < 0 then
        raise exception 'Không thể duyệt: sản phẩm % sẽ bị âm tồn tại kho', v_line.product_id;
      end if;
    end if;

    insert into public.stock_movements (
      warehouse_id, product_id, movement_type, quantity, unit_cost, avg_cost_after,
      ref_type, ref_id, occurred_at, note
    ) values (
      v_stocktake.warehouse_id, v_line.product_id, 'stocktake_adjust', v_line.diff_qty,
      v_line.unit_cost, v_line.unit_cost, 'stocktake', v_stocktake.id, clock_timestamp(),
      coalesce(v_line.reason, 'Điều chỉnh theo kiểm kê ' || v_stocktake.stocktake_no)
    );
  end loop;

  update public.stocktakes
    set status = 'approved', approved_by = auth.uid(), approved_at = clock_timestamp()
    where id = p_stocktake_id
  returning * into v_stocktake;

  return v_stocktake;
end;
$$;
