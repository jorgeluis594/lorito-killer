import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { TableOrderView } from "../components/table-order-view";
import type { TableSession } from "../types";

const draft = vi.hoisted(() => ({
  state: { error: "", errorType: undefined as string | undefined },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh() {}, push() {} }),
}));
vi.mock("@/shared/components/ui/use-toast", () => ({
  useToast: () => ({ toast() {} }),
}));
vi.mock("@/category/components/category-store-provider", () => ({
  useCategoryStore: (select: (state: unknown) => unknown) =>
    select({ categories: [] }),
}));
vi.mock("../components/use-table-draft", () => ({
  useTableDraft: () => ({ items: [], status: "saved", ...draft.state }),
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

beforeEach(() => {
  vi.stubGlobal("React", React);
  draft.state = { error: "", errorType: undefined };
});
afterEach(() => vi.unstubAllGlobals());

const render = (session: Partial<TableSession>, title = "Pedido") =>
  renderToStaticMarkup(
    <TableOrderView
      session={
        {
          id: "session-1",
          status: "OPEN",
          tableId: null,
          delivery: null,
          order: null,
          ...session,
        } as TableSession
      }
      title={title}
      paymentHref="/pay"
      canEdit
    />,
  );

const delivery = {
  status: "PENDING",
  phone: "987654321",
  address: "Av. Sol 1",
  fee: 0,
} as TableSession["delivery"];

test("un para llevar vacío muestra «Liberar pedido» y no «Liberar mesa»", () => {
  const html = render({});
  expect(html).toContain("Liberar pedido");
  expect(html).not.toContain("Liberar mesa");
});

test("un delivery vacío muestra «Liberar delivery»", () => {
  expect(render({ delivery })).toContain("Liberar delivery");
});

test("una mesa vacía sigue mostrando «Liberar mesa»", () => {
  const html = render({ tableId: "table-4" }, "Mesa 4");
  expect(html).toContain("Liberar mesa");
  expect(html).toContain('aria-label="Pedido de la mesa"');
});

test("la sección del pedido sin mesa se anuncia como «Pedido»", () => {
  const html = render({});
  expect(html).toContain('aria-label="Pedido"');
  expect(html).not.toContain("Pedido de la mesa");
});

test("un rechazo RoundConflict al enviar muestra «Ver pedido guardado»", () => {
  draft.state = {
    error:
      "Otro envío cambió el pedido. Actualiza la mesa y vuelve a intentarlo.",
    errorType: "RoundConflict",
  };
  const html = render({});
  expect(html).toContain(
    "Otro envío cambió el pedido. Actualiza el pedido y vuelve a intentarlo.",
  );
  expect(html).toContain("Ver pedido guardado");
  expect(html).not.toContain("Ir al cobro");
});

test("un rechazo OrderLocked muestra «Volver a Mesas» e «Ir al cobro»", () => {
  draft.state = {
    error: "Esta mesa ya no admite cambios en el pedido.",
    errorType: "OrderLocked",
  };
  const html = render({});
  expect(html).toContain("Este pedido ya no admite cambios.");
  expect(html).toContain("Volver a Mesas");
  expect(html).toContain("Ir al cobro");
  expect(html).not.toContain("Ver pedido guardado");
});

test("un rechazo SessionClosed al liberar muestra «Este pedido ya se cerró.» con «Volver a Mesas»", () => {
  draft.state = {
    error: "La mesa cambió en otro dispositivo.",
    errorType: "SessionClosed",
  };
  const html = render({});
  expect(html).toContain("Este pedido ya se cerró.");
  expect(html).toContain("Volver a Mesas");
  expect(html).not.toContain("Reintentar guardado");
});

test("una mesa conserva el texto del servidor y los botones por type", () => {
  draft.state = {
    error: "La mesa cambió en otro dispositivo. Tus cambios siguen aquí.",
    errorType: "SessionChanged",
  };
  const html = render({ tableId: "table-4" }, "Mesa 4");
  expect(html).toContain("La mesa cambió en otro dispositivo.");
  expect(html).toContain("Ver pedido guardado");
});
