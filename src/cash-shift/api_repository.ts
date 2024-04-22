import type { CashShiftWithOutOrders, OpenCashShift } from "@/cash-shift/types";
import { response } from "@/lib/types";

export async function getManyCashShifts(): Promise<
  response<CashShiftWithOutOrders[]>
> {
  const response = await fetch("/api/cash_shifts");
  if (!response.ok) {
    return { success: false, message: "Error cargando caja chicas" };
  }

  return await response.json();
}

export const getLastOpenCashShift = async (): Promise<
  response<OpenCashShift>
> => {
  const response = await fetch("/api/cash_shifts/last_open");

  if (response.status === 401) {
    return {
      success: false,
      message: "Usuario no autenticado",
      type: "AuthError",
    };
  }

  if (response.status === 404) {
    return { success: false, message: "No hay caja chica abierta" };
  }

  if (!response.ok) {
    return { success: false, message: "Error cargando caja chica" };
  }

  const openCashShiftResponse =
    (await response.json()) as response<OpenCashShift>;
  if (!openCashShiftResponse.success) {
    return { success: false, message: openCashShiftResponse.message };
  }

  return {
    ...openCashShiftResponse,
    data: {
      ...openCashShiftResponse.data,
      orders: [
        ...openCashShiftResponse.data.orders.map((o) => ({
          ...o,
          createdAt: new Date(o.createdAt as unknown as string),
        })),
      ],
      createdAt: new Date(
        openCashShiftResponse.data.createdAt as unknown as string,
      ),
    },
  };
};
