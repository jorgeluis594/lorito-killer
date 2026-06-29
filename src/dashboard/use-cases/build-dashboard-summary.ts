import type { response } from "@/lib/types";
import {
  dashboardRepository,
  type DashboardRepository,
} from "@/dashboard/db_repository";
import type {
  DashboardModule,
  DashboardQuery,
  DashboardSummary,
  QuickAction,
} from "@/dashboard/types";

const moduleFromResponse = async <T,>(
  promise: Promise<response<T>>,
): Promise<DashboardModule<T>> => {
  try {
    const result = await promise;
    return result.success
      ? { status: "ready", data: result.data }
      : { status: "error", message: result.message };
  } catch {
    return {
      status: "error",
      message: "No pudimos cargar este resumen. Reintenta en unos segundos.",
    };
  }
};

export function buildQuickActions(restaurantsEnabled: boolean): QuickAction[] {
  const actions: QuickAction[] = [
    {
      title: "Nueva venta",
      description: "Crear y cobrar un pedido",
      href: "/dashboard/orders/new",
    },
    {
      title: "Reporte de ventas",
      description: "Ver comprobantes y ventas",
      href: "/dashboard/sales_reports",
    },
    {
      title: "Caja chica",
      description: "Controlar turnos y efectivo",
      href: "/dashboard/cash_shifts",
    },
    {
      title: "Comprobantes",
      description: "Revisar ventas emitidas",
      href: "/dashboard/orders",
    },
    {
      title: "Productos",
      description: "Gestionar catalogo y stock",
      href: "/dashboard/products",
    },
    {
      title: "Movimientos de stock",
      description: "Auditar entradas y salidas",
      href: "/dashboard/stock_adjustments",
    },
  ];

  if (restaurantsEnabled) {
    actions.push({
      title: "Mesas",
      description: "Ver salon y operaciones activas",
      href: "/dashboard/tables",
    });
  }

  return actions;
}

export async function buildDashboardSummary(
  query: DashboardQuery,
  repository: DashboardRepository = dashboardRepository,
): Promise<DashboardSummary> {
  const filters = await repository.findDashboardFilters(query);
  const filtersData = filters.success
    ? filters.data
    : { cashShifts: [], sellers: [], restaurantsEnabled: false };

  const [
    kpis,
    alerts,
    salesTrend,
    paymentBreakdown,
    topProductsByAmount,
    topProductsByQuantity,
    recentSales,
  ] = await Promise.all([
    moduleFromResponse(repository.findDashboardKpis(query)),
    moduleFromResponse(
      repository.findOperationalAlerts(query, {
        restaurantsEnabled: filtersData.restaurantsEnabled,
      }),
    ),
    moduleFromResponse(repository.findSalesTrend(query)),
    moduleFromResponse(repository.findPaymentBreakdown(query)),
    moduleFromResponse(repository.findTopProductsByAmount(query)),
    moduleFromResponse(repository.findTopProductsByQuantity(query)),
    moduleFromResponse(repository.findRecentSales(query)),
  ]);

  return {
    query,
    generatedAt: new Date(),
    filters: filtersData,
    modules: {
      kpis,
      alerts,
      salesTrend,
      paymentBreakdown,
      topProductsByAmount,
      topProductsByQuantity,
      recentSales,
      quickActions: {
        status: "ready",
        data: buildQuickActions(filtersData.restaurantsEnabled),
      },
    },
  };
}
