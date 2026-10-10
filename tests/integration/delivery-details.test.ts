import { randomUUID } from "node:crypto";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  broadcast: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSession: mocks.getSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// Captura cada evento de realtime sin red: canal, nombre y carga completos.
vi.mock("@/lib/realtime/config", () => ({
  getRealtimeProvider: async () => ({ broadcast: mocks.broadcast }),
}));

import prisma from "@/lib/prisma";
import { submitFulfillmentRound } from "@/order/rounds/fulfillment-repository";
import { confirmFulfillmentRound } from "@/order/rounds/fulfillment-actions";
import { confirmFulfillmentPayment } from "@/order/fulfillment-payment-actions";
import { deliverDelivery, dispatchDelivery } from "@/delivery/actions";

const suffix = randomUUID();
const ids = {
  company: randomUUID(),
  admin: randomUUID(),
  cashShift: randomUUID(),
  client: randomUUID(),
  printer: randomUUID(),
  kitchen: randomUUID(),
  bar: randomUUID(),
  productA: randomUUID(),
  productB: randomUUID(),
  productC: randomUUID(),
};
const orderIds: string[] = [];
const admin = {
  id: ids.admin,
  companyId: ids.company,
  role: "ADMIN",
  name: "Admin",
  email: `delivery-details-${suffix}@example.test`,
  active: true,
};

const baseDelivery = {
  name: "Maria Quispe",
  phone: "+51 987 654 321",
  address: "Av. Los Olivos 123, Lima",
  reference: "Casa de reja negra",
  fee: 5,
  expectedPaymentMethod: "CASH" as const,
  cashPaysWith: 100,
};

type Line = { productId: string; quantity: number; notes?: string };
const lines = (): Line[] => [
  { productId: ids.productA, quantity: 1, notes: "Sin sal" },
  { productId: ids.productB, quantity: 1 },
];

const create = (
  delivery: Record<string, unknown> | undefined,
  items: Line[] = lines(),
  orderType: "DELIVERY" | "TAKE_AWAY" = "DELIVERY",
) =>
  submitFulfillmentRound(ids.company, ids.admin, {
    roundId: randomUUID(),
    orderType,
    items,
    delivery,
  } as Parameters<typeof submitFulfillmentRound>[2]);

async function createOk(
  delivery: Record<string, unknown> | undefined = baseDelivery,
  items?: Line[],
  orderType?: "DELIVERY" | "TAKE_AWAY",
) {
  const result = await create(delivery, items, orderType);
  if (!result.success) throw new Error(result.message);
  orderIds.push(result.data.orderId);
  return result.data;
}

const stockA = async () =>
  (
    await prisma().product.findUniqueOrThrow({ where: { id: ids.productA } })
  ).stock?.toNumber();
const countOrders = () =>
  prisma().order.count({ where: { companyId: ids.company } });

async function footprint() {
  const db = prisma();
  return {
    orders: await countOrders(),
    deliveries: await db.delivery.count({
      where: { order: { companyId: ids.company } },
    }),
    rounds: await db.orderRound.count({
      where: { order: { companyId: ids.company } },
    }),
    tickets: await db.kitchenTicket.count({
      where: { orderRound: { order: { companyId: ids.company } } },
    }),
    transfers: await db.stockTransfer.count({
      where: { companyId: ids.company },
    }),
    stockA: await stockA(),
  };
}

let d1: Awaited<ReturnType<typeof createOk>>;

beforeAll(async () => {
  const db = prisma();
  await db.company.create({ data: { id: ids.company, address: "QA" } });
  await db.companyFeature.create({
    data: { companyId: ids.company, key: "restaurants", enabled: true },
  });
  await db.user.create({
    data: {
      id: ids.admin,
      companyId: ids.company,
      email: admin.email,
      password: "test",
      name: "Admin",
      role: "ADMIN",
    },
  });
  await db.cashShift.create({
    data: {
      id: ids.cashShift,
      userId: ids.admin,
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
        description: "",
        price: 30,
        productType: "SINGLE_PRODUCT",
        unitType: "UNIT",
        stock: 1000,
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
});

afterAll(async () => {
  const db = prisma();
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
  await db.document.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.orderRound.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.delivery.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.order.deleteMany({ where: { id: { in: orderIds } } });
  await db.cashShift.delete({ where: { id: ids.cashShift } });
  await db.product.deleteMany({ where: { companyId: ids.company } });
  await db.kitchen.deleteMany({ where: { companyId: ids.company } });
  await db.printer.delete({ where: { id: ids.printer } });
  await db.printClient.delete({ where: { id: ids.client } });
  await db.companyFeature.deleteMany({ where: { companyId: ids.company } });
  await db.user.delete({ where: { id: ids.admin } });
  await db.company.delete({ where: { id: ids.company } });
});

beforeEach(() => {
  mocks.getSession.mockResolvedValue({ user: admin });
  mocks.broadcast.mockReset();
  mocks.broadcast.mockResolvedValue(undefined);
});

describe("DEL-02 · datos de entrega y totalización", () => {
  test("D1 crea el Delivery completo con teléfono normalizado y total con envío", async () => {
    d1 = await createOk();
    const order = await prisma().order.findUniqueOrThrow({
      where: { id: d1.orderId },
      include: { delivery: true },
    });
    expect(order.delivery).toMatchObject({
      status: "PENDING",
      name: "Maria Quispe",
      phone: "987654321",
      address: "Av. Los Olivos 123, Lima",
      reference: "Casa de reja negra",
      expectedPaymentMethod: "CASH",
      createdById: ids.admin,
    });
    expect(order.delivery?.fee.toNumber()).toBe(5);
    expect(order.delivery?.cashPaysWith?.toNumber()).toBe(100);
    expect(order.total.toNumber()).toBe(55);
    expect(order.netTotal.toNumber()).toBe(55);
    expect(order.discountAmount.toNumber()).toBe(0);
    expect(order.paymentStatus).toBe("PENDING");
  });

  test.each(["name", "phone", "address", "fee"])(
    "D2 rechaza un Delivery sin %s sin crear filas ni descontar stock",
    async (field) => {
      const before = await footprint();
      const result = await create({ ...baseDelivery, [field]: undefined });
      expect(result.success).toBe(false);
      expect(!result.success && result.message.toLowerCase()).toContain(
        {
          name: "nombre",
          phone: "teléfono",
          address: "dirección",
          fee: "envío",
        }[field],
      );
      expect(await footprint()).toEqual(before);
    },
  );

  test("D2 rechaza un Delivery sin ningún dato de entrega", async () => {
    const before = await footprint();
    expect((await create(undefined)).success).toBe(false);
    expect(await footprint()).toEqual(before);
  });

  test("D2 la referencia es opcional", async () => {
    const created = await createOk({ ...baseDelivery, reference: undefined });
    expect(
      (
        await prisma().delivery.findUniqueOrThrow({
          where: { orderId: created.orderId },
        })
      ).reference,
    ).toBeNull();
  });

  test.each(["87654321", "187654321", "98765432a"])(
    "D3 rechaza el teléfono %s",
    async (phone) => {
      const before = await footprint();
      expect((await create({ ...baseDelivery, phone })).success).toBe(false);
      expect(await footprint()).toEqual(before);
    },
  );

  test.each([-1, 5.555])("D4 rechaza el envío %s", async (fee) => {
    const before = await footprint();
    expect((await create({ ...baseDelivery, fee })).success).toBe(false);
    expect(await footprint()).toEqual(before);
  });

  test("D4 acepta envío 0 como envío gratis", async () => {
    const created = await createOk({
      ...baseDelivery,
      fee: 0,
      expectedPaymentMethod: null,
      cashPaysWith: null,
    });
    const order = await prisma().order.findUniqueOrThrow({
      where: { id: created.orderId },
    });
    expect(order.total.toNumber()).toBe(50);
    expect(order.netTotal.toNumber()).toBe(50);
  });

  test("D5 rechaza “paga con” con billetera o menor al total", async () => {
    const before = await footprint();
    const wallet = await create({
      ...baseDelivery,
      expectedPaymentMethod: "WALLET",
      cashPaysWith: 100,
    });
    const below = await create({ ...baseDelivery, cashPaysWith: 54.99 });
    const noMethod = await create({
      ...baseDelivery,
      expectedPaymentMethod: undefined,
    });
    expect(!below.success && below.message).toBe(
      "“Paga con” debe ser al menos el total (S/ 55.00).",
    );
    expect([wallet.success, below.success, noMethod.success]).toEqual([
      false,
      false,
      false,
    ]);
    expect(await footprint()).toEqual(before);
  });

  test("D5 acepta “paga con” igual al total y billetera sin “paga con”", async () => {
    await createOk({ ...baseDelivery, cashPaysWith: 55 });
    await createOk({
      ...baseDelivery,
      expectedPaymentMethod: "WALLET",
      cashPaysWith: undefined,
    });
  });

  test("D6 una adición que supera “paga con” se rechaza completa", async () => {
    const created = await createOk({ ...baseDelivery, cashPaysWith: 60 });
    const before = await footprint();
    const result = await submitFulfillmentRound(ids.company, ids.admin, {
      orderId: created.orderId,
      roundId: randomUUID(),
      orderType: "DELIVERY",
      items: [{ productId: ids.productA, quantity: 1 }],
    });
    expect(result.success).toBe(false);
    expect(!result.success && result.message).toContain("Paga con");
    expect(await footprint()).toEqual(before);
    expect(
      (
        await prisma().order.findUniqueOrThrow({
          where: { id: created.orderId },
        })
      ).total.toNumber(),
    ).toBe(55);
  });

  test("D6 una adición dentro de “paga con” suma al total conservando el envío", async () => {
    const created = await createOk({ ...baseDelivery, cashPaysWith: 100 });
    const result = await submitFulfillmentRound(ids.company, ids.admin, {
      orderId: created.orderId,
      roundId: randomUUID(),
      orderType: "DELIVERY",
      items: [{ productId: ids.productC, quantity: 1 }],
    });
    expect(result.success).toBe(true);
    const order = await prisma().order.findUniqueOrThrow({
      where: { id: created.orderId },
    });
    expect(order.total.toNumber()).toBe(70);
    expect(order.netTotal.toNumber()).toBe(70);
    expect(order.discountAmount.toNumber()).toBe(0);
  });

  test("D7 el envío no es un producto: sin OrderItem ni movimiento de stock", async () => {
    const items = await prisma().orderItem.findMany({
      where: { orderId: d1.orderId },
    });
    expect(items.map((item) => item.productId).sort()).toEqual(
      [ids.productA, ids.productB].sort(),
    );
    const transfers = await prisma().stockTransfer.findMany({
      where: {
        companyId: ids.company,
        data: { path: ["orderItemId"], string_contains: "" },
      },
    });
    const itemIds = new Set(items.map((item) => item.id));
    const ofOrder = transfers.filter((transfer) =>
      itemIds.has((transfer.data as { orderItemId: string }).orderItemId),
    );
    expect(ofOrder).toHaveLength(1);
    expect(ofOrder[0]).toMatchObject({ productId: ids.productA });
    expect(ofOrder[0].value.toNumber()).toBe(-1);
  });

  test("D8 la comanda incluye el nombre y no dirección, teléfono, precios ni envío", async () => {
    const jobs = await prisma().kitchetTicketPrintJob.findMany({
      where: { id: { in: d1.printJobIds } },
    });
    expect(jobs).toHaveLength(1);
    const text = Buffer.from(jobs[0].content).toString("latin1");
    expect(text).toContain("Cliente: Maria Quispe");
    expect(text).toContain("Producto A");
    for (const forbidden of [
      "987654321",
      "987 654 321",
      "Olivos",
      "reja negra",
      "S/",
      "Envio",
      "Envío",
      "30.00",
      "55.00",
    ])
      expect(text).not.toContain(forbidden);
  });

  test("D8 la adición de un Delivery también lleva el nombre", async () => {
    const created = await createOk({ ...baseDelivery, name: "Luis Rojas" });
    const added = await submitFulfillmentRound(ids.company, ids.admin, {
      orderId: created.orderId,
      roundId: randomUUID(),
      orderType: "DELIVERY",
      items: [{ productId: ids.productA, quantity: 1 }],
    });
    if (!added.success) throw new Error(added.message);
    const job = await prisma().kitchetTicketPrintJob.findFirstOrThrow({
      where: { id: { in: added.data.printJobIds } },
    });
    expect(Buffer.from(job.content).toString("latin1")).toContain(
      "Cliente: Luis Rojas",
    );
  });

  test("D9 Para llevar ignora los datos de entrega y no crea Delivery", async () => {
    const created = await createOk(baseDelivery, lines(), "TAKE_AWAY");
    const order = await prisma().order.findUniqueOrThrow({
      where: { id: created.orderId },
      include: { delivery: true },
    });
    expect(order.delivery).toBeNull();
    expect(order.total.toNumber()).toBe(50);
    expect(order.netTotal.toNumber()).toBe(50);
    const job = await prisma().kitchetTicketPrintJob.findFirstOrThrow({
      where: { id: { in: created.printJobIds } },
    });
    expect(Buffer.from(job.content).toString("latin1")).not.toContain(
      "Cliente:",
    );
  });

  test("D9 Para llevar sin datos sigue creándose", async () => {
    const created = await createOk(undefined, lines(), "TAKE_AWAY");
    expect(
      await prisma().delivery.count({ where: { orderId: created.orderId } }),
    ).toBe(0);
  });

  test("D10 el medio esperado no crea pagos ni cambia el estado de pago", async () => {
    expect(
      await prisma().payment.count({ where: { orderId: d1.orderId } }),
    ).toBe(0);
    expect(
      (await prisma().order.findUniqueOrThrow({ where: { id: d1.orderId } }))
        .paymentStatus,
    ).toBe("PENDING");
  });

  describe("D11 restricciones en base de datos", () => {
    const insert = async (
      fields: Partial<{
        fee: number;
        phone: string;
        expected: "CASH" | "WALLET" | null;
        paysWith: number | null;
      }>,
    ) => {
      const order = await prisma().order.create({
        data: {
          companyId: ids.company,
          sellerId: ids.admin,
          orderType: "DELIVERY",
          status: "PENDING",
          paymentStatus: "PENDING",
          discountAmount: 0,
          netTotal: 0,
          total: 0,
          documentType: "ticket",
        },
      });
      orderIds.push(order.id);
      const v = {
        fee: 5,
        phone: "987654321",
        expected: null as "CASH" | "WALLET" | null,
        paysWith: null as number | null,
        ...fields,
      };
      return prisma().$executeRaw`
        INSERT INTO "Delivery" ("orderId", "name", "phone", "address", "fee",
          "expectedPaymentMethod", "cashPaysWith", "createdById", "updatedAt")
        VALUES (${order.id}, 'Ana', ${v.phone}, 'Calle 1', ${v.fee},
          ${v.expected}::"DeliveryExpectedPayment", ${v.paysWith}, ${ids.admin}, now())`;
    };

    test("fila válida", async () => {
      await expect(insert({})).resolves.toBe(1);
      await expect(
        insert({ fee: 0, expected: "CASH", paysWith: 100 }),
      ).resolves.toBe(1);
    });

    test("fee negativo", async () => {
      await expect(insert({ fee: -1 })).rejects.toThrow(/Delivery_fee_check/);
    });

    test.each(["87654321", "187654321", "98765432a", "9876543210"])(
      "teléfono inválido %s",
      async (phone) => {
        await expect(insert({ phone })).rejects.toThrow(/Delivery_phone_check/);
      },
    );

    test("“paga con” sin efectivo o no positivo", async () => {
      await expect(insert({ paysWith: 100 })).rejects.toThrow(
        /Delivery_cash_pays_with_check/,
      );
      await expect(
        insert({ expected: "WALLET", paysWith: 100 }),
      ).rejects.toThrow(/Delivery_cash_pays_with_check/);
      await expect(insert({ expected: "CASH", paysWith: 0 })).rejects.toThrow(
        /Delivery_cash_pays_with_check/,
      );
    });
  });
});

describe("DEL-02 · seguridad", () => {
  test("S4 precios, totales y estados enviados por el cliente se ignoran", async () => {
    const result = await confirmFulfillmentRound({
      roundId: randomUUID(),
      orderType: "DELIVERY",
      total: 1,
      netTotal: 1,
      discountAmount: 40,
      status: "COMPLETED",
      paymentStatus: "PAID",
      companyId: randomUUID(),
      items: [
        {
          productId: ids.productA,
          quantity: 1,
          price: 1,
          productPrice: 1,
          total: 1,
        },
        { productId: ids.productB, quantity: 1, productPrice: 1 },
      ],
      delivery: {
        ...baseDelivery,
        status: "DELIVERED",
        total: 1,
        createdById: randomUUID(),
      },
    });
    if (!result.success) throw new Error(result.message);
    orderIds.push(result.data.orderId);
    const order = await prisma().order.findUniqueOrThrow({
      where: { id: result.data.orderId },
      include: { delivery: true, orderItems: true },
    });
    expect(order).toMatchObject({
      companyId: ids.company,
      status: "PENDING",
      paymentStatus: "PENDING",
    });
    expect(order.total.toNumber()).toBe(55);
    expect(order.netTotal.toNumber()).toBe(55);
    expect(order.discountAmount.toNumber()).toBe(0);
    expect(order.delivery).toMatchObject({
      status: "PENDING",
      createdById: ids.admin,
    });
    expect(
      order.orderItems.map((item) => item.productPrice.toNumber()).sort(),
    ).toEqual([20, 30]);
  });

  test("S4 el repositorio tampoco acepta precios ni totales de la entrada", async () => {
    const result = await create({ ...baseDelivery, status: "DELIVERED" }, [
      {
        productId: ids.productA,
        quantity: 1,
        price: 1,
        productPrice: 1,
      } as Line,
    ]);
    expect(result.success).toBe(true);
    if (result.success) orderIds.push(result.data.orderId);
    const order = await prisma().order.findUniqueOrThrow({
      where: { id: result.success ? result.data.orderId : "" },
      include: { delivery: true },
    });
    expect(order.total.toNumber()).toBe(35);
    expect(order.delivery?.status).toBe("PENDING");
  });

  test("S5 los eventos de realtime solo llevan ids y tipo de cambio", async () => {
    const created = await confirmFulfillmentRound({
      roundId: randomUUID(),
      orderType: "DELIVERY",
      items: lines(),
      delivery: { ...baseDelivery, name: "Rosa Mendoza" },
    });
    if (!created.success) throw new Error(created.message);
    const { orderId } = created.data;
    orderIds.push(orderId);
    const order = await prisma().order.findUniqueOrThrow({
      where: { id: orderId },
    });
    const paid = await confirmFulfillmentPayment({
      orderId,
      orderVersion: order.updatedAt.toISOString(),
      expectedTotal: order.total.toNumber(),
      cashShiftId: ids.cashShift,
      method: "cash",
      cashReceived: 100,
      receipt: { documentType: "ticket" },
    });
    expect(paid.success, JSON.stringify(paid)).toBe(true);
    expect(await dispatchDelivery({ orderId })).toMatchObject({
      success: true,
    });
    expect(await deliverDelivery({ orderId })).toMatchObject({ success: true });

    const payloads = JSON.stringify(mocks.broadcast.mock.calls);
    expect(mocks.broadcast.mock.calls.length).toBeGreaterThan(0);
    for (const sensitive of [
      "987654321",
      "987 654 321",
      "Olivos",
      "reja negra",
      "Rosa Mendoza",
      "Mendoza",
    ])
      expect(payloads).not.toContain(sensitive);
    for (const [, , data] of mocks.broadcast.mock.calls)
      for (const key of ["phone", "address", "name", "reference", "delivery"])
        expect(data).not.toHaveProperty(key);
  });
});
