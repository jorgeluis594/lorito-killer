"use server";

import { response } from "@/lib/types";
import { Order, OrderWithBusinessCustomer } from "@/order/types";
import type {
  Document,
  Invoice,
  Receipt,
  Ticket,
  DocumentType,
  BillingCredentials,
} from "@/document/types";
import { hasBusinessCustomer } from "@/order/utils";
import { errorResponse } from "@/lib/utils";
import { log } from "@/lib/log";

export interface DocumentMetadata {
  serialNumber: string;
  documentNumber: number;
  establishmentCode: string;
}

export interface DocumentGateway {
  createInvoice: (
    order: OrderWithBusinessCustomer,
    documentMetadata: DocumentMetadata,
  ) => Promise<response<Invoice>>;
  createReceipt: (
    order: Order,
    documentMetadata: DocumentMetadata,
  ) => Promise<response<Receipt>>;
  createTicket: (
    order: Order,
    documentMetadata: Omit<DocumentMetadata, "establishmentCode">,
  ) => Promise<response<Ticket>>;
}

interface Repository {
  updateDocument: (
    documentId: string,
    data: {
      xml?: string;
      qr?: string;
      hash?: string;
      issuedToTaxEntity?: boolean;
      issuedAt?: Date;
    }
  ) => Promise<response<Document>>;
  findDocument: (documentId: string) => Promise<response<Document>>;
  getOrder: (orderId: string, companyId: string) => Promise<response<Order>>;
}

type BillingSettings = Omit<
  BillingCredentials,
  "billingToken" | "customerSearchToken"
>;

const serverError = errorResponse(
  "Error al enviar el documento a la entidad tributaria",
);

export const sendToTaxEntity = async (
  documentGateway: DocumentGateway,
  repository: Repository,
  documentId: string,
  billingConfig: BillingSettings & { billingToken?: string },
): Promise<response<Document>> => {
  // Get the document and order
  const documentResponse = await repository.findDocument(documentId);
  if (!documentResponse.success) {
    log.error("document_not_found_test----------------", { documentId });
    return serverError;
  }

  const document = documentResponse.data;
  const orderResponse = await repository.getOrder(document.orderId, document.companyId);
  if (!orderResponse.success) {
    log.error("order_not_found", { orderId: document.orderId, documentId });
    return serverError;
  }

  const order = orderResponse.data;

  const documentMetadata = {
    serialNumber: document.series,
    documentNumber: parseInt(document.number),
    establishmentCode: billingConfig.establishmentCode || "",
  };

  const { establishmentCode, ...restMetadata } = documentMetadata;

  let taxEntityResponse: response<Document>;

  try {
    switch (document.documentType) {
      case "ticket":
        taxEntityResponse = await documentGateway.createTicket(order, restMetadata);
        log.info("ticket_sent_to_tax_entity", { order, documentMetadata, taxEntityResponse });
        break;
      case "receipt":
        if (!establishmentCode) {
          return serverError;
        }

        taxEntityResponse = await documentGateway.createReceipt(order, {
          ...restMetadata,
          establishmentCode,
        });

        log.info("receipt_sent_to_tax_entity", { order, documentMetadata, taxEntityResponse });
        break;
      case "invoice":
        if (!hasBusinessCustomer(order)) {
          return {
            success: false,
            message: "El cliente debe ser empresa",
          };
        }

        if (!establishmentCode) {
          return serverError;
        }

        taxEntityResponse = await documentGateway.createInvoice(order, {
          ...restMetadata,
          establishmentCode,
        });

        log.info("invoice_sent_to_tax_entity", { order, documentMetadata, taxEntityResponse });
        break;
      default:
        throw new Error("Invalid document type");
    }

    if (!taxEntityResponse.success) {
      log.error("tax_entity_submission_failed", { 
        documentId, 
        documentType: document.documentType,
        error: taxEntityResponse.message 
      });
      return serverError;
    }

    // Update document with tax entity response data
    const updateData: {
      xml?: string;
      qr?: string;
      hash?: string;
      issuedToTaxEntity: boolean;
      issuedAt: Date;
    } = {
      issuedToTaxEntity: true,
      issuedAt: new Date(),
    };

    // Only add QR and hash for billable documents
    if (document.documentType !== "ticket" && 'qr' in taxEntityResponse.data) {
      updateData.qr = taxEntityResponse.data.qr;
      updateData.hash = taxEntityResponse.data.hash;
    }

    const updatedDocumentResponse = await repository.updateDocument(documentId, updateData);
    if (!updatedDocumentResponse.success) {
      log.error("document_update_failed", { documentId, updateData });
      return serverError;
    }

    log.info("document_successfully_sent_to_tax_entity", { 
      documentId, 
      documentType: document.documentType,
      issuedAt: updateData.issuedAt 
    });

    return updatedDocumentResponse;

  } catch (error: any) {
    log.error("tax_entity_submission_error", { 
      documentId, 
      error: error.message 
    });
    return serverError;
  }
};