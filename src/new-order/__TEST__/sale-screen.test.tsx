import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";
import { initOrderFormStore } from "../store";
import Cart from "../components/cart/cart";

const state = vi.hoisted(() => ({
  order: {} as ReturnType<typeof initOrderFormStore>["order"],
}));
vi.mock("@/new-order/order-form-provider", () => ({
  useOrderFormStore: (selector: (value: typeof state) => unknown) =>
    selector(state),
  useOrderFormActions: () => ({}),
}));
vi.mock("@/lib/use-company", () => ({
  useCompany: () => ({ isBillingActivated: true }),
}));
vi.mock("@/cash-shift/components/cash-shift-provider", () => ({
  useCashShift: () => ({ id: "test-shift" }),
}));
vi.mock("@/category/components/category-store-provider", () => ({
  useCategoryStore: () => ({ categories: [] }),
}));
vi.mock("@/cash-shift/components/add_expense", () => ({ default: () => null }));
vi.mock("@/customer/components/new-customer-modal", () => ({
  default: () => null,
}));
vi.mock("@/new-order/components/create-order-modal/payment-modal", () => ({
  default: () => null,
}));

beforeEach(() => {
  state.order = initOrderFormStore().order;
});

test("name search is available without opening the catalogue and an empty sale cannot proceed", () => {
  const html = renderToStaticMarkup(<Cart />);
  expect(html).toContain('aria-label="Buscar por nombre o código de barras"');
  expect(html).toContain('aria-controls="sale-product-results"');
  expect(html).toContain('aria-label="Vistas de venta"');
  expect(html).toContain("Venta actual");
  expect(html).not.toContain("Explorar productos");
  expect(html).not.toContain("Mostrar Carrito");
  expect(html).not.toContain("Vaciar venta");
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Continuar al pago/);
});

test("a populated sale exposes quantity and removal controls alongside discounted amounts", () => {
  state.order.orderItems = [
    {
      id: "item",
      productId: "product",
      productName: "Agua",
      productPrice: 3,
      quantity: 2,
      unitType: "unit",
      netTotal: 6,
      discountAmount: 1,
      total: 5,
    },
  ];
  state.order.netTotal = 5;
  state.order.total = 5;
  const html = renderToStaticMarkup(<Cart />);
  expect(html).toContain('aria-label="Cantidad de Agua"');
  expect(html).toContain('aria-label="Quitar Agua"');
  expect(html).toContain('aria-label="Descuento de Agua"');
  expect(html).toContain("Descuento:");
  expect(html).toContain("5.00");
  expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>Continuar al pago/);
});

test("an invoice without a customer exposes customer selection before proceeding to payment", () => {
  state.order.documentType = "invoice";
  const html = renderToStaticMarkup(<Cart />);
  expect(html).toContain("Selecciona o crea un cliente con RUC");
  expect(html).toContain("Completar cliente");
  expect(html).not.toContain("Continuar al pago");
});
