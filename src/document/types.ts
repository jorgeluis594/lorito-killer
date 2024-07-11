
export type Customer = {
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
    datos_del_emisor: {
        codigo_establecimiento: string,
    },
    cliente: Customer,
    totales: {
        total_exportacion: 0.00,
        total_gravadas: 100.00,
        total_inafectas: 0.00,
        total_exoneradas: 0.00,
        total_gratuitas: 0.00,
        total_tax: 18.00,
        total_impuestos: 18.00,
        total_valor: 100,
        total_venta: 118
    },
    items: [
        {
            unidad: "NIU",
            codigo: "",
            descripcion: "MacbookPro",
            codigo_producto_sunat: "",
            codigo_producto_gsl: "",
            cantidad: 1,
            valor_unitario: 100,
            tipo_precio: "01",
            precio_unitario: 118,
            tipo_tax: "10",
            total_base_tax: 100.00,
            porcentaje_tax: 18,
            total_tax: 18,
            total_impuestos: 18,
            total_valor_item: 100,
            total: 118
        }
    ],
    acciones: format,
    termino_de_pago: paymentTerm,
    metodo_de_pago: string,
    canal_de_venta: string,
    orden_de_compra: string,
    almacen: string,
    observaciones: string,
}