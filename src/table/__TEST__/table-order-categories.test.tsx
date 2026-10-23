import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import { TableOrderView } from "../components/table-order-view";
import type { TableSession } from "../types";

const { categories } = vi.hoisted(() => ({
  categories: [{ id: "drinks", name: "Bebidas" }],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh() {}, push() {} }),
}));
vi.mock("@/shared/components/ui/use-toast", () => ({
  useToast: () => ({ toast() {} }),
}));
vi.mock("@/category/components/category-store-provider", () => ({
  useCategoryStore: (select: (state: unknown) => unknown) =>
    select({ categories }),
}));
vi.mock("../components/use-table-draft", () => ({
  useTableDraft: () => ({ items: [], status: "saved", error: "" }),
}));
vi.mock("../actions", () => ({}));
vi.mock("@/kitchen/actions", () => ({}));
vi.mock("../components/table-realtime-listener", () => ({
  TableRealtimeListener: () => null,
}));
vi.mock("../components/cancel-order-item-dialog", () => ({
  CancelOrderItemDialog: () => null,
}));
vi.mock("@/new-order/components/product-thumbnail", () => ({
  default: () => null,
}));

afterEach(() => vi.unstubAllGlobals());

test("starts with category cards and keeps uncategorized products reachable", () => {
  vi.stubGlobal("React", React);
  const session = {
    id: "session-3",
    status: "OPEN",
    order: null,
  } as TableSession;
  const html = renderToStaticMarkup(
    <TableOrderView session={session} title="Mesa 3" paymentHref="/pay" />,
  );
  expect(html).toContain("Mesa 3");
  expect(html).toContain('aria-label="Categorías de productos"');
  expect(html).toContain("Bebidas");
  expect(html).toContain("Todos los productos");
  expect(html).not.toContain('aria-label="Buscar productos"');
  expect(html).not.toContain("Cargando productos");
  expect(html).toContain("Ver pedido");
});

test("a dispatched delivery adds the fee to the account and locks products", () => {
  vi.stubGlobal("React", React);
  const session = {
    id: "session-d",
    status: "OPEN",
    order: {
      id: "order-d",
      orderItems: [
        {
          id: "i",
          productId: "p",
          productName: "Lomo",
          productPrice: 30,
          quantity: 1,
          total: 30,
          round: 1,
        },
      ],
    },
    delivery: {
      status: "DISPATCHED",
      name: "Ana",
      phone: "987654321",
      address: "Av. Sol 123",
      reference: null,
      fee: 5,
      dispatchedAt: null,
    },
  } as unknown as TableSession;
  const html = renderToStaticMarkup(
    <TableOrderView
      session={session}
      title="Delivery · Ana"
      paymentHref="/pay"
    />,
  );
  expect(html).toContain("Envío");
  expect(html).toContain("ya no admite productos");
  expect(html).toMatch(/Cobrar cuenta[^<]*·[^<]*35/);
});

test("the order-taking screen never offers the pre-bill, even with sent items", () => {
  vi.stubGlobal("React", React);
  const session = {
    id: "session-p",
    tableId: "table-p",
    status: "OPEN",
    order: {
      id: "order-p",
      orderItems: [
        {
          id: "i",
          productId: "p",
          productName: "Lomo",
          productPrice: 30,
          quantity: 1,
          total: 30,
          round: 1,
        },
      ],
    },
  } as unknown as TableSession;
  const html = renderToStaticMarkup(
    <TableOrderView session={session} title="Mesa 5" paymentHref="/pay" />,
  );
  expect(html).toContain("Lomo");
  expect(html).not.toContain("Imprimir precuenta");
});
