import { randomUUID } from "node:crypto";
import { vi } from "vitest";
import prisma from "@/lib/prisma";
import type { AuthorizedUser } from "@/authorization/server";
import { openServiceSession } from "@/delivery/db_repository";
import { validateDeliveryDetails } from "@/delivery/use-cases/validate-delivery-details";
import { updateTableDraft } from "@/table/draft-repository";
import { submitOrderRound } from "@/order/rounds/db_repository";
import { payTable } from "@/table/payment-repository";
import type { TablePaymentInput } from "@/table/payment-schema";
import { sendToTaxEntity } from "@/document/use_cases/send-to-tax-entity";
import { findDocumentById, updateDocument } from "@/document/db_repository";
import { find as findOrder } from "@/order/db_repository";
import factproGateway from "@/document/factpro/gateway";
import type { BillingCredentials } from "@/document/types";

/**
 * Datos base de §11.1: producto A S/ 30 con stock 10 y estación Cocina,
 * B S/ 20 sin stock en Barra, C S/ 15 sin estación, envío S/ 5.
 */
export type RestaurantFixture = Awaited<ReturnType<typeof createFixture>>;

const billing = {
  billingToken: "test-token",
  customerSearchToken: "test",
  ticketSerialNumber: "NV01",
  receiptSerialNumber: "B001",
  invoiceSerialNumber: "F001",
  establishmentCode: "0000",
} satisfies BillingCredentials;

export async function createFixture(label: string) {
  const suffix = randomUUID();
  const ids = {
    company: randomUUID(),
    admin: randomUUID(),
    cashier: randomUUID(),
    seller: randomUUID(),
    waiter: randomUUID(),
    cashShift: randomUUID(),
    client: randomUUID(),
    printer: randomUUID(),
    kitchen: randomUUID(),
    bar: randomUUID(),
    productA: randomUUID(),
    productB: randomUUID(),
    productC: randomUUID(),
  };
  const db = prisma();
  await db.company.create({
    data: {
      id: ids.company,
      address: "QA",
      active: true,
      billingCredentials: billing,
    },
  });
  await db.companyFeature.create({
    data: { companyId: ids.company, key: "restaurants", enabled: true },
  });
  const roles = [
    ["admin", "ADMIN"],
    ["cashier", "CASHIER"],
    ["seller", "SELLER"],
    ["waiter", "WAITER"],
  ] as const;
  await db.user.createMany({
    data: roles.map(([key, role]) => ({
      id: ids[key],
      companyId: ids.company,
      email: `${label}-${key}-${suffix}@example.test`,
      password: "test",
      name: key,
      role,
    })),
  });
  await db.cashShift.create({
    data: {
      id: ids.cashShift,
      userId: ids.cashier,
      companyId: ids.company,
      initialAmount: 100,
      status: "OPEN",
      openedAt: new Date(),
    },
  });
  await db.printClient.create({
    data: {
      id: ids.client,
      companyId: ids.company,
      machineName: "QA",
      credentialHash: suffix,
      lastSeenAt: new Date(),
    },
  });
  await db.printer.create({
    data: {
      id: ids.printer,
      companyId: ids.company,
      printClientId: ids.client,
      localName: "QA printer",
      lastDetectedAt: new Date(),
    },
  });
  await db.kitchen.createMany({
    data: [
      {
        id: ids.kitchen,
        companyId: ids.company,
        name: "Cocina",
        printerId: ids.printer,
      },
      { id: ids.bar, companyId: ids.company, name: "Barra" },
    ],
  });
  await db.product.createMany({
    data: [
      {
        id: ids.productA,
        companyId: ids.company,
        name: "Producto A",
        sku: "PA",
        description: "",
        price: 30,
        productType: "SINGLE_PRODUCT",
        unitType: "UNIT",
        stock: 10,
        purchasePrice: 10,
        kitchenId: ids.kitchen,
      },
      {
        id: ids.productB,
        companyId: ids.company,
        name: "Producto B",
        description: "",
        price: 20,
        productType: "DISH",
        kitchenId: ids.bar,
      },
      {
        id: ids.productC,
        companyId: ids.company,
        name: "Producto C",
        description: "",
        price: 15,
        productType: "DISH",
      },
    ],
  });

  const user = (key: "admin" | "cashier" | "seller" | "waiter") =>
    ({
      id: ids[key],
      companyId: ids.company,
      email: `${label}-${key}-${suffix}@example.test`,
      name: key,
      role: roles.find(([k]) => k === key)![1],
      active: true,
    }) satisfies AuthorizedUser;

  const orderIds: string[] = [];
  const sessionIds = new Map<string, string>();
  const sessionOf = (orderId: string) => sessionIds.get(orderId)!;

  type Line = { productId: string; quantity: number; notes?: string };
  const defaultDelivery = {
    name: "Maria Quispe",
    phone: "987654321",
    address: "Av. Los Olivos 123, Lima",
    reference: "Casa de reja negra",
    fee: 5,
  };

  /** Guarda el borrador y lo envía, como la toma de pedido de Mesas. */
  async function addRound(
    orderId: string,
    items: Line[],
    by: "admin" | "seller" | "waiter" = "seller",
  ) {
    const sessionId = sessionOf(orderId);
    const session = await db.tableSession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    const saved = await updateTableDraft({
      companyId: ids.company,
      userId: ids[by],
      sessionId,
      revision: session.draftRevision,
      operation: "save",
      items,
    });
    if (!saved.success) return saved;
    return submitOrderRound({
      companyId: ids.company,
      userId: ids[by],
      roundId: randomUUID(),
      items,
      sessionId,
      draftRevision: saved.data.revision,
    });
  }

  /** Abre la sesión sin mesa; sin productos queda como una apertura vacía. */
  async function openOrder(
    options: {
      orderType?: "DELIVERY" | "TAKE_AWAY";
      delivery?: Record<string, unknown>;
      by?: "admin" | "seller" | "waiter";
    } = {},
  ) {
    let delivery = null;
    if ((options.orderType ?? "DELIVERY") === "DELIVERY") {
      const details = validateDeliveryDetails(
        options.delivery ?? defaultDelivery,
      );
      if (!details.success) throw new Error(details.message);
      delivery = details.data;
    }
    const opened = await openServiceSession({
      companyId: ids.company,
      userId: ids[options.by ?? "seller"],
      delivery,
    });
    if (!opened.success) throw new Error(opened.message);
    const order = await db.order.findFirstOrThrow({
      where: { tableSessionId: opened.data.sessionId },
    });
    orderIds.push(order.id);
    sessionIds.set(order.id, opened.data.sessionId);
    return order.id;
  }

  async function createOrder(options: {
    items?: Line[];
    orderType?: "DELIVERY" | "TAKE_AWAY";
    delivery?: Record<string, unknown>;
    by?: "admin" | "seller" | "waiter";
  }) {
    const orderId = await openOrder(options);
    const result = await addRound(
      orderId,
      options.items ?? [
        { productId: ids.productA, quantity: 1 },
        { productId: ids.productB, quantity: 1 },
      ],
      options.by,
    );
    if (!result.success) throw new Error(result.message);
    return orderId;
  }

  async function paymentInput(
    orderId: string,
    overrides: Partial<TablePaymentInput> = {},
  ): Promise<TablePaymentInput> {
    const order = await db.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { tableSession: true },
    });
    return {
      sessionId: order.tableSessionId!,
      revision: order.tableSession!.draftRevision,
      orderVersion: order.updatedAt.toISOString(),
      expectedTotal: order.total.toNumber(),
      cashShiftId: ids.cashShift,
      method: "debit_card",
      receipt: { documentType: "receipt" },
      ...overrides,
    };
  }

  const pay = async (
    orderId: string,
    overrides: Partial<TablePaymentInput> = {},
    by: "admin" | "cashier" = "cashier",
  ) => payTable(user(by), await paymentInput(orderId, overrides));

  const invoiceReceipt = {
    documentType: "invoice" as const,
    customer: {
      documentType: "RUC" as const,
      documentNumber: "20123456789",
      legalName: "Empresa Cliente SAC",
      address: "Av. Fiscal 456",
    },
  };

  const documentFor = (orderId: string) =>
    db.document.findFirstOrThrow({ where: { orderId } });

  /** Envía el documento a FactPro con un `fetch` doble y devuelve el cuerpo. */
  async function sendToFactpro(documentId: string, factproOk = true) {
    const bodies: Record<string, any>[] = [];
    const fetchMock = vi.fn(async (_url: unknown, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(
        JSON.stringify(
          factproOk
            ? {
                success: true,
                data: {
                  number: "1",
                  filename: "f",
                  external_id: "e",
                  number_to_letter: "n",
                  hash: "hash",
                  qr: "qr",
                },
                links: { xml: "xml", pdf: "pdf", cdr: "cdr" },
              }
            : { success: false, message: "Rechazado en prueba" },
        ),
        { status: factproOk ? 200 : 400 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      const result = await sendToTaxEntity(
        factproGateway({ billingToken: billing.billingToken }),
        { updateDocument, findDocument: findDocumentById, getOrder: findOrder },
        documentId,
        billing,
        undefined,
        { notifyOnFailure: false },
      );
      return { result, bodies };
    } finally {
      vi.unstubAllGlobals();
    }
  }

  const stockA = async () =>
    (
      await db.product.findUniqueOrThrow({ where: { id: ids.productA } })
    ).stock?.toNumber();
  const setStockA = (stock: number) =>
    db.product.update({ where: { id: ids.productA }, data: { stock } });

  async function destroy() {
    await db.kitchetTicketPrintJob.deleteMany({
      where: { companyId: ids.company },
    });
    await db.kitchenTicket.deleteMany({
      where: { orderRound: { orderId: { in: orderIds } } },
    });
    await db.orderItemCancellation.deleteMany({
      where: { orderRoundItem: { orderRound: { orderId: { in: orderIds } } } },
    });
    await db.orderRoundItem.deleteMany({
      where: { orderRound: { orderId: { in: orderIds } } },
    });
    await db.stockTransfer.deleteMany({ where: { companyId: ids.company } });
    await db.documentTaxDispatch.deleteMany({
      where: { companyId: ids.company },
    });
    await db.document.deleteMany({ where: { companyId: ids.company } });
    await db.payment.deleteMany({ where: { orderId: { in: orderIds } } });
    await db.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await db.orderRound.deleteMany({ where: { orderId: { in: orderIds } } });
    await db.delivery.deleteMany({ where: { orderId: { in: orderIds } } });
    await db.order.deleteMany({ where: { id: { in: orderIds } } });
    await db.tableSession.deleteMany({ where: { companyId: ids.company } });
    await db.customer.deleteMany({ where: { companyId: ids.company } });
    await db.cashShift.deleteMany({ where: { companyId: ids.company } });
    await db.product.deleteMany({ where: { companyId: ids.company } });
    await db.kitchen.deleteMany({ where: { companyId: ids.company } });
    await db.printer.deleteMany({ where: { companyId: ids.company } });
    await db.printClient.deleteMany({ where: { companyId: ids.company } });
    await db.companyFeature.deleteMany({ where: { companyId: ids.company } });
    await db.user.deleteMany({ where: { companyId: ids.company } });
    await db.company.delete({ where: { id: ids.company } });
  }

  return {
    ids,
    orderIds,
    sessionOf,
    user,
    openOrder,
    addRound,
    createOrder,
    paymentInput,
    pay,
    invoiceReceipt,
    documentFor,
    sendToFactpro,
    stockA,
    setStockA,
    destroy,
    billing,
    defaultDelivery,
  };
}
