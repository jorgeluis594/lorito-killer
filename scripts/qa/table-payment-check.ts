import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import bcrypt from "bcrypt";
import prisma from "../../src/lib/prisma";
import {
  getTablePaymentData,
  payTable,
} from "../../src/table/payment-repository";
import {
  findKitchenItems,
  takePendingOrderItem,
  markPreparingOrderItemReady,
  servePaidKitchenItem,
} from "../../src/kitchen/db_repository";
import { updateSessionStatus } from "../../src/table/db_repository";
import type { AuthorizedUser } from "../../src/authorization/server";
import type { TablePaymentInput } from "../../src/table/payment-schema";

async function clean(companyId: string) {
  const db = prisma();
  const company = await db.company.findUnique({ where: { id: companyId } });
  assert(
    company?.subdomain?.startsWith("pagos-") &&
      company.name === "Prueba de pagos",
  );
  await db.$transaction(async (tx) => {
    await tx.orderItemCancellation.deleteMany({ where: { orderRoundItem: { orderRound: { order: { companyId } } } } });
    await tx.orderRoundItem.deleteMany({ where: { orderRound: { order: { companyId } } } });
    await tx.orderRound.deleteMany({ where: { order: { companyId } } });
    await tx.document.deleteMany({ where: { companyId } });
    await tx.payment.deleteMany({ where: { order: { companyId } } });
    await tx.stockTransfer.deleteMany({ where: { companyId } });
    await tx.order.deleteMany({ where: { companyId } });
    await tx.tableSession.deleteMany({ where: { companyId } });
    await tx.table.deleteMany({ where: { companyId } });
    await tx.zone.deleteMany({ where: { companyId } });
    await tx.cashShift.deleteMany({ where: { companyId } });
    await tx.customer.deleteMany({ where: { companyId } });
    await tx.product.deleteMany({ where: { companyId } });
    await tx.user.deleteMany({ where: { companyId } });
    await tx.company.delete({ where: { id: companyId } });
  });
}

async function main() {
  assert.equal(
    new URL(process.env.DATABASE_URL!).hostname,
    "postgres",
    "Run only against the local Docker database",
  );
  const db = prisma();
  if (process.argv.includes("--cleanup")) {
    const fixture = JSON.parse(
      readFileSync("/tmp/table-payment-fixture.json", "utf8"),
    );
    await clean(fixture.companyId);
    await db.$disconnect();
    console.log("Temporary payment test data removed.");
    return;
  }
  const company = await db.company.create({
    data: {
      name: "Prueba de pagos",
      address: "Local de pruebas",
      subdomain: `pagos-${Date.now()}`,
      billingCredentials: {
        ticketSerialNumber: "QA01",
        receiptSerialNumber: "BQA1",
        invoiceSerialNumber: "FQA1",
      },
      features: { create: { key: "restaurants", enabled: true } },
    },
  });
  const password = "PruebaPagos2026!";
  const hash = await bcrypt.hash(password, 10);
  const waiter = await db.user.create({
    data: {
      companyId: company.id,
      email: `mozo-${company.subdomain}@example.test`,
      password: hash,
      name: "Mozo de prueba",
      role: "WAITER",
    },
  });
  const cashier = await db.user.create({
    data: {
      companyId: company.id,
      email: `caja-${company.subdomain}@example.test`,
      password: hash,
      name: "Caja principal",
      role: "CASHIER",
    },
  });
  const kitchen = await db.user.create({
    data: {
      companyId: company.id,
      email: `cocina-${company.subdomain}@example.test`,
      password: hash,
      name: "Cocina",
      role: "KITCHEN",
    },
  });
  const user = { ...waiter, companyId: company.id } as AuthorizedUser;
  const shift = await db.cashShift.create({
    data: {
      companyId: company.id,
      userId: cashier.id,
      status: "OPEN",
      openedAt: new Date(),
      initialAmount: 0,
    },
  });
  const zone = await db.zone.create({
    data: { companyId: company.id, name: "Salón" },
  });
  const product = await db.product.create({
    data: {
      companyId: company.id,
      name: "Lomo saltado",
      description: "",
      price: 38,
      stock: 1000,
      productType: "SINGLE_PRODUCT",
      unitType: "UNIT",
      preparationStation: "KITCHEN",
    },
  });
  const drink = await db.product.create({
    data: {
      companyId: company.id,
      name: "Chicha morada",
      description: "",
      price: 12,
      stock: 1000,
      productType: "SINGLE_PRODUCT",
      unitType: "UNIT",
      preparationStation: "BAR",
    },
  });
  let number = 0;
  async function createAccount() {
    const table = await db.table.create({
      data: {
        companyId: company.id,
        zoneId: zone.id,
        number: ++number,
        capacity: 4,
      },
    });
    const session = await db.tableSession.create({
      data: {
        companyId: company.id,
        tableId: table.id,
        waiterId: waiter.id,
        order: {
          create: {
            companyId: company.id,
            status: "PENDING",
            orderType: "DINE_IN",
            total: 100,
            netTotal: 100,
            discountAmount: 0,
            orderItems: {
              create: [
                {
                  productId: product.id,
                  quantity: 2,
                  productPrice: 38,
                  total: 76,
                  netTotal: 76,
                  discountAmount: 0,
                  kitchenStatus: "PREPARING",
                  preparationStation: "KITCHEN",
                },
                {
                  productId: drink.id,
                  quantity: 2,
                  productPrice: 12,
                  total: 24,
                  netTotal: 24,
                  discountAmount: 0,
                  kitchenStatus: "READY",
                  preparationStation: "BAR",
                },
                {
                  productId: product.id,
                  quantity: 0,
                  productPrice: 38,
                  total: 0,
                  netTotal: 0,
                  discountAmount: 0,
                  kitchenStatus: "CANCELLED",
                  preparationStation: "KITCHEN",
                },
              ],
            },
          },
        },
      },
      include: { order: { include: { orderItems: true } } },
    });
    const round = await db.orderRound.create({
      data: {
        id: crypto.randomUUID(),
        orderId: session.order!.id,
        number: 1,
        responsibleUserId: waiter.id,
        requestHash: crypto.randomUUID(),
      },
    });
    await db.orderRoundItem.createMany({
      data: session.order!.orderItems.map((item) => ({
        orderRoundId: round.id,
        orderItemId: item.id,
        productId: item.productId,
        productName: item.productId === drink.id ? "Chicha morada" : "Lomo saltado",
        quantity: item.quantity,
      })),
    });
    return session;
  }
  async function inputFor(
    session: Awaited<ReturnType<typeof createAccount>>,
  ): Promise<TablePaymentInput> {
    const result = await getTablePaymentData(
      company.id,
      session.tableId,
      session.id,
    );
    assert(result.success);
    return {
      sessionId: session.id,
      revision: result.data.revision,
      orderVersion: result.data.orderVersion,
      expectedTotal: result.data.total,
      cashShiftId: shift.id,
      method: "wallet",
      receipt: { documentType: "ticket" },
    };
  }
  const account = await createAccount();
  const input = await inputFor(account);
  const [first, racing] = await Promise.all([
    payTable(user, input),
    payTable(user, input),
  ]);
  assert(first.success || racing.success, JSON.stringify([first, racing]));
  const retry = await payTable(user, input);
  assert(retry.success);
  assert.equal(
    await db.payment.count({ where: { orderId: account.order!.id } }),
    1,
  );
  assert.equal(
    await db.document.count({ where: { orderId: account.order!.id } }),
    1,
  );
  const paid = await db.order.findUniqueOrThrow({
    where: { id: account.order!.id },
    include: { payments: true },
  });
  assert.equal(paid.cashShiftId, shift.id);
  assert.equal(paid.sellerId, waiter.id);
  assert.equal(
    (paid.payments[0].data as { confirmedById: string }).confirmedById,
    waiter.id,
  );
  assert.equal(
    (
      await db.product.findUniqueOrThrow({ where: { id: product.id } })
    ).stock!.toNumber(),
    998,
  );
  assert.equal(
    (await db.tableSession.findUniqueOrThrow({ where: { id: account.id } }))
      .current,
    true,
  );
  const kitchenItems = await findKitchenItems(company.id, "KITCHEN");
  assert(kitchenItems.success);
  assert(
    kitchenItems.data.some(
      (item) => item.id === account.order!.orderItems[0].id && item.paid,
    ),
  );
  const ready = await markPreparingOrderItemReady({
    companyId: company.id,
    userId: kitchen.id,
    role: "KITCHEN",
    orderItemId: account.order!.orderItems[0].id,
  });
  assert(ready.success);
  const served = await servePaidKitchenItem({
    companyId: company.id,
    userId: kitchen.id,
    role: "KITCHEN",
    orderItemId: account.order!.orderItems[0].id,
  });
  assert(served.success);
  const referral = await createAccount();
  const referred = await payTable(user, {
    ...(await inputFor(referral)),
    method: "register",
  });
  assert(referred.success);
  assert.equal(
    await db.payment.count({ where: { orderId: referral.order!.id } }),
    0,
  );
  assert.equal(
    (await db.tableSession.findUniqueOrThrow({ where: { id: referral.id } }))
      .current,
    true,
  );
  const cash = await payTable(
    { ...cashier, companyId: company.id } as AuthorizedUser,
    {
      ...(await inputFor(referral)),
      method: "combine",
      contributions: { cash: 40, debit_card: 60, credit_card: 0, wallet: 0 },
      cashReceived: 50,
    },
  );
  assert(cash.success, JSON.stringify(cash));
  const stale = await createAccount();
  const staleInput = await inputFor(stale);
  await db.order.update({
    where: { id: stale.order!.id },
    data: { total: 101 },
  });
  assert.equal((await payTable(user, staleInput)).success, false);
  assert.equal(
    (await db.tableSession.findUniqueOrThrow({ where: { id: stale.id } }))
      .current,
    true,
  );
  assert.equal(
    await db.payment.count({ where: { orderId: stale.order!.id } }),
    0,
  );
  assert.equal(
    (await updateSessionStatus(account.id, company.id, "CLOSED")).success,
    true,
    "A paid table can be released explicitly",
  );
  const rollback = await createAccount();
  const stockBefore = (
    await db.product.findUniqueOrThrow({ where: { id: product.id } })
  ).stock!.toNumber();
  await db.product.update({ where: { id: drink.id }, data: { stock: 0 } });
  assert.equal((await payTable(user, await inputFor(rollback))).success, false);
  assert.equal(
    (
      await db.product.findUniqueOrThrow({ where: { id: product.id } })
    ).stock!.toNumber(),
    stockBefore,
    "Stock rollback must include earlier line writes",
  );
  assert.equal(
    await db.payment.count({ where: { orderId: rollback.order!.id } }),
    0,
  );
  assert.equal(
    (await db.tableSession.findUniqueOrThrow({ where: { id: rollback.id } }))
      .current,
    true,
  );
  await db.product.update({ where: { id: drink.id }, data: { stock: 1000 } });
  const uiAccount = await createAccount();
  const uiReferral = await createAccount();
  const uiInvoice = await createAccount();
  const ids = {
    companyId: company.id,
    subdomain: company.subdomain,
    waiterEmail: waiter.email,
    cashierEmail: cashier.email,
    password,
    tableId: uiAccount.tableId,
    sessionId: uiAccount.id,
    referralTableId: uiReferral.tableId,
    referralSessionId: uiReferral.id,
    invoiceTableId: uiInvoice.tableId,
    invoiceSessionId: uiInvoice.id,
  };
  if (process.argv.includes("--keep"))
    writeFileSync("/tmp/table-payment-fixture.json", JSON.stringify(ids));
  else await clean(company.id);
  console.log(
    "PASS: atomic payment, concurrent retry, shared cashier shift, waiter attribution, one stock deduction, preparation after payment, referral, cashier combined payment, stale total. Browser fixtures ready.",
  );
  await db.$disconnect();
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
