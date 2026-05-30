export interface FactproDocumentItemV3 {
  unidad: "NIU";
  codigo: string;
  descripcion: string;
  cantidad: number;
  precio: number;
  incluye_tax: true;
  // 1 = Gravado - Operacion Onerosa
  // 20 = Exonerado - Operacion Onerosa
  tipo_tax: "1" | "20";
  descuento?: number;
}

export interface FactproDocumentV3 {
  serie: string;
  numero: string;
  tipo_operacion: "1";
  fecha_de_emision: string;
  moneda: "PEN" | "USD";
  enviar_automaticamente_al_cliente?: boolean;
  cliente: {
    // FactPro v3 catalog: 4 = RUC, 2 = DNI, 1 = Otros
    cliente_tipo_documento: "4" | "2" | "1";
    cliente_numero_documento: string;
    cliente_denominacion: string;
    cliente_direccion: string;
    cliente_email?: string;
    cliente_telefono: string;
  };
  items: FactproDocumentItemV3[];
  condicion_de_pago: Array<{
    tipo_de_condicion: "0" | "1";
    forma_de_pago: "0";
    monto: number;
  }>;
  totales?: {
    monto_descuento_global: number;
  };
  observaciones: string;
  formato_pdf: "a4";
}

export interface FactproSuccessResponseV3 {
  exito: true;
  mensaje: string | null;
  data: {
    numero: string;
    archivo: string;
    letras: string;
    hash: string;
    qr: string;
    tipo_estado?: string;
    descripcion_estado?: string;
  };
  archivos: {
    xml: string;
    pdf: string;
    cdr: string;
  };
  eventos?: Array<{
    date: string;
    description: string;
  }>;
}

export interface FactproErrorResponseV3 {
  exito: false;
  mensaje?: string | null;
}

export type FactproResponseV3 =
  | FactproErrorResponseV3
  | FactproSuccessResponseV3;

export interface FactproCancelSuccessResponseV3 {
  exito: true;
  mensaje: string | null;
  ticket: string;
  hash: string;
  fecha_de_emision: string;
  estado_documento: string;
  archivos: {
    xml: string;
    pdf: string;
    cdr: string;
  };
  eventos?: Array<{
    date: string;
    description: string;
  }>;
}

export type FactproCancelResponseV3 =
  | FactproErrorResponseV3
  | FactproCancelSuccessResponseV3;
