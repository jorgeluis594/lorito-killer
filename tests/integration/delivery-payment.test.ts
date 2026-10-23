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
vi.mock("@/document/tax-dispatch-outbox", () => ({
  enqueueDocumentTaxDispatch: vi.fn(),
}));
vi.mock("@/lib/realtime/config", () => ({
  getRealtimeProvider: async () => ({ broadcast: vi.fn() }),
}));

import prisma from "@/lib/prisma";
import { enqueueDocumentTaxDispatch } from "@/document/tax-dispatch-outbox";
import { formatPriceWithoutCurrency } from "@/lib/utils";
import { confirmTablePayment } from "@/table/payment-actions";
import { payTable } from "@/table/payment-repository";
import {
  find as findOrder,
  findReceiptPrintOrder,
} from "@/order/db_repository";
import { buildReceiptPrintData } from "@/printing/receipt-builder";
import { buildThermalReceiptCommands } from "@/printing/thermal-receipt-renderer";
import Voucher from "@/order/components/voucher";
import type { Company } from "@/company/types";
import {
  createFixture,
  type RestaurantFixture,
} from "./helpers/restaurant-fixture";

let f: RestaurantFixture;

beforeAll(async () => {
  f = await createFixture("del03-pay");
});
afterAll(async () => {
  await f.destroy();
});
beforeEach(() => {
  mocks.getSession.mockResolvedValue({ user: f.user("cashier") });
});

const db = () => prisma();
const countFor = async (orderId: string) => ({
  payments: await db().payment.count({ where: { orderId } }),
  documents: await db().document.count({ where: { orderId } }),
});

const sortByName = (items: Record<string, any>[]) =>
  [...items].sort((a, b) => a.descripcion.localeCompare(b.descripcion));

const shippingItems = (items: Record<string, any>[]) =>
  items.filter((item) => item.descripcion === "Envío");

const companyView = () =>
  ({
    id: f.ids.company,
    name: "Empresa QA",
    subName: "QA",
    ruc: "20000000001",
    address: "QA",
  }) as unknown as Company;

const documentView = (
  document: {
    id: string;
    series: string;
    number: number;
    dateOfIssue: Date;
    netTotal: { toNumber(): number };
    total: { toNumber(): number };
  },
  orderId: string,
) => ({
  id: document.id,
  orderId,
  companyId: f.ids.company,
  documentType: "receipt" as const,
  series: document.series,
  number: String(document.number),
  dateOfIssue: document.dateOfIssue,
  status: "registered" as const,
  netTotal: document.netTotal.toNumber(),
  discountAmount: 0,
  taxTotal: 0,
  total: document.total.toNumber(),
  xml: "",
  qr: "",
  hash: "",
});

/** Recorre el árbol de elementos de React y reúne los textos renderizados. */
function collectText(node: unknown): string[] {
  if (node === null || node === undefined || typeof node === "boolean")
    return [];
  if (typeof node === "string" || typeof node === "number")
    return [String(node)];
  if (Array.isArray(node)) return node.flatMap(collectText);
  const element = node as { type?: unknown; props?: { children?: unknown } };
  if (typeof element.type === "function")
    return collectText(
      (element.type as (props: unknown) => unknown)(element.props),
    );
  return collectText(element.props?.children);
}

describe("DEL-03 · envío en el cobro y el comprobante", () => {
  let c1OrderId: string;
  let c1DocumentId: string;
  let c1Payload: Record<string, any>;

  test("C1 la boleta lleva una única línea Envío (ZZ, tipo_tax 20) y totales de S/ 55", async () => {
    c1OrderId = await f.createOrder({});
    const paid = await f.pay(c1OrderId, { method: "debit_card" });
    expect(paid, JSON.stringify(paid)).toMatchObject({
      success: true,
      data: { total: 55 },
    });
    // Criterio 1: pagos y documento por S/ 55.
    const payments = await db().payment.findMany({
      where: { orderId: c1OrderId },
    });
    expect(payments.map((p) => p.amount.toNumber())).toEqual([55]);
    const document = await f.documentFor(c1OrderId);
    c1DocumentId = document.id;
    expect(document.total.toNumber()).toBe(55);
    expect(document.netTotal.toNumber()).toBe(55);

    const { result, bodies } = await f.sendToFactpro(c1DocumentId);
    expect(result.success).toBe(true);
    expect(bodies).toHaveLength(1);
    c1Payload = bodies[0];
    expect(c1Payload.tipo_documento).toBe("03");
    expect(shippingItems(c1Payload.items)).toHaveLength(1);
    expect(c1Payload.items).toHaveLength(3);
    expect(shippingItems(c1Payload.items)[0]).toMatchObject({
      unidad: "ZZ",
      codigo: "",
      cantidad: 1,
      valor_unitario: 5,
      precio_unitario: 5,
      tipo_tax: "20",
      porcentaje_tax: 0,
      total_tax: 0,
      total_base_tax: 5,
      total: 5,
    });
    expect(c1Payload.items.at(-1).descripcion).toBe("Envío");
    expect(
      sortByName(c1Payload.items.filter((i: any) => i.descripcion !== "Envío")),
    ).toEqual([
      expect.objectContaining({ unidad: "NIU", descripcion: "Producto A" }),
      expect.objectContaining({ unidad: "NIU", descripcion: "Producto B" }),
    ]);
    expect(c1Payload.totales).toMatchObject({
      total_exoneradas: 55,
      total_venta: 55,
      total_tax: 0,
      total_gravadas: 0,
    });
    // La suma de líneas coincide con el total del documento.
    expect(
      c1Payload.items.reduce((sum: number, i: any) => sum + i.total, 0),
    ).toBe(55);
  });

  test("C2 la factura repite la línea Envío y usa la identidad fiscal del cliente", async () => {
    const orderId = await f.createOrder({});
    const paid = await f.pay(orderId, {
      method: "debit_card",
      receipt: f.invoiceReceipt,
    });
    expect(paid.success, JSON.stringify(paid)).toBe(true);
    const document = await f.documentFor(orderId);
    const { result, bodies } = await f.sendToFactpro(document.id);
    expect(result.success).toBe(true);
    const payload = bodies[0];
    expect(payload.tipo_documento).toBe("01");
    expect(shippingItems(payload.items)).toHaveLength(1);
    expect(shippingItems(payload.items)[0]).toMatchObject({
      unidad: "ZZ",
      tipo_tax: "20",
      total_tax: 0,
      total: 5,
    });
    expect(payload.totales).toMatchObject({
      total_exoneradas: 55,
      total_venta: 55,
      total_tax: 0,
    });
    expect(payload.cliente).toMatchObject({
      cliente_tipo_documento: "6",
      cliente_numero_documento: "20123456789",
      cliente_denominacion: "Empresa Cliente SAC",
      cliente_direccion: "Av. Fiscal 456",
    });
    const serialized = JSON.stringify(payload);
    for (const logistic of [
      f.defaultDelivery.name,
      f.defaultDelivery.phone,
      "Olivos",
      "reja negra",
    ])
      expect(serialized).not.toContain(logistic);
  });

  test("C3 PDF, ticket y térmica muestran productos y Envío con el mismo total", async () => {
    const [printOrder, pdfOrder] = await Promise.all([
      findReceiptPrintOrder(c1OrderId, f.ids.company),
      findOrder(c1OrderId, f.ids.company),
    ]);
    if (!printOrder.success || !pdfOrder.success)
      throw new Error("No se pudo leer el pedido");
    const document = await db().document.findUniqueOrThrow({
      where: { id: c1DocumentId },
    });
    const documentView = {
      id: document.id,
      orderId: c1OrderId,
      companyId: f.ids.company,
      documentType: "receipt" as const,
      series: document.series,
      number: String(document.number),
      dateOfIssue: document.dateOfIssue,
      status: "registered" as const,
      netTotal: document.netTotal.toNumber(),
      discountAmount: 0,
      taxTotal: 0,
      total: document.total.toNumber(),
      xml: "",
      qr: "",
      hash: "",
    };
    const company = {
      id: f.ids.company,
      name: "Empresa QA",
      subName: "QA",
      ruc: "20000000001",
      address: "QA",
    } as unknown as Company;

    // Datos de ticket / impresión.
    const printData = buildReceiptPrintData({
      order: printOrder.data,
      company,
      document: documentView,
    });
    expect(printData.order.items.at(-1)?.name).toBe("Envío");
    expect(
      printData.order.items
        .map((i) => [i.name, i.total])
        .sort(([a], [b]) => String(a).localeCompare(String(b))),
    ).toEqual([
      ["Envío", 5],
      ["Producto A", 30],
      ["Producto B", 20],
    ]);
    expect(printData.order.items.at(-1)).toMatchObject({
      quantity: 1,
      unitPrice: 5,
      netTotal: 5,
    });
    expect(printData.order.total).toBe(55);
    expect(printData.document.total).toBe(55);

    // Térmica.
    const commands = buildThermalReceiptCommands(printData, 48);
    const lines = commands.flatMap((cmd) =>
      cmd.type === "text" ? [cmd.value] : [],
    );
    expect(lines.some((line) => line.includes("Envío"))).toBe(true);
    expect(lines.filter((line) => line.includes("Producto"))).toHaveLength(2);
    expect(lines.join("\n")).toContain("55.00");

    // PDF (misma proyección sobre el pedido que lee la ruta de documentos).
    const pdfText = collectText(
      Voucher({ order: pdfOrder.data, company, document: documentView }),
    );
    expect(pdfText).toEqual(
      expect.arrayContaining(["Producto A", "Producto B", "Envío"]),
    );
    expect(pdfText.filter((text) => text === "Envío")).toHaveLength(1);
    expect(pdfOrder.data.total).toBe(55);
  });

  test("C4 reprocesar el outbox reenvía el mismo payload sin documento nuevo", async () => {
    const orderId = await f.createOrder({});
    expect((await f.pay(orderId)).success).toBe(true);
    const document = await f.documentFor(orderId);

    const failed = await f.sendToFactpro(document.id, false);
    expect(failed.result.success).toBe(false);
    expect(
      (await db().document.findUniqueOrThrow({ where: { id: document.id } }))
        .issuedToTaxEntity,
    ).toBe(false);

    const retried = await f.sendToFactpro(document.id, true);
    expect(retried.result.success).toBe(true);
    expect(retried.bodies).toHaveLength(1);
    expect(retried.bodies[0]).toEqual(failed.bodies[0]);
    expect(shippingItems(retried.bodies[0].items)).toHaveLength(1);
    expect((await countFor(orderId)).documents).toBe(1);
    expect(
      (await db().document.findUniqueOrThrow({ where: { id: document.id } }))
        .issuedToTaxEntity,
    ).toBe(true);
  });

  test("C5 el pago combinado suma exactamente 55; 54.99 y 55.01 se rechazan", async () => {
    const orderId = await f.createOrder({});
    const combine = (cash: number, wallet: number) =>
      f.pay(orderId, {
        method: "combine",
        cashReceived: 30,
        contributions: { cash, wallet, debit_card: 0, credit_card: 0 },
        wallet: { name: "Yape", operationCode: "OP-1" },
      });
    for (const [cash, wallet] of [
      [30, 24.99],
      [30, 25.01],
    ] as const) {
      const rejected = await combine(cash, wallet);
      expect(rejected.success, `${cash}+${wallet}`).toBe(false);
      expect(await countFor(orderId)).toEqual({ payments: 0, documents: 0 });
    }
    const accepted = await combine(30, 25);
    expect(accepted, JSON.stringify(accepted)).toMatchObject({
      success: true,
      data: { total: 55 },
    });
    const payments = await db().payment.findMany({ where: { orderId } });
    expect(payments.map((p) => [p.method, p.amount.toNumber()]).sort()).toEqual(
      [
        ["CASH", 30],
        ["WALLET", 25],
      ],
    );
  });

  test("C5b el pago combinado sin efectivo recibido se registra con vuelto 0", async () => {
    const orderId = await f.createOrder({});
    const accepted = await f.pay(orderId, {
      method: "combine",
      contributions: { cash: 30, wallet: 25, debit_card: 0, credit_card: 0 },
      wallet: { name: "Yape", operationCode: "OP-2" },
    });
    expect(accepted, JSON.stringify(accepted)).toMatchObject({ success: true });
    const cash = await db().payment.findFirst({
      where: { orderId, method: "CASH" },
    });
    expect(cash?.data).toMatchObject({ received_amount: 30, change: 0 });
  });

  test("C6 un total desactualizado se rechaza sin pagos ni documento", async () => {
    const orderId = await f.createOrder({});
    const stale = await f.paymentInput(orderId, { method: "debit_card" });
    // Cambio de envío 5 → 8 posterior a la lectura de la pantalla.
    await db().$transaction([
      db().delivery.update({ where: { orderId }, data: { fee: 8 } }),
      db().order.update({
        where: { id: orderId },
        data: { total: 58, netTotal: 58 },
      }),
    ]);
    const rejected = await payTable(f.user("cashier"), stale);
    expect(rejected).toMatchObject({ success: false });
    expect(await countFor(orderId)).toEqual({ payments: 0, documents: 0 });
    expect(
      (await db().order.findUniqueOrThrow({ where: { id: orderId } }))
        .paymentStatus,
    ).toBe("PENDING");

    // Solo el total viejo (con versión vigente) también se rechaza.
    const versionOnly = await f.paymentInput(orderId, { expectedTotal: 55 });
    expect(await payTable(f.user("cashier"), versionOnly)).toMatchObject({
      success: false,
    });
    expect(await countFor(orderId)).toEqual({ payments: 0, documents: 0 });

    // Con el total vigente (58) el cobro procede y el documento lo refleja.
    const fresh = await f.pay(orderId);
    expect(fresh).toMatchObject({ success: true, data: { total: 58 } });
    const { bodies } = await f.sendToFactpro((await f.documentFor(orderId)).id);
    expect(shippingItems(bodies[0].items)[0]).toMatchObject({ total: 8 });
    expect(bodies[0].totales.total_venta).toBe(58);
  });

  test.each(["RETAIL", "DINE_IN"] as const)(
    "C7 la venta %s conserva el payload anterior, sin línea Envío",
    async (orderType) => {
      const orderId = randomUUID();
      await db().order.create({
        data: {
          id: orderId,
          companyId: f.ids.company,
          cashShiftId: f.ids.cashShift,
          orderType,
          status: "COMPLETED",
          paymentStatus: "PAID",
          documentType: "receipt",
          netTotal: 80,
          discountAmount: 0,
          total: 80,
          orderItems: {
            create: [
              {
                productId: f.ids.productA,
                productPrice: 30,
                quantity: 2,
                netTotal: 60,
                discountAmount: 0,
                total: 60,
              },
              {
                productId: f.ids.productB,
                productPrice: 20,
                quantity: 1,
                netTotal: 20,
                discountAmount: 0,
                total: 20,
              },
            ],
          },
        },
      });
      f.orderIds.push(orderId);
      const document = await db().document.create({
        data: {
          orderId,
          companyId: f.ids.company,
          netTotal: 80,
          total: 80,
          documentType: "RECEIPT",
          series: "B001",
          number: 900 + (orderType === "RETAIL" ? 1 : 2),
          dateOfIssue: new Date(),
          status: "REGISTERED",
        },
      });
      const { result, bodies } = await f.sendToFactpro(document.id);
      expect(result.success).toBe(true);
      const base = {
        codigo_producto_sunat: "",
        codigo_producto_gsl: "",
        tipo_tax: "20",
        porcentaje_tax: 0,
        total_tax: 0,
        unidad: "NIU",
      };
      expect(sortByName(bodies[0].items)).toEqual([
        {
          ...base,
          codigo: "PA",
          descripcion: "Producto A",
          cantidad: 2,
          valor_unitario: 30,
          precio_unitario: 30,
          total_base_tax: 60,
          total: 60,
        },
        {
          ...base,
          codigo: "",
          descripcion: "Producto B",
          cantidad: 1,
          valor_unitario: 20,
          precio_unitario: 20,
          total_base_tax: 20,
          total: 20,
        },
      ]);
      expect(bodies[0].items.some((i: any) => i.unidad === "ZZ")).toBe(false);
      expect(bodies[0].totales).toEqual({
        total_exoneradas: 80,
        total_tax: 0,
        total_venta: 80,
        total_gravadas: 0,
        total_exportacion: 0,
        total_inafectas: 0,
        total_gratuitas: 0,
      });

      // Salidas locales: ticket, térmica y PDF sin línea extra y con el mismo total.
      const [printOrder, pdfOrder] = await Promise.all([
        findReceiptPrintOrder(orderId, f.ids.company),
        findOrder(orderId, f.ids.company),
      ]);
      if (!printOrder.success || !pdfOrder.success)
        throw new Error("No se pudo leer el pedido");
      const view = documentView(document, orderId);
      const printData = buildReceiptPrintData({
        order: printOrder.data,
        company: companyView(),
        document: view,
      });
      expect(
        printData.order.items
          .map((i) => [i.name, i.quantity, i.unitPrice, i.total])
          .sort(([x], [y]) => String(x).localeCompare(String(y))),
      ).toEqual([
        ["Producto A", 2, 30, 60],
        ["Producto B", 1, 20, 20],
      ]);
      expect(printData.order.total).toBe(80);
      const thermal = buildThermalReceiptCommands(printData, 48)
        .flatMap((cmd) => (cmd.type === "text" ? [cmd.value] : []))
        .join("\n");
      expect(thermal).not.toContain("Envío");
      expect(thermal).toContain("80.00");
      const pdfText = collectText(
        Voucher({
          order: pdfOrder.data,
          company: companyView(),
          document: view,
        }),
      );
      expect(pdfText).not.toContain("Envío");
      expect(pdfText).toEqual(
        expect.arrayContaining(["Producto A", "Producto B"]),
      );
    },
  );

  test("el pedido sin envío (S/ 0) no genera línea Envío ni stock por ella", async () => {
    const orderId = await f.createOrder({
      delivery: { ...f.defaultDelivery, fee: 0 },
    });
    const stockBefore = await f.stockA();
    expect((await f.pay(orderId)).success).toBe(true);
    const { bodies } = await f.sendToFactpro((await f.documentFor(orderId)).id);
    expect(bodies[0].items).toHaveLength(2);
    expect(shippingItems(bodies[0].items)).toHaveLength(0);
    expect(bodies[0].totales.total_venta).toBe(50);
    // Solo se descuenta la unidad de A cobrada.
    expect(await f.stockA()).toBe(stockBefore! - 1);
    expect(await db().orderItem.count({ where: { orderId } })).toBe(2);
  });

  test("el stock se descuenta al cobrar, solo por los productos y no por el envío", async () => {
    await f.setStockA(10);
    const orderId = await f.createOrder({});
    expect(await f.stockA()).toBe(10);
    const transfers = await db().stockTransfer.count({
      where: { companyId: f.ids.company },
    });
    expect((await f.pay(orderId)).success).toBe(true);
    expect(await f.stockA()).toBe(9);
    // Solo A controla stock: un movimiento, ninguno por el envío.
    expect(
      await db().stockTransfer.count({ where: { companyId: f.ids.company } }),
    ).toBe(transfers + 1);
  });

  test("el efectivo con vuelto se calcula sobre 55 y el vuelto no es ingreso de caja", async () => {
    const orderId = await f.createOrder({
      delivery: { ...f.defaultDelivery, reference: "Paga con 100" },
    });
    const paid = await f.pay(orderId, { method: "cash", cashReceived: 100 });
    expect(paid.success, JSON.stringify(paid)).toBe(true);
    const payment = await db().payment.findFirstOrThrow({ where: { orderId } });
    expect(payment.amount.toNumber()).toBe(55);
    expect(payment.data).toMatchObject({ received_amount: 100, change: 45 });
    const income = await db().payment.aggregate({
      _sum: { amount: true },
      where: { orderId },
    });
    expect(income._sum.amount?.toNumber()).toBe(55);
  });

  test("SELLER no puede cobrar ni por llamada directa a la acción", async () => {
    const orderId = await f.createOrder({});
    mocks.getSession.mockResolvedValue({ user: f.user("seller") });
    const rejected = await confirmTablePayment(
      await f.paymentInput(orderId, { receipt: { documentType: "ticket" } }),
    );
    expect(rejected.success).toBe(false);
    expect(await countFor(orderId)).toEqual({ payments: 0, documents: 0 });
  });

  test("I1 el precio del catálogo cambia antes del cobro y del reenvío: mismo P.U. en ticket, PDF y FactPro", async () => {
    const orderId = await f.createOrder({});
    await db().product.update({
      where: { id: f.ids.productA },
      data: { price: 35 },
    });
    try {
      expect((await f.pay(orderId)).success).toBe(true);
      await db().product.update({
        where: { id: f.ids.productA },
        data: { price: 40 },
      });
      const document = await f.documentFor(orderId);
      const [printOrder, pdfOrder] = await Promise.all([
        findReceiptPrintOrder(orderId, f.ids.company),
        findOrder(orderId, f.ids.company),
      ]);
      if (!printOrder.success || !pdfOrder.success)
        throw new Error("No se pudo leer el pedido");
      const view = documentView(document, orderId);
      const printData = buildReceiptPrintData({
        order: printOrder.data,
        company: companyView(),
        document: view,
      });
      const ticketA = printData.order.items.find(
        (i) => i.name === "Producto A",
      );
      expect(ticketA).toMatchObject({ unitPrice: 30, total: 30 });
      const pdfText = collectText(
        Voucher({
          order: pdfOrder.data,
          company: companyView(),
          document: view,
        }),
      );
      expect(pdfText).toContain(formatPriceWithoutCurrency(30));
      expect(pdfText).not.toContain(formatPriceWithoutCurrency(35));
      expect(pdfText).not.toContain(formatPriceWithoutCurrency(40));
      const { bodies } = await f.sendToFactpro(document.id);
      const itemA = bodies[0].items.find(
        (i: any) => i.descripcion === "Producto A",
      );
      expect(itemA).toMatchObject({
        valor_unitario: 30,
        precio_unitario: 30,
        total: 30,
      });
    } finally {
      await db().product.update({
        where: { id: f.ids.productA },
        data: { price: 30 },
      });
    }
  });

  test("I2 un segundo cobro devuelve el ya registrado y la acción encola solo comprobantes electrónicos", async () => {
    const orderId = await f.createOrder({});
    const ticket = await f.paymentInput(orderId, {
      method: "debit_card",
      receipt: { documentType: "ticket" },
    });
    const enqueue = vi.mocked(enqueueDocumentTaxDispatch);
    enqueue.mockClear();
    const first = await confirmTablePayment(ticket);
    expect(first).toMatchObject({ success: true, data: { state: "paid" } });
    expect(enqueue).not.toHaveBeenCalled();
    // Reintentos, aun con otro medio: mismo resultado y sin filas nuevas.
    expect(await confirmTablePayment(ticket)).toEqual(first);
    expect(
      await payTable(f.user("cashier"), {
        ...ticket,
        method: "cash",
        cashReceived: 60,
      }),
    ).toEqual(first);
    expect(await countFor(orderId)).toEqual({ payments: 1, documents: 1 });

    // Boleta: se encola con el id del documento devuelto.
    const orderId2 = await f.createOrder({});
    const receipt = await confirmTablePayment(
      await f.paymentInput(orderId2, { method: "debit_card" }),
    );
    expect(receipt.success).toBe(true);
    expect(enqueue).toHaveBeenCalledWith(
      receipt.success ? receipt.data.documentId : "",
      f.ids.company,
    );
  });
});
