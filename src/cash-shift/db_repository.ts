import prisma from "@/lib/prisma";
import {
  $Enums,
  CashShift as PrismaCashSift,
  Order,
  Payment,
  Expense as PrismaExpense,
  Prisma,
  ShiftStatus,
} from "@prisma/client";
import {
  OpenCashShift,
  CashShiftWithOutOrders,
  CashShift,
  CashShiftBase,
  Expense, GrossProfit, OrderTotal,
} from "./types";
import { response } from "@/lib/types";
import {
  mapPrismaPaymentToPayment,
  transformOrdersData,
} from "@/order/db_repository";
import PaymentMethod = $Enums.PaymentMethod;
import { User } from "@/user/types";
import { plus } from "@/lib/utils";
import {log} from "@/lib/log";

// improve this
export const userExists = async (userId: string) => {
  return !!(await prisma().user.findUnique({ where: { id: userId } }));
};

export const userByEmail = async (email: string): Promise<response<User>> => {
  try {
    const persistedUser = await prisma().user.findUnique({
      where: { email },
    });

    if (!persistedUser) return { success: false, message: "User not found" };

    const { password, ...user } = persistedUser;

    return {
      success: true,
      data: { ...user, companyId: user.companyId || "some_company_id" },
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const createCashShift = async <T extends CashShift>(
  cashShift: T,
): Promise<response<T>> => {
  try {
    const persistedCashShift = await prisma().cashShift.create({
      data: cashShiftToPrisma(cashShift),
      include: { orders: true, payments: true, expenses: true },
    });

    return {
      success: true,
      data: await prismaCashShiftToCashShift<T>(persistedCashShift),
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const saveCashShift = async <T extends CashShift>(
  cashShift: T,
): Promise<response<T>> => {
  try {
    const persistedCashShift = await prisma().cashShift.update({
      where: { id: cashShift.id },
      data: cashShiftToPrisma(cashShift),
      include: { orders: true, payments: true, expenses: true },
    });

    return {
      success: true,
      data: await prismaCashShiftToCashShift<T>(persistedCashShift),
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const getManyCashShifts = async (
  companyId: string,
): Promise<response<CashShiftWithOutOrders[]>> => {
  const cashShifts = await prisma().cashShift.findMany({
    where: { companyId },
    include: { orders: true, expenses: true },
    orderBy: { openedAt: "desc" },
  });

  const users = await prisma().user.findMany({ where: { companyId } });
  const mappedUsers = users.reduce((acc: Record<string, typeof user>, user) => {
    acc[user.id] = user;
    return acc;
  }, {});

  return {
    success: true,
    data: cashShifts.map((prismaCashShift) => ({
      ...prismaCashShift,
      userName: mappedUsers[prismaCashShift.userId].name || "sin nombre",
      companyId: prismaCashShift.companyId || "some_company_id",
      status: prismaCashShift.status == "OPEN" ? "open" : "closed",
      expenses: prismaCashShift.expenses.map(
        (expense): Expense => ({
          id: expense.id,
          cashShiftId: expense.cashShiftId,
          amount: Number(expense.amount),
          description: expense.description || undefined,
          createdAt: expense.createdAt,
        }),
      ),
      initialAmount: Number(prismaCashShift.initialAmount),
      amountInCashRegister: plus(prismaCashShift.initialAmount.toNumber())(
        prismaCashShift.orders.reduce(
          (total, order) => plus(total)(order.total.toNumber()),
          0,
        ),
      ),
      finalAmount: prismaCashShift.finalAmount
        ? Number(prismaCashShift.finalAmount)
        : undefined,
    })),
  };
};

export const getLastOpenCashShift = async (
  userId: string,
): Promise<response<OpenCashShift>> => {
  const cashShift = await prisma().cashShift.findFirst({
    where: {
      userId,
      status: "OPEN",
    },
    orderBy: { openedAt: "desc" },
    include: { orders: true, payments: true, expenses: true },
  });

  if (!cashShift) {
    return { success: false, message: "No se encontró ninguna caja abierta" };
  }

  return {
    success: true,
    data: await prismaCashShiftToCashShift<OpenCashShift>(cashShift),
  };
};

export const findCashShift = async <T extends CashShift>(
  id: string,
): Promise<response<T>> => {
  const cashShift = await prisma().cashShift.findUnique({
    where: { id },
    include: { orders: true, payments: true, expenses: true },
  });

  if (!cashShift) {
    return { success: false, message: "No se encontró la caja" };
  }

  return {
    success: true,
    data: await prismaCashShiftToCashShift<T>(cashShift),
  };
};

// todo: refactor this, the logic to calculate totals should be manage in its own use case
export const prismaCashShiftToCashShift = async <T extends CashShift>(
  prismaCashShift: PrismaCashSift & {
    orders: Order[];
    payments: Payment[];
    expenses: PrismaExpense[];
  },
): Promise<T> => {
  const user = await prisma().user.findUnique({
    where: { id: prismaCashShift.userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const completedOrderIds = new Set(
    prismaCashShift.orders
      .filter((order) => order.status === "COMPLETED")
      .map((order) => order.id),
  );

  const totalSales = prismaCashShift.orders.reduce(
    (total, order) =>
      completedOrderIds.has(order.id!)
        ? plus(total)(order.total.toNumber())
        : total,
    0,
  );

  const expenses = prismaCashShift.expenses.map(
    (expense): Expense => ({
      id: expense.id,
      cashShiftId: expense.cashShiftId,
      amount: Number(expense.amount),
      description: expense.description || undefined,
      createdAt: expense.createdAt,
    }),
  );

  const baseCashShift: CashShiftBase = {
    id: prismaCashShift.id,
    userId: prismaCashShift.userId,
    companyId: prismaCashShift.companyId || "some_company_id",
    userName: user.name || "sin nombre",
    initialAmount: Number(prismaCashShift.initialAmount),
    totalSales: sumPaymentsAmount(prismaCashShift.payments, completedOrderIds),
    amountInCashRegister: plus(prismaCashShift.initialAmount.toNumber())(
      totalSales,
    ),
    expenses,
    totalCashSales: sumPaymentsAmount(
      prismaCashShift.payments || [],
      completedOrderIds,
      "CASH",
    ),
    totalDebitCardSales: sumPaymentsAmount(
      prismaCashShift.payments || [],
      completedOrderIds,
      "DEBIT_CARD",
    ),
    totalCreditCardSales: sumPaymentsAmount(
      prismaCashShift.payments || [],
      completedOrderIds,
      "CREDIT_CARD",
    ),
    totalWalletSales: sumPaymentsAmount(
      prismaCashShift.payments || [],
      completedOrderIds,
      "WALLET",
    ),
    orders: (await transformOrdersData(prismaCashShift.orders || [])).sort(
      (a, b) => b.createdAt!.getTime() - a.createdAt!.getTime(),
    ),
    payments: (prismaCashShift.payments || []).map(mapPrismaPaymentToPayment),
  };

  log.info("cashshift_base_created",{baseCashShift})

  if (prismaCashShift.status === "OPEN") {
    return {
      ...baseCashShift,
      openedAt: prismaCashShift.openedAt,
      status: "open",
    } as T;
  } else {
    return {
      ...baseCashShift,
      status: "closed",
      openedAt: prismaCashShift.openedAt,
      finalAmount: Number(prismaCashShift.finalAmount),
      closedAt: prismaCashShift.closedAt!,
    } as T;
  }
};

const cashShiftStatusToPrisma = (status: CashShift["status"]): ShiftStatus =>
  cashShiftMapper[status];

const cashShiftToPrisma = (
  cashShift: CashShift,
): Omit<PrismaCashSift, "createdAt" | "updatedAt"> => ({
  id: cashShift.id,
  userId: cashShift.userId,
  companyId: cashShift.companyId,
  openedAt: cashShift.openedAt,
  initialAmount: new Prisma.Decimal(cashShift.initialAmount),
  finalAmount:
    cashShift.status == "open"
      ? null
      : new Prisma.Decimal(cashShift.finalAmount),
  status: cashShiftStatusToPrisma(cashShift.status),
  closedAt: cashShift.status == "open" ? null : cashShift.closedAt,
});

function sumPaymentsAmount(
  payments: Payment[],
  completedOrderIds: Set<string>,
  filter: PaymentMethod | null = null,
): number {
  return payments
    .filter((payment) => {
      if (!completedOrderIds.has(payment.orderId)) return false;

      return !!filter ? payment.method === filter : true;
    })
    .reduce((acc, payment) => acc + Number(payment.amount), 0);
}

const cashShiftMapper: { open: "OPEN"; closed: "CLOSED" } = {
  open: "OPEN",
  closed: "CLOSED",
};

export const addExpense = async (
  expense: Expense,
): Promise<response<Expense>> => {
  try {
    const persistedExpense = await prisma().expense.create({
      data: {
        cashShiftId: expense.cashShiftId,
        amount: expense.amount,
        description: expense.description,
        createdAt: expense.createdAt,
      },
    });

    return {
      success: true,
      data: {
        id: persistedExpense.id,
        cashShiftId: persistedExpense.cashShiftId,
        amount: persistedExpense.amount.toNumber(),
        description: persistedExpense.description || undefined,
        createdAt: persistedExpense.createdAt,
      },
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const findOrders = async (
  id: string,
): Promise<response<OrderTotal[]>> => {
  const ordersToCashisft = await prisma().cashShift.findUnique({
    where: {
      id: id,
    },
    include: {
      orders: {
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  const orders = ordersToCashisft!.orders

  const ordersMap = orders.map((order) => {

    const isCancelled = order.status === "CANCELLED";

    const orderTotal = order.orderItems.reduce((total, o) => {
      const purchaseTotal = +o.product.purchasePrice! * +o.quantity || 0;
      const totalDifference = +o.total - purchaseTotal || 0;

      total.totalPrice += purchaseTotal;
      total.totalDifference += totalDifference;

      return total;
    }, {
      totalPrice: 0,
      totalDifference: 0
    });

    if (isCancelled) {
      orderTotal.totalPrice -= orderTotal.totalPrice;
      orderTotal.totalDifference -= orderTotal.totalDifference;
    }

    return {
      totalAmount: orderTotal.totalPrice,
      totalDiference: orderTotal.totalDifference,
    };
  })

  return {
    success: true,
    data: ordersMap
  }
}
