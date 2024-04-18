import { OpenCashShift } from "@/cash-shift/types";
import {
  createCashShift,
  getLastOpenCashShift,
} from "@/cash-shift/db_repository";
import { response } from "@/lib/types";

export default async function cashShiftCreator<T extends OpenCashShift>(
  cashShift: T,
): Promise<response<T>> {
  const foundCashShiftResponse = await getLastOpenCashShift(cashShift.userId);
  if (foundCashShiftResponse.success) {
    return { success: false, message: "Ya existe una caja abierta" };
  }

  return await createCashShift(cashShift);
}
