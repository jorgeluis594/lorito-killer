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

  test("marks reprints and includes current and cancelled quantities", () => {
    const content = createKitchenTicketContent(
      {
        ticketId: "ticket-1",
        createdAt: new Date("2026-09-15T18:30:00Z"),
        kitchenName: "Cocina",
        orderType: "DINE_IN",
        orderLabel: "7",
        responsibleName: "Ana",
        isReprint: true,
        items: [{ productName: "Lomo", quantity: 2, cancelledQuantity: 1 }],
      },
      {
        columns: 32,
        codepageMapping: "epson",
        cutEnabled: false,
        feedBeforeCut: 0,
      },
    );

    const text = Buffer.from(content).toString("latin1");
    expect(text).toContain("REIMPRESI");
    expect(text).not.toContain("REIMPRESI?N");
    expect(text).toContain("2 x Lomo");
    expect(text).toContain("1 cancelado(s)");
  });

  describe("customerName", () => {
    const base = {
      ticketId: "ticket-1",
      createdAt: new Date("2026-09-15T18:30:00Z"),
      kitchenName: "Cocina",
      orderLabel: "ABC123",
      responsibleName: "Ana",
      items: [{ productName: "Lomo", quantity: 1 }],
    };
    const profile = {
      columns: 32,
      codepageMapping: "epson",
      cutEnabled: false,
      feedBeforeCut: 0,
    };
    const text = (content: Uint8Array) =>
      Buffer.from(content).toString("latin1");

    test("Delivery muestra el nombre del cliente, sin precios", () => {
      const output = text(
        createKitchenTicketContent(
          { ...base, orderType: "DELIVERY", customerName: "Maria Quispe" },
          profile,
        ),
      );
      expect(output).toContain("Cliente: Maria Quispe");
      expect(output).not.toContain("S/");
    });

    test("sin nombre la comanda es idéntica a la actual", () => {
      const without = createKitchenTicketContent(
        { ...base, orderType: "DINE_IN" },
        profile,
      );
      const withNull = createKitchenTicketContent(
        { ...base, orderType: "DINE_IN", customerName: null },
        profile,
      );
      expect(Buffer.from(withNull).equals(Buffer.from(without))).toBe(true);
      expect(text(without)).not.toContain("Cliente:");
    });
  });
});
