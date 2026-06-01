import type { Company } from "@/company/types";
import {
  fullName,
  isBusinessCustomer,
  isNaturalCustomer,
} from "@/customer/utils";
import type { Document } from "@/document/types";
import { correlative, isBillableDocument } from "@/document/utils";
import type { Order, Payment } from "@/order/types";
import type { ReceiptPrintData } from "@/printing/types";

type BuildReceiptPrintDataParams = {
  order: Order;
  company: Company;
  document: Document;
};

const toIsoString = (date: Date | string | undefined): string | undefined => {
  if (!date) return undefined;
  if (typeof date === "string") return date;
  return date.toISOString();
};

const buildCustomer = (
  customer: Order["customer"],
): ReceiptPrintData["customer"] => {
  if (!customer) return undefined;

  return {
    name: fullName(customer),
    documentType: customer.documentType,
    documentNumber: customer.documentNumber,
    address: customer.address,
    email:
      isBusinessCustomer(customer) || isNaturalCustomer(customer)
        ? customer.email
        : undefined,
    phone:
      isBusinessCustomer(customer) || isNaturalCustomer(customer)
        ? customer.phoneNumber
        : undefined,
  };
};

const buildPayment = (
  payment: Payment,
): ReceiptPrintData["order"]["payments"][number] => {
  if (payment.method === "cash") {
    return {
      id: payment.id,
      method: payment.method,
      amount: payment.amount,
      receivedAmount: payment.received_amount,
      change: payment.change,
    };
  }

  if (payment.method === "wallet") {
    return {
      id: payment.id,
      method: payment.method,
      amount: payment.amount,
      operationCode: payment.operationCode,
      walletName: payment.name,
    };
  }

  return {
    id: payment.id,
    method: payment.method,
    amount: payment.amount,
  };
};

export const buildReceiptPrintData = ({
  order,
  company,
  document,
}: BuildReceiptPrintDataParams): ReceiptPrintData => ({
  company: {
    commercialName: company.subName,
    legalName: company.name,
    ruc: company.ruc,
    address: company.address,
    location: [company.district, company.provincial, company.department]
      .filter(Boolean)
      .join("-"),
    email: company.email,
    phone: company.phone,
    logoUrl: company.logo?.url,
  },
  document: {
    type: document.documentType,
    series: document.series,
    number: document.number,
    correlative: correlative(document),
    dateOfIssue: toIsoString(document.dateOfIssue)!,
    status: document.status,
    cancellationReason:
      document.status === "cancelled" ? document.cancellationReason : undefined,
    qr: isBillableDocument(document) ? document.qr : undefined,
    hash: isBillableDocument(document) ? document.hash : undefined,
    xml: isBillableDocument(document) ? document.xml : undefined,
    issuedToTaxEntity: document.issuedToTaxEntity,
    issuedAt: toIsoString(document.issuedAt),
    netTotal: document.netTotal,
    discountAmount: document.discountAmount,
    total: document.total,
  },
  customer: buildCustomer(order.customer),
  order: {
    id: order.id!,
    date: toIsoString(order.createdAt)!,
    items: order.orderItems.map((item) => ({
      id: item.id,
      productId: item.productId,
      sku: item.productSku,
      name: item.productName,
      quantity: item.quantity,
      unitType: item.unitType,
      unitPrice: item.productPrice,
      netTotal: item.netTotal,
      discountAmount: item.discountAmount,
      total: item.total,
    })),
    payments: order.payments.map(buildPayment),
    subtotal: order.netTotal,
    discount: order.discountAmount,
    total: order.total,
  },
  paper: {
    widthMm: 80,
    columns: 48,
  },
  fallbackPdfUrl: `/api/orders/${order.id}/documents`,
});
