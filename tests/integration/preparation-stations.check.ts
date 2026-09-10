// Run against an isolated migrated database:
// DATABASE_URL=... npx tsx tests/integration/preparation-stations.check.ts
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import prisma from "../../src/lib/prisma";
import { addRound } from "../../src/table/use-cases/add-round";
import {
  findKitchenItems,
  takePendingOrderItem,
  markPreparingOrderItemReady,
  serveReadyRound,
} from "../../src/kitchen/db_repository";

async function main() {
  const db = prisma();
  const companies: string[] = [];
  try {
    async function fixture() {
      const company = await db.company.create({
        data: { address: "GAP09 integration", name: randomUUID() },
      });
      companies.push(company.id);
      const user = await db.user.create({
        data: {
          companyId: company.id,
          email: `${randomUUID()}@example.test`,
          password: "unused",
          role: "ADMIN",
        },
      });
      const zone = await db.zone.create({
        data: { companyId: company.id, name: "Integration" },
      });
      const table = await db.table.create({
        data: {
          companyId: company.id,
          zoneId: zone.id,
          number: 1,
          capacity: 4,
        },
      });
      const session = await db.tableSession.create({
        data: { companyId: company.id, tableId: table.id, waiterId: user.id },
      });
      const order = await db.order.create({
        data: {
          companyId: company.id,
          tableSessionId: session.id,
          status: "PENDING",
          discountAmount: 0,
          total: 0,
          netTotal: 0,
          orderType: "DINE_IN",
        },
      });
      const products = [];
      for (const station of ["KITCHEN", "BAR", null] as const)
        products.push(
          await db.product.create({
            data: {
              companyId: company.id,
              name: station ?? "Unassigned",
              preparationStation: station,
              price: 10,
              description: "",
              productType: "SERVICE_PRODUCT",
            },
          }),
        );
      const result = await addRound(
        table.id,
        company.id,
        products.map((p) => ({ productId: p.id, quantity: 1 })),
      );
      assert.equal(result.success, true);
      const items = await db.orderItem.findMany({
        where: { orderId: order.id },
        orderBy: { product: { name: "asc" } },
      });
      return { company, user, table, order, products, items };
    }
    const a = await fixture();
    const b = await fixture();
    const kitchen = a.items.find((i) => i.preparationStation === "KITCHEN")!;
    const bar = a.items.find((i) => i.preparationStation === "BAR")!;
    const unassigned = a.items.find((i) => i.preparationStation === null)!;
    const input = {
      companyId: a.company.id,
      userId: a.user.id,
      role: "KITCHEN" as const,
    };
    for (const [role, expected] of [
      ["KITCHEN", [kitchen.id]],
      ["BARTENDER", [bar.id]],
      ["ADMIN", a.items.map((i) => i.id)],
      ["WAITER", []],
    ] as const) {
      const queue = await findKitchenItems(a.company.id, role);
      assert.ok(queue.success);
      assert.deepEqual(
        queue.data.map((i) => i.id).sort(),
        [...expected].sort(),
      );
    }
    for (const id of [bar.id, unassigned.id, b.items[0].id])
      assert.equal(
        (await takePendingOrderItem({ ...input, orderItemId: id })).success,
        false,
      );
    assert.equal(
      (
        await takePendingOrderItem({
          ...input,
          role: "BARTENDER",
          orderItemId: kitchen.id,
        })
      ).success,
      false,
    );
    assert.equal(
      (await takePendingOrderItem({ ...input, orderItemId: kitchen.id }))
        .success,
      true,
    );
    assert.equal(
      (await takePendingOrderItem({ ...input, orderItemId: kitchen.id }))
        .success,
      false,
    );
    assert.equal(
      (
        await markPreparingOrderItemReady({
          ...input,
          role: "BARTENDER",
          orderItemId: kitchen.id,
        })
      ).success,
      false,
    );
    assert.equal(
      (await markPreparingOrderItemReady({ ...input, orderItemId: kitchen.id }))
        .success,
      true,
    );
    const serve = {
      companyId: a.company.id,
      userId: a.user.id,
      tableId: a.table.id,
      round: 1,
    };
    assert.equal((await serveReadyRound(serve)).success, false);
    for (const item of [bar, unassigned]) {
      const role = item === bar ? "BARTENDER" : "ADMIN";
      assert.equal(
        (await takePendingOrderItem({ ...input, role, orderItemId: item.id }))
          .success,
        true,
      );
      assert.equal(
        (
          await markPreparingOrderItemReady({
            ...input,
            role,
            orderItemId: item.id,
          })
        ).success,
        true,
      );
    }
    assert.equal((await serveReadyRound(serve)).success, true);
    assert.equal((await serveReadyRound(serve)).success, false);
    await db.product.update({
      where: { id: kitchen.productId },
      data: { preparationStation: "BAR" },
    });
    assert.equal(
      (
        await addRound(a.table.id, a.company.id, [
          { productId: kitchen.productId, quantity: 1 },
        ])
      ).success,
      true,
    );
    const history = await db.orderItem.findMany({
      where: { orderId: a.order.id, productId: kitchen.productId },
      orderBy: { round: "asc" },
    });
    assert.deepEqual(
      history.map((i) => [i.round, i.preparationStation, i.kitchenStatus]),
      [
        [1, "KITCHEN", "SERVED"],
        [2, "BAR", "PENDING"],
      ],
    );
    assert.ok(history[0].servedAt);
    assert.equal(history[0].servedById, a.user.id);
    console.log(
      "PASS: mixed round, station/tenant permissions, unassigned queue, transitions, served audit, immutable history",
    );
  } finally {
    for (const companyId of companies) {
      await db.order.deleteMany({ where: { companyId } });
      await db.tableSession.deleteMany({ where: { companyId } });
      await db.user.deleteMany({ where: { companyId } });
      await db.company.delete({ where: { id: companyId } });
    }
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
