import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  requireRestaurantMutationContext: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: () => ({ $transaction: mocks.transaction }),
}));

vi.mock("@/restaurant/mutation-context", () => ({
  getRestaurantContextMessage: () => null,
  requireRestaurantMutationContext: mocks.requireRestaurantMutationContext,
}));

import { cancelTableSession } from "../use-cases/cancel-table-session";

type TicketRecord = {
  id: string;
  status: string;
  cancellationReason: string | null;
  cancelledAt: Date | null;
  cancelledById: string | null;
};

describe("cancelTableSession", () => {
  const readyAt = new Date("2026-08-03T10:00:00.000Z");
  let tickets: TicketRecord[];
  let updateMany: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    tickets = [
      {
        id: "pending-ticket",
        status: "PENDING",
        cancellationReason: null,
        cancelledAt: null,
        cancelledById: null,
      },
      {
        id: "preparing-ticket",
        status: "PREPARING",
        cancellationReason: null,
        cancelledAt: null,
        cancelledById: null,
      },
      {
        id: "ready-ticket",
        status: "READY",
        cancellationReason: "auditoria previa",
        cancelledAt: readyAt,
        cancelledById: "cook-1",
      },
    ];

    updateMany = vi.fn(
      (input: {
        where: { status: { in: string[] } };
        data: {
          status: string;
          cancellationReason: string | null;
          cancelledAt: Date;
          cancelledById: string;
        };
      }) => {
        tickets.forEach((ticket) => {
          if (input.where.status.in.includes(ticket.status)) {
            Object.assign(ticket, input.data);
          }
        });
        return { count: 2 };
      },
    );

    const now = new Date("2026-08-03T11:00:00.000Z");
    const currentSession = {
      id: "session-1",
      companyId: "company-1",
      tableId: "table-1",
      waiterId: "waiter-1",
      status: "OPEN",
      current: true,
      guestCount: 2,
      notes: null,
      cancellationReason: null,
      cancelledById: null,
      openedAt: now,
      closedAt: null,
      createdAt: now,
      updatedAt: now,
      order: {
        id: "order-1",
        status: "PENDING",
        orderItems: [],
        payments: [],
        documents: [],
      },
    };
    const cancelledSession = {
      ...currentSession,
      status: "CANCELLED",
      current: null,
      closedAt: now,
      cancellationReason: "cierre operativo",
      cancelledById: "manager-1",
      cancelledBy: { id: "manager-1", name: "Encargado" },
      waiter: { id: "waiter-1", name: "Mozo" },
      order: {
        id: "order-1",
        status: "CANCELLED",
        rounds: [],
      },
    };
    const tx = {
      tableSession: {
        findFirst: vi.fn().mockResolvedValue(currentSession),
        update: vi.fn().mockResolvedValue(cancelledSession),
      },
      order: { update: vi.fn().mockResolvedValue({}) },
      kitchenTicket: { updateMany },
    };
    mocks.transaction.mockImplementation(
      (operation: (transaction: typeof tx) => unknown) => operation(tx),
    );
  });

  test("cancels only pending and preparing kitchen tickets", async () => {
    const result = await cancelTableSession(
      "company-1",
      "table-1",
      "manager-1",
      " cierre operativo ",
    );

    expect(result.success).toBe(true);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "company-1",
          status: { in: ["PENDING", "PREPARING"] },
          round: { orderId: "order-1" },
        }),
      }),
    );
    expect(tickets.slice(0, 2).map((ticket) => ticket.status)).toEqual([
      "CANCELLED",
      "CANCELLED",
    ]);
  });

  test("preserves the status and audit fields of a ready ticket", async () => {
    const readyBefore = { ...tickets[2] };

    await cancelTableSession(
      "company-1",
      "table-1",
      "manager-1",
      "cierre operativo",
    );

    expect(tickets[2]).toEqual(readyBefore);
  });
});
