import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { PaymentMethod } from "@/order/types";
import { format } from "date-fns";
import Decimal from "decimal.js";
import { ErrorResponse } from "@/lib/types";

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

export const formatPriceWithoutCurrency = (price: number) =>
  new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2 }).format(price);

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

export const localizeOnlyDate = (date: Date): string =>
  format(date, "dd//MM/yyy");

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

export const max = (a: number) => (b: number) => Decimal.max(a, b).toNumber();

export const billableNumberToWords = (() => {
  const Unidades = (num: number): string => {
    switch (num) {
      case 1:
        return "un";
      case 2:
        return "dos";
      case 3:
        return "tres";
      case 4:
        return "cuatro";
      case 5:
        return "cinco";
      case 6:
        return "seis";
      case 7:
        return "siete";
      case 8:
        return "ocho";
      case 9:
        return "nueve";
      default:
        return "";
    }
  };

  const capitalize = (str: string): string =>
    str.charAt(0).toUpperCase() + str.slice(1);

  const Decenas = (num: number): string => {
    const decena = Math.floor(num / 10);
    const unidad = num - decena * 10;

    switch (decena) {
      case 1:
        switch (unidad) {
          case 0:
            return "diez";
          case 1:
            return "once";
          case 2:
            return "doce";
          case 3:
            return "trece";
          case 4:
            return "catorce";
          case 5:
            return "quince";
          default:
            return `dieci${Unidades(unidad)}`;
        }
      case 2:
        switch (unidad) {
          case 0:
            return "veinte";
          default:
            return `veinti${Unidades(unidad)}`;
        }
      case 3:
        return DecenasY("treinta", unidad);
      case 4:
        return DecenasY("cuarenta", unidad);
      case 5:
        return DecenasY("cincuenta", unidad);
      case 6:
        return DecenasY("sesenta", unidad);
      case 7:
        return DecenasY("setenta", unidad);
      case 8:
        return DecenasY("ochenta", unidad);
      case 9:
        return DecenasY("noventa", unidad);
      case 0:
        return Unidades(unidad);
      default:
        throw new Error("wrogn digit");
    }
  };

  const DecenasY = (strSin: string, numUnidades: number): string => {
    return numUnidades > 0 ? `${strSin} Y ${Unidades(numUnidades)}` : strSin;
  };

  const Centenas = (num: number): string => {
    const centenas = Math.floor(num / 100);
    const decenas = num - centenas * 100;

    switch (centenas) {
      case 1:
        if (decenas > 0) return `ciento ${Decenas(decenas)}`;
        return "cien";
      case 2:
        return `doscientos ${Decenas(decenas)}`;
      case 3:
        return `trecientos ${Decenas(decenas)}`;
      case 4:
        return `cuatrocientos ${Decenas(decenas)}`;
      case 5:
        return `quinientos ${Decenas(decenas)}`;
      case 6:
        return `seiscientos ${Decenas(decenas)}`;
      case 7:
        return `setecientos ${Decenas(decenas)}`;
      case 8:
        return `ochocientos ${Decenas(decenas)}`;
      case 9:
        return `novecientos ${Decenas(decenas)}`;
      default:
        return Decenas(decenas);
    }
  };

  const Seccion = (
    num: number,
    divisor: number,
    strSingular: string,
    strPlural: string,
  ): string => {
    const cientos = Math.floor(num / divisor);
    const resto = num - cientos * divisor;

    let letras = "";

    if (cientos > 0) {
      letras = cientos > 1 ? `${Centenas(cientos)} ${strPlural}` : strSingular;
    }

    if (resto > 0) letras += "";

    return letras;
  };

  const Miles = (num: number): string => {
    const divisor = 1000;
    const cientos = Math.floor(num / divisor);
    const resto = num - cientos * divisor;

    const strMiles = Seccion(num, divisor, "UN MIL", "MIL");
    const strCentenas = Centenas(resto);

    return strMiles === "" ? strCentenas : `${strMiles} ${strCentenas}`;
  };

  const Millones = (num: number): string => {
    const divisor = 1000000;
    const cientos = Math.floor(num / divisor);
    const resto = num - cientos * divisor;

    const strMillones = Seccion(num, divisor, "un millon de", "millones de");
    const strMiles = Miles(resto);

    return strMillones === "" ? strMiles : `${strMillones} ${strMiles}`;
  };

  // Interfaz para definir la estructura de la moneda
  interface Currency {
    plural?: string;
    singular?: string;
    centPlural?: string;
    centSingular?: string;
  }

  return (
    num: number,
    currency: Currency = {
      plural: "soles",
      singular: "sol",
      centPlural: "centimos",
      centSingular: "centimo",
    },
  ): string => {
    const data = {
      numero: num,
      enteros: Math.floor(num),
      centavos: Math.round(num * 100) - Math.floor(num) * 100,
      letrasCentavos: "",
      letrasMonedaPlural: currency.plural,
      letrasMonedaSingular: currency.singular,
      letrasMonedaCentavoPlural: currency.centPlural,
      letrasMonedaCentavoSingular: currency.centSingular,
    };

    if (data.enteros === 0)
      return `Cero con ${data.centavos.toString().padStart(2, "0")}/100 ${data.letrasMonedaPlural}`;

    return `${capitalize(Millones(data.enteros))} con ${data.centavos.toString().padStart(2, "0")}/100 ${data.letrasMonedaPlural}`;
  };
})();

export const errorResponse = (message: string): ErrorResponse => ({
  success: false,
  message: message,
});
