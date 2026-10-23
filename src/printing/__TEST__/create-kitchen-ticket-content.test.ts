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

  describe("pedidos sin mesa", () => {
    const line = (input: KitchenTicketContentInput, text: string) =>
      kitchenTicketLines(input).find(
        (item) => item !== "rule" && item.text === text,
      );

    test("imprime «Para llevar: Rosa» en negrita y sin línea «Cliente:»", () => {
      const input = {
        ...base,
        orderType: "TAKE_AWAY" as const,
        orderLabel: "Rosa",
      };
      expect(line(input, "Para llevar: Rosa")).toMatchObject({ bold: true });
      expect(texts(input).join("\n")).not.toContain("Cliente:");
    });

    test("imprime «Delivery: Ana» sin teléfono ni dirección", () => {
      const input = {
        ...base,
        orderType: "DELIVERY" as const,
        orderLabel: "Ana",
      };
      expect(line(input, "Delivery: Ana")).toMatchObject({ bold: true });
      expect(texts(input).join("\n")).not.toMatch(/Cliente:|Tel|987/);
    });

    test("mantiene «Mesa: 4» sin negrita", () => {
      const input = { ...base, orderLabel: "4" };
      expect(line(input, "Mesa: 4")?.bold).toBeFalsy();
    });

    test("un snapshot anterior con customerName sigue imprimiendo «Cliente: Ana»", () => {
      const lines = texts({
        ...base,
        orderType: "DELIVERY",
        orderLabel: "55C3A1D2",
        customerName: "Ana",
      });
      expect(lines).toContain("Cliente: Ana");
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
