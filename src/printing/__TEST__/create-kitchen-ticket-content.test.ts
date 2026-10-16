import { describe, expect, test } from "vitest";
import {
  createKitchenTicketContent,
  kitchenTicketLines,
  type KitchenTicketContentInput,
} from "../create-kitchen-ticket-content";

const base: KitchenTicketContentInput = {
  ticketId: "ticket-1",
  createdAt: new Date("2026-09-15T18:30:00Z"),
  kitchenName: "Cocina",
  orderType: "DINE_IN",
  orderLabel: "7",
  responsibleName: "Ana",
  items: [{ productName: "Lomo", quantity: 2, notes: "Sin cebolla" }],
};

const texts = (input: KitchenTicketContentInput) =>
  kitchenTicketLines(input).map((line) =>
    line === "rule" ? "---" : line.text,
  );

describe("kitchenTicketLines", () => {
  test("includes preparation data and no prices", () => {
    const lines = texts(base);
    expect(lines).toContain("COMANDA ticket-1");
    expect(lines).toContain("2 x Lomo");
    expect(lines).toContain("  Obs: Sin cebolla");
    expect(lines.join("\n")).not.toContain("S/");
  });

  test("marks reprints and includes current and cancelled quantities", () => {
    const lines = texts({
      ...base,
      isReprint: true,
      items: [{ productName: "Lomo", quantity: 2, cancelledQuantity: 1 }],
    });
    expect(lines).toContain("REIMPRESIÓN");
    expect(lines).toContain("2 x Lomo");
    expect(lines).toContain("1 cancelado(s)");
  });

  describe("customerName", () => {
    test("Delivery muestra el nombre del cliente, sin precios", () => {
      const lines = texts({
        ...base,
        orderType: "DELIVERY",
        customerName: "Maria Quispe",
      });
      expect(lines).toContain("Cliente: Maria Quispe");
      expect(lines.join("\n")).not.toContain("S/");
    });

    test("sin nombre la comanda es idéntica a la actual", () => {
      expect(texts({ ...base, customerName: null })).toEqual(texts(base));
      expect(texts(base).join("\n")).not.toContain("Cliente:");
    });
  });
});

describe("createKitchenTicketContent", () => {
  test("prints the ticket as a raster image at the printer width and cuts", async () => {
    const content = await createKitchenTicketContent(base, {
      columns: 32,
      codepageMapping: "epson",
      cutEnabled: true,
      feedBeforeCut: 3,
    });

    const bytes = Buffer.from(content);
    // ESC * 33: imagen por columnas de 24 puntos; le sigue el ancho en puntos.
    const image = bytes.indexOf(Buffer.from([0x1b, 0x2a, 0x21]));
    expect(image).toBeGreaterThanOrEqual(0);
    expect(bytes.readUInt16LE(image + 3)).toBe(384);
    expect(bytes.includes(Buffer.from([0x1d, 0x56]))).toBe(true);
  });

  test("fits notes with many line breaks and long unbroken words", async () => {
    const content = await createKitchenTicketContent(
      {
        ...base,
        items: [
          {
            productName: "Chicharrón-de-pescado-con-yuca-frita-extra-grande",
            quantity: 1,
            notes: Array.from({ length: 12 }, (_, i) => `nota ${i}`).join("\n"),
          },
        ],
      },
      {
        columns: 32,
        codepageMapping: "epson",
        cutEnabled: true,
        feedBeforeCut: 3,
      },
    );
    expect(content.length).toBeGreaterThan(0);
  });

  test("omits the cut when disabled", async () => {
    const content = await createKitchenTicketContent(base, {
      columns: 32,
      codepageMapping: "epson",
      cutEnabled: false,
      feedBeforeCut: 0,
    });
    expect(Buffer.from(content).includes(Buffer.from([0x1d, 0x56]))).toBe(
      false,
    );
  });
});
