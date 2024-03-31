import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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
