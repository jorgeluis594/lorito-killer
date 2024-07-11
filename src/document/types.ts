type issuerData = {
    codigo_establecimiento: string,
}

export type Customer = {
    id: string,
    cliente_tipo_documento: number,
    cliente_numero_documento: string,
    cliente_denominacion: string,
    codigo_pais: string,
    ubigeo: string,
    cliente_direccion: string,
    cliente_email: string,
    cliente_telefono: string,
}

type paymentTerm = {
    descripcion: string,
    tipo: number,
}

type totaPay = {
    total_exportacion: number,
    total_gravadas: number,
    total_inafectas: number,
    total_exoneradas: number,
    total_gratuitas: number,
    total_tax: number,
    total_impuestos: number,
    total_valor: number,
    total_venta: number,
}

type items = {
    unidad: string,
    codigo: string,
    descripcion: string,
    codigo_producto_sunat?: number,
    codigo_producto_gsl?: number,
    cantidad: number,
    valor_unitario: number,
    tipo_precio: string,
    precio_unitario: number,
    tipo_tax: string,
    total_base_tax: number,
    porcentaje_tax: number,
    total_tax: number,
    total_impuestos: number,
    total_valor_item: number,
    total: number,
}

type format = {
    formato_pdf: string,
}

export type BodyDocument = {
    tipo_documento: string,
    serie: string,
    numero: string,
    tipo_operacion: string,
    fecha_de_emision: Date,
    hora_de_emision: Date,
    moneda: string,
    fecha_de_vencimiento: Date,
    enviar_automaticamente_al_cliente: boolean,
    datos_del_emisor: issuerData,
    cliente: Customer,
    totales: totaPay,
    items: [items],
    acciones: format,
    termino_de_pago: paymentTerm,
    metodo_de_pago: string,
    canal_de_venta?: string,
    orden_de_compra?: string,
    almacen?: string,
    observaciones?: string,
}