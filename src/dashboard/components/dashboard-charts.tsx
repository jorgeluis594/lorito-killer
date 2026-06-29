"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  PaymentMethodBreakdown,
  SalesTrendPoint,
  TopProductRow,
} from "@/dashboard/types";
import {
  formatDashboardCurrency,
  formatDashboardNumber,
} from "@/dashboard/components/formatters";

type TooltipPayload = {
  payload: Record<string, unknown>;
};

function DashboardTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-md border bg-background p-3 text-sm shadow-sm">
      <p className="font-medium">{String(data.label || data.name || "")}</p>
      {"total" in data ? (
        <p className="text-muted-foreground">
          Monto: {formatDashboardCurrency(Number(data.total))}
        </p>
      ) : null}
      {"count" in data ? (
        <p className="text-muted-foreground">Ventas: {String(data.count)}</p>
      ) : null}
      {"quantity" in data ? (
        <p className="text-muted-foreground">
          Cantidad: {formatDashboardNumber(Number(data.quantity))}
        </p>
      ) : null}
    </div>
  );
}

export function SalesTrendChart({ data }: { data: SalesTrendPoint[] }) {
  return (
    <div className="min-w-0 w-full">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            yAxisId="left"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `S/ ${Number(value).toFixed(0)}`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<DashboardTooltip />} />
          <Bar
            yAxisId="left"
            dataKey="total"
            name="Monto"
            fill="#2563eb"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="right"
            dataKey="count"
            name="Ventas"
            fill="#16a34a"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PaymentMethodChart({
  data,
}: {
  data: PaymentMethodBreakdown[];
}) {
  return (
    <div className="min-w-0 w-full">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `S/ ${Number(value).toFixed(0)}`}
          />
          <YAxis
            dataKey="label"
            type="category"
            width={120}
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<DashboardTooltip />} />
          <Bar dataKey="total" fill="#7c3aed" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopProductsChart({
  data,
  mode,
}: {
  data: TopProductRow[];
  mode: "amount" | "quantity";
}) {
  return (
    <div className="min-w-0 w-full">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) =>
              mode === "amount"
                ? `S/ ${Number(value).toFixed(0)}`
                : String(value)
            }
          />
          <YAxis
            dataKey="name"
            type="category"
            width={130}
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<DashboardTooltip />} />
          <Bar
            dataKey={mode === "amount" ? "total" : "quantity"}
            fill={mode === "amount" ? "#0891b2" : "#ea580c"}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
