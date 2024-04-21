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

export const localizeDate = (data: Date) =>
  data.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const isBarCodeValid = (
  barcode: string,
  allowedRepetitions: number,
): boolean => {
  let currentCharacter: string | null = null;
  let currentRepetitions = 0;
  let repeatedCharactersNum = 0;

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
