"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDateVN } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import type { PriceHistoryRow } from "@/features/products/actions/price-lists";

interface PriceHistoryChartProps {
  history: PriceHistoryRow[];
}

export function PriceHistoryChart({ history }: PriceHistoryChartProps) {
  if (history.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Chưa có lịch sử giá.</p>;
  }

  const data = history.map((h) => ({
    date: formatDateVN(new Date(h.changedAt)),
    price: h.newPrice,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" fontSize={12} />
          <YAxis
            fontSize={12}
            width={70}
            tickFormatter={(value: number) => formatMoney(value)}
          />
          <Tooltip
            formatter={(value) => formatMoney(Number(value))}
            labelFormatter={(label) => `Ngày ${label}`}
          />
          <Line type="stepAfter" dataKey="price" stroke="var(--primary)" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
