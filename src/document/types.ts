type issuerData = {
    codigo_establecimiento: string;
}

export type clientDocumentType = "0" | "1" | "4" | "6" | "7" | "A";

export type rucDocument = Customer & {
    cliente_tipo_documento: "0";
}

export type dniDocument = Customer & {
    cliente_tipo_documento: "1";
}

export type carnetDocument = Customer & {
    cliente_tipo_documento: "4";
}

export type passportDocument = Customer & {
    cliente_tipo_documento: "6";
}

export type cedulaDocument = Customer & {
    cliente_tipo_documento: "7";
}

export type sinRucDocument = Customer & {
    cliente_tipo_documento: "A";
}

export type documentCustomer =
    | rucDocument
    | dniDocument
    | carnetDocument
    | passportDocument
    | cedulaDocument
    | sinRucDocument

export type Customer = {
    cliente_tipo_documento:  clientDocumentType;
    cliente_numero_documento: string;
    cliente_denominacion: string;
    codigo_pais?: string;
    ubigeo?: string;
    cliente_direccion?: string;
    cliente_email?: string;
    cliente_telefono?: string;
}

type paymentTerm = {
    descripcion?: string;
    tipo: string;
}

type totalPay = {
    total_exportacion?: number;
    total_gravadas?: number;
    total_inafectas?: number
    total_exoneradas?: number;
    total_gratuitas?: number;
    total_tax?: number;
    total_impuestos?: number;
    total_valor?: number;
    total_venta?: number;
}

export type items = {
    unidad: string;
    codigo: string;
    descripcion: string;
    codigo_producto_sunat?: string;
    codigo_producto_gsl?: string;
    cantidad: number;
    valor_unitario: number;
    tipo_precio: string;
    precio_unitario: number;
    tipo_tax: string;
    total_base_tax: number;
    porcentaje_tax: number;
    total_tax: number;
    total_impuestos: number;
    total_valor_item: number;
    total: number;
}

type format = {
    formato_pdf: string;
}

export type BodyDocument = {
    tipo_documento: string;
    serie?: string;
    numero: string;
    tipo_operacion: string;
    fecha_de_emision: string;
    hora_de_emision: string;
    moneda: string;
    fecha_de_vencimiento?: string;
    enviar_automaticamente_al_cliente?: boolean;
    datos_del_emisor: issuerData;
    cliente: documentCustomer;
    totales: totalPay;
    items: [items];
    acciones: format;
    termino_de_pago: paymentTerm;
    metodo_de_pago?: string;
    canal_de_venta?: string;
    orden_de_compra?: string;
    almacen?: string;
    observaciones?: string;
}