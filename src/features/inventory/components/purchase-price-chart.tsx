"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDateVN } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import type { StockCardRow } from "@/features/inventory/actions/inventory";

interface PurchasePriceChartProps {
  movements: StockCardRow[];
}

export function PurchasePriceChart({ movements }: PurchasePriceChartProps) {
  const purchases = movements
    .filter((m) => m.movementType === "purchase_in")
    .slice()
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

  if (purchases.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Chưa có lịch sử nhập hàng.</p>;
  }

  const data = purchases.map((m) => ({
    date: formatDateVN(new Date(m.occurredAt)),
    unitCost: m.unitCost,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" fontSize={12} />
          <YAxis fontSize={12} width={70} tickFormatter={(value: number) => formatMoney(value)} />
          <Tooltip
            formatter={(value) => formatMoney(Number(value))}
            labelFormatter={(label) => `Ngày ${label}`}
          />
          <Line type="monotone" dataKey="unitCost" stroke="var(--primary)" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
