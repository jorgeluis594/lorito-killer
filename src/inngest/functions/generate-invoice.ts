import { inngest } from "@/lib/inngest";
import { sendToTaxEntity } from "@/document/use_cases/send-to-tax-entity";
import { updateDocument, findDocumentById } from "@/document/db_repository";
import { find as getOrder } from "@/order/db_repository";
import { getBillingCredentialsFor } from "@/document/db_repository";
import billingDocumentGateway from "@/document/factpro/gateway";

interface GenerateInvoiceEvent {
  data: {
    orderId: string;
    companyId: string;
    documentId: string;
  };
}

export const generateInvoice = inngest.createFunction(
  {
    id: "send-to-tax-entity",
    name: "Send Document to Tax Entity",
    retries: 3,
  },
  { event: "document/send-to-tax-entity" },
  async ({ event, step }) => {
    const { documentId, companyId } = event.data;

    const result = await step.run("send-to-tax-entity", async () => {
      // Get billing credentials
      const billingCredentialsResponse = await getBillingCredentialsFor(companyId);
      if (!billingCredentialsResponse.success) {
        throw new Error("No billing credentials found");
      }

      const billingCredentials = billingCredentialsResponse.data;
      const { billingToken, ...billingSettings } = billingCredentials;

      // Send to tax entity
      const result = await sendToTaxEntity(
        billingDocumentGateway({ billingToken }),
        {
          updateDocument,
          findDocument: findDocumentById,
          getOrder,
        },
        documentId,
        { ...billingSettings, billingToken }
      );

      if (!result.success) {
        throw new Error(`Failed to send document to tax entity: ${result.message}`);
      }

      return result;
    });

    return {
      success: true,
      documentId,
      issuedAt: new Date(),
      result: result.data,
    };
  }
);