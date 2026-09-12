import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import { TableOrderView } from "../components/table-order-view";
import type { TableWithSession } from "../types";

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
  const table = {
    id: "table-3",
    number: 3,
    activeSession: { id: "session-3", status: "OPEN", order: null },
  } as TableWithSession;
  const html = renderToStaticMarkup(<TableOrderView table={table} />);
  expect(html).toContain('aria-label="Categorías de productos"');
  expect(html).toContain("Bebidas");
  expect(html).toContain("Todos los productos");
  expect(html).not.toContain('aria-label="Buscar productos"');
  expect(html).not.toContain("Cargando productos");
  expect(html).toContain("Ver pedido");
});
