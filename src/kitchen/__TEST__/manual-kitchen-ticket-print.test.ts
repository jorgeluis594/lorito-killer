import { describe, expect, test, vi } from "vitest";
import { getKitchenTickets } from "../use-cases/get-kitchen-tickets";
import { printKitchenTicket } from "../use-cases/print-kitchen-ticket";
import { reprintKitchenTicket } from "../use-cases/reprint-kitchen-ticket";

const input = {
  companyId: "company-1",
  userId: "user-1",
  role: "WAITER" as const,
  kitchenTicketId: "ticket-1",
  jobId: "job-1",
};

describe("manual kitchen ticket printing", () => {
  test("scopes waiter reads to their own rounds and leaves ADMIN unfiltered", async () => {
    const find = vi.fn().mockResolvedValue([]);
    await getKitchenTickets(
      {
        companyId: "company-1",
        userId: "waiter-1",
        role: "WAITER",
        orderId: "order-1",
      },
      find,
    );
    expect(find).toHaveBeenLastCalledWith({
      companyId: "company-1",
      orderId: "order-1",
      responsibleUserId: "waiter-1",
    });
    await getKitchenTickets(
      {
        companyId: "company-1",
        userId: "admin-1",
        role: "ADMIN",
        orderId: "order-1",
      },
      find,
    );
    expect(find).toHaveBeenLastCalledWith({
      companyId: "company-1",
      orderId: "order-1",
    });
  });

  test("rejects unauthorized roles before persistence", async () => {
    const create = vi.fn();
    expect(
      await printKitchenTicket({ ...input, role: "CASHIER" }, create),
    ).toEqual({
      success: false,
      message: "No tienes permiso para imprimir comandas",
    });
    expect(create).not.toHaveBeenCalled();
  });

  test("scopes the attention list by company and waiter", async () => {
    const find = vi.fn().mockResolvedValue([]);
    await getKitchenTickets(
      {
        companyId: "company-1",
        userId: "waiter-1",
        role: "WAITER",
        requiresActionOnly: true,
      },
      find,
    );
    expect(find).toHaveBeenCalledWith({
      companyId: "company-1",
      responsibleUserId: "waiter-1",
      requiresActionOnly: true,
    });
  });

  test("passes a stable request as first print or reprint", async () => {
    const create = vi
      .fn()
      .mockResolvedValue({ success: false, message: "expected" });
    await printKitchenTicket(input, create);
    expect(create).toHaveBeenCalledWith({ ...input, isReprint: false });
    await reprintKitchenTicket(input, create);
    expect(create).toHaveBeenLastCalledWith({ ...input, isReprint: true });
  });
});
