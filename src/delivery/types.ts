import type { ErrorResponse } from "@/lib/types";

/** Resultado de renombrar un Para llevar; el conflicto trae el nombre vigente tipado. */
export type SaveCustomerNameResult =
  | {
      success: true;
      data: {
        sessionId: string;
        customerName: string | null;
        changed: boolean;
      };
    }
  | {
      success: false;
      type: "CustomerNameConflict";
      message: string;
      currentName: string | null;
    }
  | (ErrorResponse & { errors?: { customerName?: string } });
