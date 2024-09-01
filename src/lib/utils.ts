import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { PaymentMethod } from "@/order/types";
import { format } from "date-fns";
import Decimal from "decimal.js";

const formater = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatPrice = (price: number) => {
  return formater.format(price);
};

export const debounce = <F extends (...args: any[]) => any>(
  func: F,
  waitFor: number,
) => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise((resolve) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        resolve(func(...args));
      }, waitFor);
    });
};

export const localizeDate = (data: Date) =>
  data.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const shortLocalizeDate = (date: Date): string =>
  format(date, "dd/MM/yyyy hh:mm aa");

export const isBarCodeValid = (
  barcode: string,
  allowedRepetitions: number,
): boolean => {
  let currentCharacter: string | null = null;
  let currentRepetitions = 0;
  let repeatedCharactersNum = 0;

  console.log({ barcode });

  barcode.split("").forEach((character) => {
    if (currentCharacter !== character) {
      if (currentRepetitions > allowedRepetitions) {
        repeatedCharactersNum++;
      }

      currentCharacter = character;
      currentRepetitions = 1;
      return;
    }
    currentRepetitions += 1;
  });

  return repeatedCharactersNum <= 3;
};

const paymentMethodMap = {
  cash: "Efectivo",
  credit_card: "Tarjeta de crédito",
  debit_card: "Tarjeta de débito",
  wallet: "Billetera digital",
};

export const paymentMethodToText = (method: PaymentMethod) => {
  return paymentMethodMap[method];
};

export const mul = (a: number) => (b: number) =>
  new Decimal(a).mul(b).toNumber();

export const plus = (a: number) => (b: number) =>
  new Decimal(a).add(b).toNumber();

export const sub = (a: number) => (b: number) =>
  new Decimal(a).sub(b).toNumber();

export const div = (a: number) => (b: number) =>
  new Decimal(a).div(b).toNumber();

export const isEmpty = (obj: unknown): boolean => {
  if (obj == null) return true;

  if (typeof obj === "string" || Array.isArray(obj)) {
    return obj.length === 0;
  }

  if (typeof obj === "object") {
    return Object.keys(obj as object).length === 0;
  }

  return false;
};
