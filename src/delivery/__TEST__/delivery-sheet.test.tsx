import { describe, expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh() {}, push() {} }),
}));
vi.mock("@/shared/components/ui/use-toast", () => ({
  useToast: () => ({ toast() {} }),
}));
vi.mock("../actions", () => ({}));

import { deliveryFields } from "../components/delivery-sheet";

describe("DeliverySheet", () => {
  test("la hoja de delivery muestra «Nombre del cliente» con autocompletado desactivado y la ayuda nueva", () => {
    const name = deliveryFields.find((field) => field.key === "name")!;
    expect(name.label).toBe("Nombre del cliente");
    expect(name.props.autoComplete).toBe("off");
    expect(name.props.maxLength).toBe(120);
    expect(name.hint).toBe(
      "Si lo dejas vacío, la tarjeta muestra el teléfono y la comanda la hora del pedido.",
    );
  });
});
