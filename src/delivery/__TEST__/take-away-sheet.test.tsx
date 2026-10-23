import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh() {}, push() {} }),
}));
vi.mock("@/shared/components/ui/use-toast", () => ({
  useToast: () => ({ toast() {} }),
}));
vi.mock("../actions", () => ({}));

import {
  initialTakeAwayFormState,
  TakeAwayForm,
  type TakeAwayFormState,
} from "../components/take-away-sheet";
import {
  SAVED_NAME_TOAST,
  shouldRefreshOnClose,
  submitTakeAwaySheet,
} from "../use-cases/take-away-sheet-flow";
import type { SaveCustomerNameResult } from "../types";

const render = (mode: "create" | "edit", state: TakeAwayFormState) =>
  renderToStaticMarkup(
    <TakeAwayForm
      mode={mode}
      state={state}
      onNameChange={() => {}}
      onPaste={() => {}}
      onSubmit={() => {}}
    />,
  );

type SaveInput = {
  sessionId: string;
  customerName: string | null;
  expectedName: string | null;
};
const noOpen = vi.fn();
const flow = (
  mode: "create" | "edit",
  overrides: Partial<Parameters<typeof submitTakeAwaySheet>[0]> = {},
) =>
  submitTakeAwaySheet({
    mode,
    sessionId: "00000000-0000-4000-8000-000000000001",
    name: "Rosa M.",
    expectedName: "Rosa",
    openTakeAway: noOpen,
    saveCustomerName: vi.fn(),
    ...overrides,
  });

describe("TakeAwaySheet", () => {
  test("la hoja abre con el campo «Nombre del cliente» sin autocompletado y con **Continuar al pedido** activo vacío", () => {
    const html = render("create", initialTakeAwayFormState(null));
    expect(html).toContain("Nombre del cliente");
    expect(html).toContain('autoComplete="off"');
    expect(html).toContain('maxLength="120"');
    expect(html).toContain('enterKeyHint="go"');
    expect(html).toContain("Continuar al pedido");
    expect(html).not.toContain('disabled=""');
    expect(html).toContain("Si lo dejas vacío, se muestra la hora del pedido.");
  });

  test("la hoja de edición carga el nombre actual y su acción es **Guardar nombre**", () => {
    const html = render("edit", initialTakeAwayFormState("Rosa"));
    expect(html).toContain('value="Rosa"');
    expect(html).toContain("Guardar nombre");
    expect(html).not.toContain("Continuar al pedido");
  });

  test("el aviso de recorte se anuncia como ayuda y el error del servidor como error", () => {
    const truncated = render("create", {
      ...initialTakeAwayFormState(null),
      truncated: true,
    });
    expect(truncated).toContain("Se recortó a 120 caracteres.");
    expect(truncated).toContain('aria-live="polite"');
    const invalid = render("create", {
      ...initialTakeAwayFormState(null),
      fieldError: "El nombre puede tener hasta 120 caracteres.",
    });
    expect(invalid).toContain('aria-invalid="true"');
    expect(invalid).toContain("text-destructive");
  });

  test("sin pedido disponible solo queda volver a Mesas", () => {
    const html = render("edit", {
      ...initialTakeAwayFormState("Rosa"),
      unavailable: true,
      message: "Este pedido ya se cerró.",
    });
    expect(html).toContain("Volver a Mesas");
    expect(html).not.toContain("Guardar nombre");
  });

  test("tras un conflicto de nombre la hoja conserva lo escrito y envía el nombre vigente como esperado en el siguiente guardado", async () => {
    const saveCustomerName = vi
      .fn<(input: SaveInput) => Promise<SaveCustomerNameResult>>()
      .mockResolvedValueOnce({
        success: false,
        type: "CustomerNameConflict",
        message:
          "Otro dispositivo cambió el nombre a Rosita. Revisa y vuelve a guardar.",
        currentName: "Rosita",
      } satisfies SaveCustomerNameResult)
      .mockResolvedValueOnce({
        success: true,
        data: { sessionId: "s", customerName: "Rosa M.", changed: true },
      } satisfies SaveCustomerNameResult);
    const first = await flow("edit", { saveCustomerName });
    expect(first).toMatchObject({ kind: "conflict", currentName: "Rosita" });
    // La hoja adopta el nombre vigente y no toca lo escrito.
    const second = await flow("edit", {
      saveCustomerName,
      expectedName: first.kind === "conflict" ? first.currentName : null,
    });
    expect(saveCustomerName).toHaveBeenLastCalledWith(
      expect.objectContaining({
        customerName: "Rosa M.",
        expectedName: "Rosita",
      }),
    );
    expect(second).toEqual({ kind: "saved", customerName: "Rosa M." });
  });

  test("cerrar la hoja sin haber enviado no refresca Mesas; cerrarla tras una respuesta perdida sí", async () => {
    expect(shouldRefreshOnClose(initialTakeAwayFormState(null))).toBe(false);
    const lost = await flow("create", {
      openTakeAway: vi.fn().mockRejectedValue(new Error("offline")),
    });
    expect(lost).toEqual({
      kind: "uncertain",
      message:
        "No se recibió la respuesta. Vuelve a tocar Continuar al pedido: si el pedido ya se creó, se abre ese mismo.",
    });
    expect(shouldRefreshOnClose({ uncertain: lost.kind === "uncertain" })).toBe(
      true,
    );
  });

  test("guardar el nombre con éxito cierra la hoja y muestra «Nombre guardado»", async () => {
    const outcome = await flow("edit", {
      saveCustomerName: vi.fn().mockResolvedValue({
        success: true,
        data: { sessionId: "s", customerName: "Rosa M.", changed: true },
      }),
    });
    expect(outcome.kind).toBe("saved");
    expect(SAVED_NAME_TOAST).toBe("Nombre guardado");
  });

  test("una falla técnica al guardar deja la hoja abierta con lo escrito", async () => {
    const outcome = await flow("edit", {
      saveCustomerName: vi.fn().mockResolvedValue({
        success: false,
        message: "No se pudo guardar el nombre. Vuelve a intentarlo.",
      }),
    });
    expect(outcome).toEqual({
      kind: "rejected",
      message: "No se pudo guardar el nombre. Vuelve a intentarlo.",
    });
  });

  test("repetir Continuar al pedido envía la misma clave del intento", async () => {
    const openTakeAway = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ success: true, data: { sessionId: "k" } });
    await flow("create", { openTakeAway, sessionId: "k" });
    const retry = await flow("create", { openTakeAway, sessionId: "k" });
    expect(retry).toEqual({ kind: "opened", sessionId: "k" });
    expect(openTakeAway.mock.calls.map(([input]) => input.sessionId)).toEqual([
      "k",
      "k",
    ]);
  });

  test("el rechazo de más de 120 caracteres queda en el campo y un pedido cerrado ofrece Mesas", async () => {
    expect(
      await flow("create", {
        openTakeAway: vi.fn().mockResolvedValue({
          success: false,
          message: "El nombre puede tener hasta 120 caracteres.",
          errors: {
            customerName: "El nombre puede tener hasta 120 caracteres.",
          },
        }),
      }),
    ).toMatchObject({ kind: "invalid" });
    expect(
      await flow("edit", {
        saveCustomerName: vi.fn().mockResolvedValue({
          success: false,
          type: "SessionClosed",
          message: "Este pedido ya se cerró.",
        }),
      }),
    ).toEqual({ kind: "unavailable", message: "Este pedido ya se cerró." });
  });
});
