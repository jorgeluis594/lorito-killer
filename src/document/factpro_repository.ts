import {Order} from "@/order/types";
import {response} from "@/lib/types";
import {BodyDocument, Customer} from "@/document/types";
import {format} from "date-fns";
import axios from "axios";

export const createInvoice = async (order: Order): Promise<response<Order>> => {
    try {
        const { createdAt,documentNumeral,total, orderItems, ...orderData} = order
        const body: BodyDocument = {
            tipo_documento: "01",
            serie: documentNumeral,
            numero: "",
            tipo_operacion: "0101",
            fecha_de_emision: format(createdAt!,"dd/MM/yyyy hh:mm aa"),
            hora_de_emision: format(createdAt!,"hh:mm aa"),
            moneda: "PEN",
            fecha_de_vencimiento: "",
            enviar_automaticamente_al_cliente: true,
            datos_del_emisor: {
                codigo_establecimiento: order.companyId,
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
                total_gravadas: 0.00,
                total_inafectas: 0.00,
                total_exoneradas: 0.00,
                total_gratuitas: 0.00,
                total_tax: 0.00,
                total_impuestos: 0.00,
                total_valor: total,
                total_venta: total,
            },
            items: [
                {
                    unidad: "NIU",
                    codigo: "",
                    descripcion: "MacbookPro",
                    codigo_producto_sunat: "",
                    codigo_producto_gsl: "",
                    cantidad: 0,
                    valor_unitario: 0.00,
                    tipo_precio: "01",
                    precio_unitario: 0.00,
                    tipo_tax: "10",
                    total_base_tax: 0.00,
                    porcentaje_tax: 0.00,
                    total_tax: 0.00,
                    total_impuestos: 0.00,
                    total_valor_item: 0.00,
                    total: 0.00
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

        //const response = sendDocument(body);

        return {success: true, data: body};
    } catch (e: any) {
        return {success: false, message: e.message};
    }
}

export const createReceipt = async (order: Order): Promise<response<Order>> => {
    return {success: false, message: "createReceipt"};
}

const sendDocument = async (body: BodyDocument): Promise<response<BodyDocument>> => {

    const url = "https://dev.factpro.la/api/v2/documentos";
    const token = "123456789"

    try {
        const res = await axios.post(url, body, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });

        if (res.status === 200) {
            return {
                success: true,
                data: res.data,
            };
        }
    } catch (error) {
        console.error('Error al emitir la factura:', error);
    }

    return {success: false, message: "not implemented"};
}
