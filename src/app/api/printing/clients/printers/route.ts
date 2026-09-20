import { NextResponse } from "next/server";
import { authenticatePrintClient } from "@/printing/clients/authenticate";
import { registerInventory } from "@/printing/clients/db_repository";
import { PrinterInventorySchema } from "@/printing/clients/schema";
import { registerPrinterInventory } from "@/printing/clients/use-cases/register-printer-inventory";
import { notifyKitchenChanged } from "@/kitchen/notifications";

export async function POST(request: Request) {
  const auth = await authenticatePrintClient(
    request.headers.get("authorization"),
  );
  if (!auth.success) return NextResponse.json(auth, { status: 401 });
  const parsed = PrinterInventorySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Inventario invalido" },
      { status: 400 },
    );
  }
  const result = await registerPrinterInventory(
    { registerInventory, now: () => new Date() },
    auth.data,
    parsed.data,
  );
  if (result.success)
    await notifyKitchenChanged(
      auth.data.companyId,
      "printer-inventory-updated",
    ).catch(() => undefined);
  return NextResponse.json(result, { status: result.success ? 200 : 401 });
}
