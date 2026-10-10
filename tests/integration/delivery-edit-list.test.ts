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

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("@/lib/auth", () => ({ getSession: mocks.getSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import prisma from "@/lib/prisma";
import { submitFulfillmentRound } from "@/order/rounds/fulfillment-repository";
import { confirmFulfillmentPayment } from "@/order/fulfillment-payment-actions";
import {
  deliverDelivery,
  dispatchDelivery,
  editDeliveryDetails,
  searchDeliveryOrders,
} from "@/delivery/actions";
import { listDeliveryOrders } from "@/delivery/db_repository";

type Role = "ADMIN" | "CASHIER" | "SELLER" | "WAITER";
type Seed = {
  companyId: string;
  admin: SessionUser;
  seller: SessionUser;
  waiter: SessionUser;
  cashShiftId: string;
  productA: string;
  productB: string;
};
type SessionUser = {
  id: string;
  companyId: string;
  role: Role;
  name: string;
  email: string;
  active: boolean;
};

const suffix = randomUUID();
const seeds: Seed[] = [];
const orderIds: string[] = [];

async function seedCompany(label: string, featureEnabled = true) {
  const db = prisma();
  const companyId = randomUUID();
  const user = (role: Role): SessionUser => ({
    id: randomUUID(),
    companyId,
    role,
    name: `${label} ${role}`,
    email: `${label}-${role}-${suffix}@example.test`.toLowerCase(),
    active: true,
  });
  const seed: Seed = {
    companyId,
    admin: user("ADMIN"),
    seller: user("SELLER"),
    waiter: user("WAITER"),
    cashShiftId: randomUUID(),
    productA: randomUUID(),
    productB: randomUUID(),
  };
  await db.company.create({ data: { id: companyId, address: "QA" } });
  await db.companyFeature.create({
    data: { companyId, key: "restaurants", enabled: featureEnabled },
  });
  for (const u of [seed.admin, seed.seller, seed.waiter])
    await db.user.create({
      data: {
        id: u.id,
        companyId,
        email: u.email,
        password: "test",
        name: u.name,
        role: u.role,
      },
    });
  await db.cashShift.create({
    data: {
      id: seed.cashShiftId,
      userId: seed.admin.id,
      companyId,
      initialAmount: 100,
      status: "OPEN",
      openedAt: new Date(),
    },
  });
  await db.product.createMany({
    data: [
      {
        id: seed.productA,
        companyId,
        name: "Producto A",
        description: "",
        price: 30,
        productType: "DISH",
      },
      {
        id: seed.productB,
        companyId,
        name: "Producto B",
        description: "",
        price: 20,
        productType: "DISH",
      },
    ],
  });
  seeds.push(seed);
  return seed;
}

const baseDelivery = {
  name: "Maria Quispe",
  phone: "987654321",
  address: "Av. Los Olivos 123, Lima",
  reference: "Casa de reja negra",
  fee: 5,
  expectedPaymentMethod: "CASH" as const,
  cashPaysWith: 100,
};

async function createOrder(
  seed: Seed,
  delivery: Record<string, unknown> | undefined = baseDelivery,
  orderType: "DELIVERY" | "TAKE_AWAY" = "DELIVERY",
) {
  const result = await submitFulfillmentRound(seed.companyId, seed.admin.id, {
    roundId: randomUUID(),
    orderType,
    items: [
      { productId: seed.productA, quantity: 1 },
      { productId: seed.productB, quantity: 1 },
    ],
    delivery,
  } as Parameters<typeof submitFulfillmentRound>[2]);
  if (!result.success) throw new Error(result.message);
  orderIds.push(result.data.orderId);
  return result.data.orderId;
}

const loadOrder = (orderId: string) =>
  prisma().order.findUniqueOrThrow({
    where: { id: orderId },
    include: { delivery: true, payments: true, documents: true },
  });

const version = async (orderId: string) =>
  (await loadOrder(orderId)).updatedAt.toISOString();

const editInput = (
  orderId: string,
  updatedAt: string,
  over: Record<string, unknown> = {},
) => ({ orderId, updatedAt, ...baseDelivery, ...over });

async function pay(seed: Seed, orderId: string, over = {}) {
  const order = await loadOrder(orderId);
  return confirmFulfillmentPayment({
    orderId,
    orderVersion: order.updatedAt.toISOString(),
    expectedTotal: order.total.toNumber(),
    cashShiftId: seed.cashShiftId,
    method: "cash",
    cashReceived: 500,
    receipt: { documentType: "ticket" },
    ...over,
  });
}

let main: Seed;
let other: Seed;
let disabled: Seed;
let listing: Seed;

const signIn = (user: SessionUser) =>
  mocks.getSession.mockResolvedValue({ user });

beforeAll(async () => {
  main = await seedCompany("main");
  other = await seedCompany("other");
  disabled = await seedCompany("disabled");
  listing = await seedCompany("listing");
});

afterAll(async () => {
  const db = prisma();
  const companyIds = seeds.map((seed) => seed.companyId);
  await db.documentTaxDispatch.deleteMany({
    where: { companyId: { in: companyIds } },
  });
  await db.document.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.orderItemCancellation.deleteMany({
    where: { orderRoundItem: { orderRound: { orderId: { in: orderIds } } } },
  });
  await db.orderRoundItem.deleteMany({
    where: { orderRound: { orderId: { in: orderIds } } },
  });
  await db.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.orderRound.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.delivery.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.order.deleteMany({ where: { id: { in: orderIds } } });
  await db.cashShift.deleteMany({ where: { companyId: { in: companyIds } } });
  await db.product.deleteMany({ where: { companyId: { in: companyIds } } });
  await db.companyFeature.deleteMany({
    where: { companyId: { in: companyIds } },
  });
  await db.user.deleteMany({ where: { companyId: { in: companyIds } } });
  await db.company.deleteMany({ where: { id: { in: companyIds } } });
});

beforeEach(() => signIn(main.admin));

describe("DEL-04 · edición de datos de entrega", () => {
  test("L1 corrige dirección y teléfono tras entregar y cobrar sin tocar total, pagos, documento ni auditoría", async () => {
    const orderId = await createOrder(main);
    expect((await pay(main, orderId)).success).toBe(true);
    expect(await dispatchDelivery({ orderId })).toMatchObject({
      success: true,
    });
    expect(await deliverDelivery({ orderId })).toMatchObject({
      success: true,
    });
    const before = await loadOrder(orderId);
    expect(before.delivery?.status).toBe("DELIVERED");

    const result = await editDeliveryDetails(
      editInput(orderId, before.updatedAt.toISOString(), {
        address: "Jr. Cusco 456, Lima",
        phone: "+51 912 345 678",
        name: "Maria Q. Quispe",
        reference: "",
      }),
    );
    expect(result.success, JSON.stringify(result)).toBe(true);

    const after = await loadOrder(orderId);
    expect(after.delivery).toMatchObject({
      address: "Jr. Cusco 456, Lima",
      phone: "912345678",
      name: "Maria Q. Quispe",
      reference: null,
      status: "DELIVERED",
      dispatchedAt: before.delivery?.dispatchedAt,
      dispatchedById: before.delivery?.dispatchedById,
      deliveredAt: before.delivery?.deliveredAt,
      deliveredById: before.delivery?.deliveredById,
    });
    expect(after.delivery?.fee.toNumber()).toBe(5);
    expect(after.delivery?.cashPaysWith?.toNumber()).toBe(100);
    expect(after.total.toNumber()).toBe(before.total.toNumber());
    expect(after.status).toBe("COMPLETED");
    expect(after.paymentStatus).toBe("PAID");
    expect(after.payments.map((p) => [p.id, p.amount.toNumber()])).toEqual(
      before.payments.map((p) => [p.id, p.amount.toNumber()]),
    );
    expect(after.documents.map((d) => [d.id, d.total.toNumber()])).toEqual(
      before.documents.map((d) => [d.id, d.total.toNumber()]),
    );
    expect(after.updatedAt.getTime()).toBeGreaterThan(
      before.updatedAt.getTime(),
    );
  });

  test("L1 la edición de contacto también se admite en Pendiente y Despachado", async () => {
    const orderId = await createOrder(main);
    for (const step of ["PENDING", "DISPATCHED"] as const) {
      if (step === "DISPATCHED") await dispatchDelivery({ orderId });
      const result = await editDeliveryDetails(
        editInput(orderId, await version(orderId), {
          address: `Dirección en ${step}`,
        }),
      );
      expect(result.success, JSON.stringify(result)).toBe(true);
      expect((await loadOrder(orderId)).delivery?.address).toBe(
        `Dirección en ${step}`,
      );
    }
  });

  test('B1 el formulario real (strings y "" en un pedido sin medio esperado) guarda la edición', async () => {
    const orderId = await createOrder(main, {
      ...baseDelivery,
      fee: 0,
      expectedPaymentMethod: null,
      cashPaysWith: null,
      reference: undefined,
    });
    // Exactamente lo que arma delivery-edit-form: todo texto, "" para vacíos.
    const formShape = {
      orderId,
      updatedAt: await version(orderId),
      name: "Maria Quispe",
      phone: "987654321",
      address: "Corregida 99",
      reference: "",
      fee: "0",
      expectedPaymentMethod: "",
      cashPaysWith: "",
    };
    const result = await editDeliveryDetails(formShape);
    expect(result.success, JSON.stringify(result)).toBe(true);
    const order = await loadOrder(orderId);
    expect(order.delivery).toMatchObject({
      address: "Corregida 99",
      reference: null,
      expectedPaymentMethod: null,
      cashPaysWith: null,
    });
    expect(order.total.toNumber()).toBe(50);
  });

  test("L1 aplica las validaciones de DEL-02 y no guarda nada si fallan", async () => {
    const orderId = await createOrder(main);
    const before = await loadOrder(orderId);
    for (const bad of [
      { name: "  " },
      { phone: "12345" },
      { address: "" },
      { reference: "x".repeat(301) },
      { fee: -1 },
      { fee: 5.555 },
    ]) {
      const result = await editDeliveryDetails(
        editInput(orderId, before.updatedAt.toISOString(), bad),
      );
      expect(result.success).toBe(false);
    }
    const after = await loadOrder(orderId);
    expect(after.delivery).toEqual(before.delivery);
    expect(after.updatedAt).toEqual(before.updatedAt);
  });

  test.each(["PENDING", "DISPATCHED"] as const)(
    "L2 cambiar el envío 5 → 8 en %s sin cobrar sube el total 3 y revalida “paga con”",
    async (status) => {
      const orderId = await createOrder(main);
      if (status === "DISPATCHED") await dispatchDelivery({ orderId });
      expect((await loadOrder(orderId)).total.toNumber()).toBe(55);

      const result = await editDeliveryDetails(
        editInput(orderId, await version(orderId), { fee: 8 }),
      );
      expect(result).toMatchObject({ success: true, data: { total: 58 } });
      const order = await loadOrder(orderId);
      expect(order.delivery?.fee.toNumber()).toBe(8);
      expect(order.total.toNumber()).toBe(58);
      expect(order.netTotal.toNumber()).toBe(58);
      expect(order.discountAmount.toNumber()).toBe(0);
      expect(order.delivery?.cashPaysWith?.toNumber()).toBe(100);

      // “Paga con” 100 ya no alcanza con envío 60 (total 110): rechazo completo.
      const snapshot = await loadOrder(orderId);
      const rejected = await editDeliveryDetails(
        editInput(orderId, snapshot.updatedAt.toISOString(), {
          fee: 60,
          address: "No debe guardarse",
        }),
      );
      expect(rejected.success).toBe(false);
      const unchanged = await loadOrder(orderId);
      expect(unchanged.total.toNumber()).toBe(58);
      expect(unchanged.delivery?.fee.toNumber()).toBe(8);
      expect(unchanged.delivery?.address).toBe(baseDelivery.address);
      expect(unchanged.updatedAt).toEqual(snapshot.updatedAt);

      // La misma solicitud puede corregir “paga con” a la vez.
      const accepted = await editDeliveryDetails(
        editInput(orderId, snapshot.updatedAt.toISOString(), {
          fee: 60,
          cashPaysWith: 200,
        }),
      );
      expect(accepted).toMatchObject({ success: true, data: { total: 110 } });
      expect((await loadOrder(orderId)).total.toNumber()).toBe(110);
    },
  );

  test("L2 el cobro posterior usa el total editado", async () => {
    const orderId = await createOrder(main);
    expect(
      (
        await editDeliveryDetails(
          editInput(orderId, await version(orderId), {
            fee: 0,
            cashPaysWith: null,
            expectedPaymentMethod: null,
          }),
        )
      ).success,
    ).toBe(true);
    expect((await pay(main, orderId)).success).toBe(true);
    const order = await loadOrder(orderId);
    expect(order.total.toNumber()).toBe(50);
    expect(
      order.payments.reduce((sum, p) => sum + p.amount.toNumber(), 0),
    ).toBe(50);
    expect(order.documents[0].total.toNumber()).toBe(50);
  });

  test("L3 con documento rechaza toda la solicitud: ni el contacto cambia", async () => {
    const orderId = await createOrder(main);
    expect((await pay(main, orderId)).success).toBe(true);
    const before = await loadOrder(orderId);

    for (const change of [
      { fee: 8 },
      { expectedPaymentMethod: "WALLET", cashPaysWith: null },
      { cashPaysWith: 150 },
    ]) {
      const result = await editDeliveryDetails(
        editInput(orderId, before.updatedAt.toISOString(), {
          ...change,
          name: "Otro nombre",
          address: "Otra dirección",
        }),
      );
      expect(result.success).toBe(false);
    }
    const after = await loadOrder(orderId);
    expect(after.delivery).toEqual(before.delivery);
    expect(after.total.toNumber()).toBe(before.total.toNumber());
    expect(after.updatedAt).toEqual(before.updatedAt);
    expect(after.documents).toHaveLength(1);
  });

  test("L3 con documento sembrado sin pago también bloquea el envío pero admite contacto", async () => {
    const orderId = await createOrder(main);
    const order = await loadOrder(orderId);
    await prisma().document.create({
      data: {
        orderId,
        companyId: main.companyId,
        netTotal: order.netTotal,
        total: order.total,
        documentType: "TICKET",
        series: "NV01",
        number: Math.floor(Math.random() * 1e8),
        dateOfIssue: new Date(),
        status: "REGISTERED",
      },
    });
    expect(
      (
        await editDeliveryDetails(
          editInput(orderId, order.updatedAt.toISOString(), { fee: 9 }),
        )
      ).success,
    ).toBe(false);
    expect(
      (
        await editDeliveryDetails(
          editInput(orderId, order.updatedAt.toISOString(), {
            address: "Nueva",
          }),
        )
      ).success,
    ).toBe(true);
    expect((await loadOrder(orderId)).delivery?.fee.toNumber()).toBe(5);
  });

  test("L4 una versión vencida se rechaza sin cambios", async () => {
    const orderId = await createOrder(main);
    const stale = await version(orderId);
    expect(
      (
        await editDeliveryDetails(
          editInput(orderId, stale, { address: "Primera edición" }),
        )
      ).success,
    ).toBe(true);
    const before = await loadOrder(orderId);

    const result = await editDeliveryDetails(
      editInput(orderId, stale, { address: "Edición vencida", fee: 9 }),
    );
    expect(result.success).toBe(false);
    expect(!result.success && result.message).toMatch(/recarga/i);
    const after = await loadOrder(orderId);
    expect(after.delivery).toEqual(before.delivery);
    expect(after.total.toNumber()).toBe(before.total.toNumber());
    expect(after.updatedAt).toEqual(before.updatedAt);
  });

  test("S4 total, estado y actor enviados por el cliente se ignoran", async () => {
    const orderId = await createOrder(main);
    const result = await editDeliveryDetails({
      ...editInput(orderId, await version(orderId), { fee: 8 }),
      total: 1,
      netTotal: 1,
      status: "DELIVERED",
      dispatchedById: main.admin.id,
      companyId: other.companyId,
    });
    expect(result.success).toBe(true);
    const order = await loadOrder(orderId);
    expect(order.total.toNumber()).toBe(58);
    expect(order.delivery?.status).toBe("PENDING");
    expect(order.delivery?.dispatchedById).toBeNull();
    expect(order.companyId).toBe(main.companyId);
  });
});

describe("DEL-04 · seguridad de la edición y la lista (S1–S3)", () => {
  test("S1 otra empresa no edita ni lista pedidos ajenos y el mensaje es genérico", async () => {
    const orderId = await createOrder(main);
    const before = await loadOrder(orderId);
    signIn(other.admin);
    const result = await editDeliveryDetails(
      editInput(orderId, before.updatedAt.toISOString(), { address: "Hack" }),
    );
    expect(result).toEqual({
      success: false,
      message: "El pedido no está disponible.",
    });
    const missing = await editDeliveryDetails(
      editInput(randomUUID(), before.updatedAt.toISOString()),
    );
    expect(missing).toEqual(result);

    const listed = await searchDeliveryOrders({ search: "Maria" });
    expect(listed.success).toBe(true);
    expect(
      listed.success && listed.data.items.some((i) => i.orderId === orderId),
    ).toBe(false);
    const after = await loadOrder(orderId);
    expect(after.delivery).toEqual(before.delivery);
    expect(after.updatedAt).toEqual(before.updatedAt);
  });

  test("S2 WAITER no edita ni lista", async () => {
    const orderId = await createOrder(main);
    const before = await loadOrder(orderId);
    signIn(main.waiter);
    expect(
      (
        await editDeliveryDetails(
          editInput(orderId, before.updatedAt.toISOString(), { address: "X" }),
        )
      ).success,
    ).toBe(false);
    const listed = await searchDeliveryOrders({});
    expect(listed.success).toBe(false);
    expect((await loadOrder(orderId)).delivery).toEqual(before.delivery);
  });

  test("S2 SELLER puede editar y listar (permiso delivery)", async () => {
    const orderId = await createOrder(main);
    signIn(main.seller);
    expect(
      (
        await editDeliveryDetails(
          editInput(orderId, await version(orderId), {
            address: "Por vendedor",
          }),
        )
      ).success,
    ).toBe(true);
    expect((await searchDeliveryOrders({})).success).toBe(true);
  });

  test("S3 con la feature restaurants deshabilitada se rechazan edición y lista", async () => {
    const orderId = await createOrder(disabled);
    await prisma().companyFeature.updateMany({
      where: { companyId: disabled.companyId },
      data: { enabled: false },
    });
    signIn(disabled.admin);
    const before = await loadOrder(orderId);
    expect(
      (
        await editDeliveryDetails(
          editInput(orderId, before.updatedAt.toISOString(), { address: "X" }),
        )
      ).success,
    ).toBe(false);
    expect((await searchDeliveryOrders({})).success).toBe(false);
    expect((await loadOrder(orderId)).delivery).toEqual(before.delivery);
  });
});

describe("DEL-04 · lista de Delivery", () => {
  // 9 de octubre de 2026, 20:00 en Lima.
  const NOW = new Date("2026-10-09T20:00:00-05:00");
  const minutesBefore = (minutes: number) =>
    new Date(NOW.getTime() - minutes * 60_000);
  const ids: Record<string, string> = {};

  async function place(
    key: string,
    over: {
      name?: string;
      phone?: string;
      createdAt?: Date;
      status?: "PENDING" | "DISPATCHED" | "DELIVERED";
      dispatchedAt?: Date;
      seed?: Seed;
      orderType?: "DELIVERY" | "TAKE_AWAY";
    },
  ) {
    const seed = over.seed ?? listing;
    const orderId = await createOrder(
      seed,
      over.orderType === "TAKE_AWAY"
        ? undefined
        : {
            ...baseDelivery,
            name: over.name ?? "Cliente Genérico",
            phone: over.phone ?? "900000000",
          },
      over.orderType,
    );
    ids[key] = orderId;
    await prisma().order.update({
      where: { id: orderId },
      data: { createdAt: over.createdAt ?? minutesBefore(30) },
    });
    if (over.status && over.status !== "PENDING")
      await prisma().delivery.update({
        where: { orderId },
        data: {
          status: over.status,
          dispatchedAt: over.dispatchedAt ?? minutesBefore(20),
          dispatchedById: seed.admin.id,
          ...(over.status === "DELIVERED"
            ? { deliveredAt: minutesBefore(10), deliveredById: seed.admin.id }
            : {}),
        },
      });
    return orderId;
  }

  const list = async (
    filters: Parameters<typeof listDeliveryOrders>[1] = {},
    seed = listing,
  ) => {
    const result = await listDeliveryOrders(seed.companyId, filters, NOW);
    if (!result.success) throw new Error(result.message);
    return result.data;
  };
  const idsOf = (items: { orderId: string }[]) =>
    items.map((item) => item.orderId).sort();
  const expectIds = (items: { orderId: string }[], keys: string[]) =>
    expect(idsOf(items)).toEqual(keys.map((key) => ids[key]).sort());

  beforeAll(async () => {
    await place("pending", { name: "Ana Torres", phone: "900000001" });
    await place("dispatched", {
      name: "Mariana López",
      phone: "900000002",
      status: "DISPATCHED",
      dispatchedAt: minutesBefore(30),
    });
    await place("delivered", {
      name: "Luis Quispe",
      phone: "965432100",
      status: "DELIVERED",
    });
    await place("yesterday", {
      name: "Zeta Ayer",
      createdAt: minutesBefore(24 * 60 + 30),
    });
    // Despachado ayer, aún en la calle: debe seguir visible y resaltado.
    await place("lateYesterday", {
      name: "Calle Ayer",
      status: "DISPATCHED",
      createdAt: minutesBefore(24 * 60 + 60),
      dispatchedAt: minutesBefore(24 * 60 + 45),
    });
    // Entregado ayer: solo aparece al pedir ese día o ese estado.
    await place("deliveredYesterday", {
      name: "Entregado Ayer",
      status: "DELIVERED",
      createdAt: minutesBefore(24 * 60 + 90),
      dispatchedAt: minutesBefore(24 * 60 + 80),
    });
    await place("takeaway", { orderType: "TAKE_AWAY" });
    await place("elsewhere", {
      name: "Ana Torres",
      seed: other,
      phone: "900000001",
    });
    // L7: despachados con distinta antigüedad y un Pendiente de hace 5 h.
    await place("d159", {
      name: "Atraso 159",
      status: "DISPATCHED",
      dispatchedAt: minutesBefore(119),
      createdAt: minutesBefore(200),
    });
    await place("d200", {
      name: "Atraso 200",
      status: "DISPATCHED",
      dispatchedAt: minutesBefore(120),
      createdAt: minutesBefore(210),
    });
    await place("d300", {
      name: "Atraso 300",
      status: "DISPATCHED",
      dispatchedAt: minutesBefore(180),
      createdAt: minutesBefore(240),
    });
    await place("p500", { name: "Atraso 500", createdAt: minutesBefore(300) });
  });

  test("L5 por defecto lista Pendientes y Despachados de hoy (y abiertos de días anteriores) de la empresa", async () => {
    const { items } = await list();
    expectIds(items, [
      "pending",
      "dispatched",
      "d159",
      "d200",
      "d300",
      "p500",
      "yesterday",
      "lateYesterday",
    ]);
    const row = items.find((item) => item.orderId === ids.pending)!;
    expect(row).toMatchObject({
      name: "Ana Torres",
      address: baseDelivery.address,
      total: 55,
      status: "PENDING",
      paymentStatus: "PENDING",
      isOverdue: false,
    });
    expect(new Date(row.createdAt).getTime()).toBe(minutesBefore(30).getTime());
    // La empresa ajena ve solo lo suyo.
    expectIds((await list({}, other)).items, ["elsewhere"]);
  });

  test("L5 con fecha explícita solo muestra ese día", async () => {
    const { items } = await list({ date: "2026-10-08" });
    expectIds(items, ["yesterday", "lateYesterday"]);
    expectIds((await list({ date: "2026-10-08", status: "DELIVERED" })).items, [
      "deliveredYesterday",
    ]);
  });

  test("M2 un despachado de ayer sigue visible y resaltado en la vista por defecto", async () => {
    const { items } = await list();
    const row = items.find((item) => item.orderId === ids.lateYesterday)!;
    expect(row.status).toBe("DISPATCHED");
    expect(row.isOverdue).toBe(true);
    expect(items.some((i) => i.orderId === ids.deliveredYesterday)).toBe(false);
    // Entregado sin fecha sigue acotado al día de hoy.
    expectIds((await list({ status: "DELIVERED" })).items, ["delivered"]);
  });

  test("M3 el prefijo +51 y los textos con un dígito no amplían la búsqueda", async () => {
    expectIds(
      (await list({ search: "+51 965 432", status: "DELIVERED" })).items,
      ["delivered"],
    );
    expectIds(
      (await list({ search: "51965432100", status: "DELIVERED" })).items,
      ["delivered"],
    );
    // “Ana 9” busca solo por nombre: no coincide con ningún nombre.
    expectIds((await list({ search: "Ana 9" })).items, []);
  });

  test("L6 filtra por Entregado y por Despachado", async () => {
    expectIds((await list({ status: "DELIVERED" })).items, ["delivered"]);
    expectIds((await list({ status: "DISPATCHED" })).items, [
      "dispatched",
      "d159",
      "d200",
      "d300",
      "lateYesterday",
    ]);
  });

  test("L6 busca por parte del nombre sin distinguir mayúsculas y por parte del teléfono", async () => {
    // “ana” está en Ana Torres y en Mariana López; Entregado no entra por defecto.
    expectIds((await list({ search: "ana" })).items, ["pending", "dispatched"]);
    expectIds((await list({ search: "ANA" })).items, ["pending", "dispatched"]);
    expectIds((await list({ search: "654", status: "DELIVERED" })).items, [
      "delivered",
    ]);
    expectIds((await list({ search: "654" })).items, []);
    expectIds((await list({ search: "9654 321" })).items, []);
    expectIds((await list({ search: "654", status: "DELIVERED" })).items, [
      "delivered",
    ]);
    expectIds((await list({ search: "ana", status: "DELIVERED" })).items, []);
  });

  test("L7 resalta solo Despachados con 2 h o más", async () => {
    const { items } = await list();
    const overdue = (key: string) =>
      items.find((item) => item.orderId === ids[key])!.isOverdue;
    expect(overdue("d159")).toBe(false);
    expect(overdue("d200")).toBe(true);
    expect(overdue("d300")).toBe(true);
    expect(overdue("p500")).toBe(false);
    expect(overdue("pending")).toBe(false);
    expect(overdue("dispatched")).toBe(false);
    // El resaltado no cambia el estado.
    const row = await prisma().delivery.findUniqueOrThrow({
      where: { orderId: ids.d300 },
    });
    expect(row.status).toBe("DISPATCHED");
    const delivered = (await list({ status: "DELIVERED" })).items[0];
    expect(delivered.isOverdue).toBe(false);
  });

  test("L8 el cursor pagina sin duplicados ni omisiones y los filtros se aplican antes", async () => {
    const day = "2026-10-08";
    const base = new Date("2026-10-08T15:00:00-05:00").getTime();
    const created: string[] = [];
    for (let i = 0; i < 45; i++) {
      const orderId = await place(`page${i}`, {
        name: `Paginación ${i}`,
        // Grupos de 5 con la misma hora para ejercitar el desempate por id.
        createdAt: new Date(base + Math.floor(i / 5) * 60_000),
        // Cinco entregados que el filtro por defecto debe excluir.
        status: i % 9 === 0 ? "DELIVERED" : undefined,
      });
      created.push(orderId);
    }
    await place("noise", { name: "Ruido", createdAt: new Date(base) });
    const expected = created.filter((_, i) => i % 9 !== 0);
    expect(expected).toHaveLength(40);

    const seen: string[] = [];
    let cursor: string | undefined;
    const pageSizes: number[] = [];
    do {
      const page = await list({ date: day, search: "paginación", cursor });
      pageSizes.push(page.items.length);
      seen.push(...page.items.map((item) => item.orderId));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);

    expect(pageSizes).toEqual([20, 20]);
    expect(new Set(seen).size).toBe(seen.length);
    expect([...seen].sort()).toEqual([...expected].sort());

    const withDelivered: string[] = [];
    cursor = undefined;
    do {
      const page = await list({
        date: day,
        search: "Paginación",
        status: "DELIVERED",
        cursor,
      });
      withDelivered.push(...page.items.map((item) => item.orderId));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(withDelivered).toHaveLength(5);

    // Sin búsqueda se pagina todo el día en orden descendente estable.
    const all: { orderId: string; createdAt: string }[] = [];
    cursor = undefined;
    do {
      const page = await list({ date: day, cursor });
      all.push(...page.items);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(new Set(all.map((i) => i.orderId)).size).toBe(all.length);
    expect(all).toHaveLength(40 + 1 /* ruido */ + 2 /* ayer, abiertos */);
    for (let i = 1; i < all.length; i++)
      expect(all[i - 1].createdAt >= all[i].createdAt).toBe(true);
  });
});

describe("DEL-04 · concurrencia edición vs cobro", () => {
  test("X2 si gana el cobro la edición se rechaza; si gana la edición el cobro se rechaza por total", async () => {
    const outcomes = { payWon: 0, editWon: 0 };
    for (let round = 0; round < 8; round++) {
      const orderId = await createOrder(main);
      const before = await loadOrder(orderId);
      const [edit, payment] = await Promise.all([
        editDeliveryDetails(
          editInput(orderId, before.updatedAt.toISOString(), { fee: 8 }),
        ),
        confirmFulfillmentPayment({
          orderId,
          orderVersion: before.updatedAt.toISOString(),
          expectedTotal: before.total.toNumber(),
          cashShiftId: main.cashShiftId,
          method: "cash",
          cashReceived: 500,
          receipt: { documentType: "ticket" },
        }),
      ]);
      const after = await loadOrder(orderId);

      // Nunca ambos, y siempre al menos uno: el otro ve el estado del ganador.
      expect(
        edit.success !== payment.success,
        JSON.stringify({ edit, payment }),
      ).toBe(true);
      if (payment.success) {
        outcomes.payWon++;
        expect(after.delivery?.fee.toNumber()).toBe(5);
        expect(after.total.toNumber()).toBe(55);
      } else {
        outcomes.editWon++;
        expect(after.delivery?.fee.toNumber()).toBe(8);
        expect(after.total.toNumber()).toBe(58);
        expect(after.payments).toHaveLength(0);
        expect(after.documents).toHaveLength(0);
        expect(after.paymentStatus).toBe("PENDING");
      }
      // Coherencia financiera: lo cobrado es exactamente el total y hay un solo documento.
      const paid = after.payments.reduce(
        (sum, p) => sum + p.amount.toNumber(),
        0,
      );
      if (after.paymentStatus === "PAID") {
        expect(paid).toBe(after.total.toNumber());
        expect(after.documents).toHaveLength(1);
        expect(after.documents[0].total.toNumber()).toBe(
          after.total.toNumber(),
        );
      }
    }
    expect(outcomes.payWon + outcomes.editWon).toBe(8);
  });

  test("X2 orden determinista: cobro primero, luego la edición con la versión anterior", async () => {
    const orderId = await createOrder(main);
    const before = await loadOrder(orderId);
    expect((await pay(main, orderId)).success).toBe(true);
    const edit = await editDeliveryDetails(
      editInput(orderId, before.updatedAt.toISOString(), { fee: 8 }),
    );
    expect(edit.success).toBe(false);
    const after = await loadOrder(orderId);
    expect(after.total.toNumber()).toBe(55);
    expect(after.delivery?.fee.toNumber()).toBe(5);
  });

  test("X2 orden determinista: edición primero, luego el cobro con el total anterior", async () => {
    const orderId = await createOrder(main);
    const before = await loadOrder(orderId);
    expect(
      (
        await editDeliveryDetails(
          editInput(orderId, before.updatedAt.toISOString(), { fee: 8 }),
        )
      ).success,
    ).toBe(true);
    const payment = await confirmFulfillmentPayment({
      orderId,
      orderVersion: before.updatedAt.toISOString(),
      expectedTotal: before.total.toNumber(),
      cashShiftId: main.cashShiftId,
      method: "cash",
      cashReceived: 500,
      receipt: { documentType: "ticket" },
    });
    expect(payment.success).toBe(false);
    const after = await loadOrder(orderId);
    expect(after.payments).toHaveLength(0);
    expect(after.documents).toHaveLength(0);
    // Con la versión y el total nuevos el cobro sí procede, por 58.
    expect((await pay(main, orderId)).success).toBe(true);
    expect((await loadOrder(orderId)).documents[0].total.toNumber()).toBe(58);
  });
});
