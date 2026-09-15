import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  queryRaw: vi.fn(),
  jobFind: vi.fn(),
  jobCreate: vi.fn(),
  ticketFindFirst: vi.fn(),
  ticketFind: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: () => ({ $transaction: mocks.transaction }),
}));

import { createManualKitchenTicketPrintJob } from "../db_repository";

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
    const generate = vi.fn().mockReturnValue(Uint8Array.from([1, 2, 3]));
    const result = await createManualKitchenTicketPrintJob(input, generate);

    expect(result.success).toBe(true);
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        isReprint: false,
        items: [
          expect.objectContaining({
            productName: "Lomo",
            quantity: 2,
            cancelledQuantity: undefined,
          }),
        ],
      }),
      expect.objectContaining({ id: "printer-1" }),
    );
    expect(mocks.jobCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "job-1",
        isReprint: false,
        content: Buffer.from([1, 2, 3]),
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
    const generate = vi.fn().mockReturnValue(Uint8Array.from([4]));
    const result = await createManualKitchenTicketPrintJob(
      { ...input, jobId: "job-2", isReprint: true },
      generate,
    );

    expect(result.success).toBe(true);
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        isReprint: true,
        items: [
          expect.objectContaining({ quantity: 2, cancelledQuantity: 1 }),
          expect.objectContaining({ quantity: 0, cancelledQuantity: 2 }),
        ],
      }),
      expect.anything(),
    );
  });

  test("rejects another waiter and an active reprint before writing", async () => {
    mocks.ticketFindFirst.mockResolvedValue({
      orderRound: { orderId: "order-1", responsibleUserId: "other" },
    });
    expect(
      (await createManualKitchenTicketPrintJob(input, vi.fn())).success,
    ).toBe(false);
    expect(mocks.jobCreate).not.toHaveBeenCalled();

    mocks.ticketFindFirst.mockResolvedValue({
      orderRound: { orderId: "order-1", responsibleUserId: "waiter-1" },
    });
    mocks.ticketFind.mockResolvedValue(
      ticket([{ id: "active", status: "PROCESSING" }]),
    );
    const result = await createManualKitchenTicketPrintJob(
      { ...input, isReprint: true },
      vi.fn(),
    );
    expect(result).toEqual({
      success: false,
      message: "La comanda ya tiene una impresión en curso.",
    });
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
    const generate = vi.fn();
    const result = await createManualKitchenTicketPrintJob(input, generate);
    expect(result.success && result.data.status).toBe("DELIVERED");
    expect(generate).not.toHaveBeenCalled();
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

    const result = await createManualKitchenTicketPrintJob(input, vi.fn());
    expect(result.success && result.data.id).toBe("job-1");
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
  });
});
