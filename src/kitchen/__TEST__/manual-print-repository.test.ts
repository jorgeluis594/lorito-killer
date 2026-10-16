import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  queryRaw: vi.fn(),
  jobFind: vi.fn(),
  jobCreate: vi.fn(),
  ticketFindFirst: vi.fn(),
  ticketFind: vi.fn(),
  ticketList: vi.fn(),
  jobFindOrThrow: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: () => ({
    $transaction: mocks.transaction,
    kitchenTicket: { findMany: mocks.ticketList },
    kitchetTicketPrintJob: { findUniqueOrThrow: mocks.jobFindOrThrow },
  }),
}));

import {
  createManualKitchenTicketPrintJob,
  findKitchenTickets,
  renderPrintJobContent,
} from "../db_repository";

const input = {
  companyId: "company-1",
  userId: "waiter-1",
  role: "WAITER" as const,
  kitchenTicketId: "ticket-1",
  jobId: "job-1",
  isReprint: false,
};

const item = (quantity: number, cancelled = 0) => ({
  kitchenId: "kitchen-1",
  productName: "Lomo",
  notes: "Sin cebolla",
  createdAt: new Date("2026-09-15T12:00:00Z"),
  orderItem: { quantity: new Prisma.Decimal(quantity) },
  cancellations: cancelled ? [{ quantity: new Prisma.Decimal(cancelled) }] : [],
});

const ticket = (printJobs: Array<{ id: string; status: string }> = []) => ({
  id: "ticket-1",
  kitchenId: "kitchen-1",
  createdAt: new Date("2026-09-15T12:00:00Z"),
  kitchen: {
    id: "kitchen-1",
    name: "Cocina",
    status: "ACTIVE",
    printer: {
      id: "printer-1",
      companyId: "company-1",
      printClientId: "client-1",
      status: "ACTIVE",
      columns: 32,
      codepageMapping: "epson",
      cutEnabled: true,
      feedBeforeCut: 3,
    },
  },
  printJobs,
  orderRound: {
    responsibleUser: { name: "Ana", email: "ana@example.com" },
    order: {
      orderType: "DINE_IN",
      tableSession: { table: { label: "7", number: 7 } },
    },
    items: [item(2, 1), item(0, 2)],
  },
});

beforeEach(() => {
  vi.resetAllMocks();
  const tx = {
    $queryRaw: mocks.queryRaw,
    kitchetTicketPrintJob: {
      findUnique: mocks.jobFind,
      create: mocks.jobCreate,
    },
    kitchenTicket: {
      findFirst: mocks.ticketFindFirst,
      findUnique: mocks.ticketFind,
    },
  };
  mocks.transaction.mockImplementation((callback) => callback(tx));
  mocks.jobFind.mockResolvedValue(null);
  mocks.ticketFindFirst.mockResolvedValue({
    orderRound: { orderId: "order-1", responsibleUserId: "waiter-1" },
  });
  mocks.ticketFind.mockResolvedValue(ticket());
  mocks.jobCreate.mockResolvedValue({
    id: "job-1",
    kitchenTicketId: "ticket-1",
    status: "PENDING",
    isReprint: false,
  });
});

describe("createManualKitchenTicketPrintJob", () => {
  test("persists one first-print snapshot with only current quantities", async () => {
    const result = await createManualKitchenTicketPrintJob(input);

    expect(result.success).toBe(true);
    expect(mocks.jobCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "job-1",
        isReprint: false,
        ticket: expect.objectContaining({
          isReprint: false,
          items: [
            expect.objectContaining({
              productName: "Lomo",
              quantity: 2,
              cancelledQuantity: undefined,
            }),
          ],
        }),
      }),
    });
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });

  test("reprints failed or delivered jobs with this Kitchen's cancellations", async () => {
    mocks.ticketFind.mockResolvedValue(
      ticket([{ id: "old", status: "DELIVERED" }]),
    );
    mocks.jobCreate.mockResolvedValue({
      id: "job-2",
      kitchenTicketId: "ticket-1",
      status: "PENDING",
      isReprint: true,
    });
    const result = await createManualKitchenTicketPrintJob({
      ...input,
      jobId: "job-2",
      isReprint: true,
    });

    expect(result.success).toBe(true);
    expect(mocks.jobCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ticket: expect.objectContaining({
          isReprint: true,
          items: [
            expect.objectContaining({ quantity: 2, cancelledQuantity: 1 }),
            expect.objectContaining({ quantity: 0, cancelledQuantity: 2 }),
          ],
        }),
      }),
    });
  });

  test("rejects another waiter and an active reprint before writing", async () => {
    mocks.ticketFindFirst.mockResolvedValue({
      orderRound: { orderId: "order-1", responsibleUserId: "other" },
    });
    expect((await createManualKitchenTicketPrintJob(input)).success).toBe(
      false,
    );
    expect(mocks.jobCreate).not.toHaveBeenCalled();

    mocks.ticketFindFirst.mockResolvedValue({
      orderRound: { orderId: "order-1", responsibleUserId: "waiter-1" },
    });
    mocks.ticketFind.mockResolvedValue(
      ticket([{ id: "active", status: "PROCESSING" }]),
    );
    const result = await createManualKitchenTicketPrintJob({
      ...input,
      isReprint: true,
    });
    expect(result).toEqual({
      success: false,
      message: "La comanda ya tiene una impresión en curso.",
    });
  });

  test("rejects a first print when every current quantity is zero", async () => {
    mocks.ticketFind.mockResolvedValue({
      ...ticket(),
      orderRound: { ...ticket().orderRound, items: [item(0, 3)] },
    });
    const result = await createManualKitchenTicketPrintJob(input);
    expect(result).toEqual({
      success: false,
      message: "La comanda no tiene platos vigentes para imprimir.",
    });
    expect(mocks.jobCreate).not.toHaveBeenCalled();
  });

  test("recovers the same job id without regenerating immutable bytes", async () => {
    mocks.jobFind.mockResolvedValue({
      id: "job-1",
      companyId: "company-1",
      kitchenTicketId: "ticket-1",
      requestedById: "waiter-1",
      isReprint: false,
      status: "DELIVERED",
      printer: { printClientId: "client-1" },
    });
    const result = await createManualKitchenTicketPrintJob(input);
    expect(result.success && result.data.status).toBe("DELIVERED");
    expect(mocks.jobCreate).not.toHaveBeenCalled();
  });

  test("retries a serialization conflict so a lost response can be recovered", async () => {
    const recovered = {
      id: "job-1",
      companyId: "company-1",
      kitchenTicketId: "ticket-1",
      requestedById: "waiter-1",
      isReprint: false,
      status: "PENDING",
      printer: { printClientId: "client-1" },
    };
    mocks.transaction
      .mockRejectedValueOnce({ code: "P2034" })
      .mockImplementationOnce(async (callback) => {
        mocks.jobFind.mockResolvedValue(recovered);
        return callback({
          $queryRaw: mocks.queryRaw,
          kitchetTicketPrintJob: {
            findUnique: mocks.jobFind,
            create: mocks.jobCreate,
          },
          kitchenTicket: {
            findFirst: mocks.ticketFindFirst,
            findUnique: mocks.ticketFind,
          },
        });
      });

    const result = await createManualKitchenTicketPrintJob(input);
    expect(result.success && result.data.id).toBe("job-1");
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
  });
});

describe("findKitchenTickets", () => {
  test("derives missing-printer and ready-to-print reasons without persisting state", async () => {
    const base = {
      id: "ticket-1",
      createdAt: new Date("2026-09-15T12:00:00Z"),
      kitchen: {
        id: "kitchen-1",
        name: "Cocina",
        status: "ACTIVE",
        printer: null,
      },
      orderRound: {
        number: 1,
        responsibleUserId: "waiter-1",
        order: {
          id: "order-1",
          orderType: "DINE_IN",
          tableSession: { table: { label: "7", number: 7 } },
        },
        items: [
          {
            kitchenId: "kitchen-1",
            orderItem: { quantity: new Prisma.Decimal(2) },
          },
        ],
      },
      printJobs: [],
    };
    mocks.ticketList.mockResolvedValueOnce([base]);
    const missing = await findKitchenTickets({
      companyId: "company-1",
      orderId: "order-1",
    });
    expect(missing[0]).toMatchObject({
      attentionReason: "NO_PRINTER_CONFIGURED",
      canPrint: false,
      canReprint: false,
    });

    mocks.ticketList.mockResolvedValueOnce([
      {
        ...base,
        kitchen: {
          ...base.kitchen,
          printer: { companyId: "company-1", status: "ACTIVE" },
        },
      },
    ]);
    const ready = await findKitchenTickets({
      companyId: "company-1",
      orderId: "order-1",
    });
    expect(ready[0]).toMatchObject({
      attentionReason: "NOT_PRINTED",
      canPrint: true,
      canReprint: false,
    });
  });
});

describe("renderPrintJobContent", () => {
  const printer = {
    columns: 32,
    codepageMapping: "epson",
    cutEnabled: true,
    feedBeforeCut: 3,
  };

  test("renders the stored snapshot after its JSON round trip", async () => {
    mocks.jobFindOrThrow.mockResolvedValue({
      content: null,
      printer,
      ticket: JSON.parse(
        JSON.stringify({
          ticketId: "ticket-1",
          createdAt: new Date("2026-09-15T18:30:00Z"),
          kitchenName: "Cocina",
          orderType: "DINE_IN",
          orderLabel: "7",
          responsibleName: "Ana",
          items: [{ productName: "Lomo", quantity: 2 }],
        }),
      ),
    });
    const content = await renderPrintJobContent("job-1");
    // ESC * 33: la comanda se envía como imagen.
    expect(
      Buffer.from(content).indexOf(Buffer.from([0x1b, 0x2a, 0x21])),
    ).toBeGreaterThanOrEqual(0);
  });

  test("returns the bytes of jobs created before the snapshot", async () => {
    mocks.jobFindOrThrow.mockResolvedValue({
      content: Uint8Array.from([1, 2]),
      ticket: null,
      printer,
    });
    expect(await renderPrintJobContent("job-1")).toEqual(
      Uint8Array.from([1, 2]),
    );
  });
});
