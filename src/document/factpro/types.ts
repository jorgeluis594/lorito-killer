export type FactproDiscount = {
  codigo: string;
  descripcion: string;
  porcentaje: number;
  monto: number;
  base: number;
};

export interface FactproDocumentItem {
  unidad: "NIU";
  codigo: string;
  descripcion: string;
  cantidad: number;
  valor_unitario: number;
  precio_unitario: number;
  // 10 = Gravado - Operacion Onerosa
  // 20 = Exonerado - Operacion Onerosa
  tipo_tax: "10" | "20";
  total_base_tax: number;
  codigo_producto_sunat: string;
  codigo_producto_gsl: string;
  porcentaje_tax: 18 | 0;
  total_tax: number;
  total: number;
  descuentos?: FactproDiscount;
}

export interface FactproDocument {
  tipo_documento: "01" | "03" | "07" | "08";
  serie: string;
  numero: string;
  tipo_operacion: "0101";
  fecha_de_emision: string;
  hora_de_emision: string;
  moneda: "PEN" | "USD";
  fecha_de_vencimiento?: string;
  enviar_automaticamente_al_cliente?: boolean;
  datos_del_emisor: {
    codigo_establecimiento: string;
  };
  cliente: {
    // 6 = RUC, 1 = DNI, 4 = Carnet de Extranjeria
    cliente_tipo_documento: "6" | "1" | "4" | "7" | "A" | "0";
    cliente_numero_documento: string;
    cliente_denominacion: string;
    codigo_pais: "PE";
    ubigeo: string;
    cliente_direccion: string;
    cliente_email?: string;
    cliente_telefono: string;
  };
  totales: {
    total_venta: number;
    total_tax: number;
    total_exoneradas: number;
    total_exportacion: number;
    total_gravadas: number;
    total_inafectas: number;
    total_gratuitas: number;
    descuentos?: FactproDiscount;
  };
  items: FactproDocumentItem[];
  acciones: {
    formato_pdf: "a4";
  };
  termino_de_pago: {
    descripcion: "Contado" | "Credito";
    tipo: "0" | "1";
  };
  metodo_de_pago?: string;
  canal_de_venta: "";
  orden_de_compra: "";
  observaciones: "";
  almacen: "";
}

export interface FactproSuccessResponse {
  success: true;
  data: {
    number: string;
    filename: string;
    external_id: string;
    number_to_letter: string;
    hash: string;
    qr: string;
  };
  links: {
    xml: string;
    pdf: string;
    cdr: string;
  };
  response?: {
    code: string;
    description: string;
    notes: string[];
  };
  message?: string;
}

export interface FactproErrorResponse {
  success: false;
  message?: string;
}

export type FactproResponse = FactproErrorResponse | FactproSuccessResponse;

export interface FactproCancelSuccessResponse {
  success: true;
  message?: string;
  data?: unknown;
  links?: {
    xml?: string;
    pdf?: string;
    cdr?: string;
  };
}

export type FactproCancelResponse =
  | FactproErrorResponse
  | FactproCancelSuccessResponse;
