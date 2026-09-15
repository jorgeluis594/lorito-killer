import { describe, expect, test } from "vitest";
import { createKitchenTicketContent } from "../create-kitchen-ticket-content";

describe("createKitchenTicketContent", () => {
  test("creates immutable ESC/POS bytes with preparation data and no prices", () => {
    const content = createKitchenTicketContent(
      {
        ticketId: "ticket-1",
        createdAt: new Date("2026-09-15T18:30:00Z"),
        kitchenName: "Cocina",
        orderType: "DINE_IN",
        orderLabel: "7",
        responsibleName: "Ana",
        items: [{ productName: "Lomo", quantity: 2, notes: "Sin cebolla" }],
      },
      {
        columns: 32,
        codepageMapping: "epson",
        cutEnabled: true,
        feedBeforeCut: 3,
      },
    );

    const ascii = Buffer.from(content).toString("latin1");
    expect(content).toBeInstanceOf(Uint8Array);
    expect(ascii).toContain("COMANDA ticket-1");
    expect(ascii).toContain("2 x Lomo");
    expect(ascii).toContain("Sin cebolla");
    expect(ascii).not.toContain("S/");
    expect([...content]).toEqual(expect.arrayContaining([0x1d, 0x56]));
  });
});
