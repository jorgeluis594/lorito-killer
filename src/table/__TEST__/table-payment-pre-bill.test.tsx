import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import { TablePaymentView } from "../components/table-payment-view";
import type { TablePaymentData } from "../payment-repository";

vi.mock("@/shared/components/ui/use-toast", () => ({
  useToast: () => ({ toast() {} }),
}));
vi.mock("../payment-actions", () => ({}));
vi.mock("../actions", () => ({}));
vi.mock("../components/table-realtime-listener", () => ({
  TableRealtimeListener: () => null,
}));

afterEach(() => vi.unstubAllGlobals());

const base = {
  sessionId: "session-1",
  tableId: "table-1",
  kind: "table",
  title: "Mesa 1",
  deliveryFee: null,
  deliveryStatus: null,
  revision: 1,
  orderVersion: "v1",
  total: 20,
  draftCount: 0,
  status: "OPEN",
  items: [{ id: "i1", name: "Lomo", quantity: 1, total: 20 }],
  receipt: { documentType: "ticket" },
  cashShift: null,
  documents: ["ticket"],
  result: null,
} as unknown as TablePaymentData;

function render(data: Partial<TablePaymentData>, canCollectCash = true) {
  vi.stubGlobal("React", React);
  return renderToStaticMarkup(
    <TablePaymentView
      initialData={{ ...base, ...data }}
      canCollectCash={canCollectCash}
    />,
  );
}

test("a mesa under review shows the pre-bill button", () => {
  expect(render({})).toContain("Imprimir precuenta");
});

test("a mesa waiting at the register can reprint the pre-bill", () => {
  expect(render({ status: "BILL_REQUESTED" }, false)).toContain(
    "Imprimir precuenta",
  );
});

test("a mesa sent to the register keeps the pre-bill button", () => {
  const html = render({
    result: { state: "register", orderId: "o1", total: 20, method: "register" },
  });
  expect(html).toContain("Imprimir precuenta");
});

test("a paid account does not show the pre-bill button", () => {
  const html = render({
    result: { state: "paid", orderId: "o1", total: 20, method: "cash" },
  });
  expect(html).toContain("Cuenta pagada");
  expect(html).not.toContain("Imprimir precuenta");
});

test("delivery and takeaway never show the pre-bill button", () => {
  expect(render({ tableId: null, kind: "delivery" })).not.toContain(
    "Imprimir precuenta",
  );
});

test("an account without items does not show the pre-bill button", () => {
  expect(render({ items: [] })).not.toContain("Imprimir precuenta");
});
