import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { generateInvoice } from "@/inngest/functions/generate-invoice";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateInvoice],
});