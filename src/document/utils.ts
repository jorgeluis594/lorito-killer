import { Document, Invoice, Receipt, Ticket } from "@/document/types";

export const isInvoice = (document: Document): document is Invoice => {
  return document.documentType == "invoice";
};

export const isReceipt = (document: Document): document is Receipt => {
  return document.documentType == "receipt";
};

export const isTicket = (document: Document): document is Ticket => {
  return document.documentType == "ticket";
};

export const isBillableDocument = (
  document: Document,
): document is Invoice | Receipt => {
  return isInvoice(document) || isReceipt(document);
};
