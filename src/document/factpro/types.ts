export interface FactproDocumentItem {
  // NIU = PRODUCTO
  // ZZ = SERVICIO
  unidad: "NIU";
  codigo: string;
  descripcion: string; // product name
  cantidad: number;
  valor_unitario: number; // without igv
  precio_unitario: number; // with igv
  // 10 = Gravado - Operación Onerosa
  // 20= Exonerado - Operación Onerosa
  tipo_tax: "10" | "20";
  total_base_tax: number;
  codigo_producto_sunat: string;
  codigo_producto_gsl: string;
  porcentaje_tax: 18 | 0;
  total_tax: number;
  total: number;
}

export interface FactproDocument {
  tipo_documento: "01" | "03" | "07" | "08"; // 01 = Factura, 03 = Boleta, 07 = Nota de Crédito, 08 = Nota de Débito
  serie: string;
  numero: string;
  tipo_operacion: "0101"; // by default is 0101
  fecha_de_emision: string; // example 2024-05-14
  hora_de_emision: string; // example 10:11:11
  moneda: "PEN" | "USD";
  fecha_de_vencimiento?: string; // example 2024-05-14
  enviar_automaticamente_al_cliente?: boolean;
  datos_del_emisor: {
    codigo_establecimiento: string;
  };
  cliente: {
    // 6 = RUC - REGISTRO ÚNICO DE CONTRIBUYENTE
    // 1 = DNI - DOC. NACIONAL DE IDENTIDAD
    // 4 = CARNET DE EXTRANJERÍA
    // 7 = PASAPORTE
    // A = CÉDULA DIPLOMÁTICA DE IDENTIDAD
    // 0 = NO DOMICILIADO, SIN RUC
    cliente_tipo_documento: "6" | "1" | "4" | "7" | "A" | "0";
    cliente_numero_documento: string;
    cliente_denominacion: string; // legal name
    codigo_pais: "PE";
    ubigeo?: string;
    cliente_direccion: string;
    cliente_email?: string;
    cliente_telefono?: string;
  };
  totales: {
    total_venta: number;
    total_tax: number;
    total_exoneradas: number;
    total_exportacion: number;
    total_gravadas: number;
    total_inafectas: number;
    total_gratuitas: number;
  };
  items: FactproDocumentItem[];
  acciones: {
    formato_pdf: "a4"; // revisar mas formatos
  };
  termino_de_pago: {
    descripcion: "Contado" | "Crédito";
    tipo: "0" | "1";
  };
  metodo_de_pago?: string;
  canal_de_venta: "";
  orden_de_compra: "";
  observaciones: "";
  almacen: "";
}
