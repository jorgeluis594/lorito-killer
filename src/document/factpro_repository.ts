import {Order} from "@/order/types";
import {response} from "@/lib/types";
import {BodyDocument} from "@/document/types";

export const createInvoice = async ( order: Order):Promise<response<Order>> => {
    const body: BodyDocument= {
        tipo_documento: "01",
        serie: "",
        numero: "",
        tipo_operacion: "0101",
        fecha_de_emision: new Date().toString().split('T')[0],
        hora_de_emision: new Date().toTimeString().split(' ')[0],
        moneda: "PEN",
        fecha_de_vencimiento: "",
        enviar_automaticamente_al_cliente: true,
        datos_del_emisor: {
            codigo_establecimiento: "0000"
        },
        cliente: {
            cliente_tipo_documento: "1",
            cliente_numero_documento: "20605577246",
            cliente_denominacion: "CORPORACION VEL PERU S.A.C.",
            codigo_pais: "",
            ubigeo: "",
            cliente_direccion: "Av.",
            cliente_email: "",
            cliente_telefono: ""
        },
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
        acciones: {
            formato_pdf: "a4"
        },
        termino_de_pago: {
            descripcion: "Contado",
            tipo: "0"
        },
        metodo_de_pago: "",
        canal_de_venta: "",
        orden_de_compra: "",
        almacen: "",
        observaciones: ""
    }

    return {success: false, message: "sentDocument"};

}

export const createReceipt = async ( order: Order):Promise<response<Order>> => {
    return { success: false, message: "not implemented"};
}

export const sendDocument = async (body: any): Promise<response<boolean>> => {
    return {success: false, message: "sentDocument"};
}