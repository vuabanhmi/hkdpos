"use client";

import { formatDateTimeVN } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import type { OrderDetail } from "@/features/orders/actions/orders";

/** Bản in đơn giản bằng CSS print: chỉ phần này hiện ra khi in (window.print). */
export function OrderPrintView({ order }: { order: OrderDetail }) {
  return (
    <div className="hidden print:block">
      <h1 className="text-lg font-semibold">HÓA ĐƠN BÁN HÀNG</h1>
      <p>Số đơn: {order.orderNo}</p>
      <p>Thời điểm: {formatDateTimeVN(new Date(order.orderedAt))}</p>
      <p>Khách hàng: {order.contactName ?? "Khách lẻ"}</p>
      <table className="mt-3 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-1 text-left">Sản phẩm</th>
            <th className="py-1 text-right">SL</th>
            <th className="py-1 text-right">Đơn giá</th>
            <th className="py-1 text-right">Giảm</th>
            <th className="py-1 text-right">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="py-1">{item.productName}</td>
              <td className="py-1 text-right">{item.quantity}</td>
              <td className="py-1 text-right">{formatMoney(item.unitPrice)}</td>
              <td className="py-1 text-right">{formatMoney(item.discount)}</td>
              <td className="py-1 text-right">{formatMoney(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 space-y-1 text-right text-sm">
        <p>Tạm tính: {formatMoney(order.subtotal)}</p>
        <p>Giảm giá: {formatMoney(order.discountTotal)}</p>
        <p className="text-base font-semibold">Tổng cộng: {formatMoney(order.total)}</p>
        <p>Đã thanh toán: {formatMoney(order.paidTotal)}</p>
        {order.debtTotal > 0 ? <p>Còn nợ: {formatMoney(order.debtTotal)}</p> : null}
      </div>
    </div>
  );
}
