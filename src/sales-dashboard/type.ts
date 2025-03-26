import {Photo} from "@/product/types";

export type Sales = {
  finalAmount: number
};

export type SalesWeekly = {
  salesByDay: number[];
};

export type ExpenseAmount = {
  expenseTotal: number
}

export type ProductToSales = {
  productId: string,
  productName: string,
  productPrice: number,
  quantity: number,
  photos?: Photo[],
  total: number,
}


