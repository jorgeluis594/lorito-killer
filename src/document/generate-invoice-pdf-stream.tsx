import Voucher from "@/order/components/voucher";
import { Company } from "@/company/types";
import { Customer } from "@/customer/types";
import { Order } from "@/order/types";
import { Document } from "@/document/types";
import { renderToStream } from "@react-pdf/renderer";

const generateInvoicePdfStream = async (
  order: Order,
  company: Company,
  document: Document,
  customer: Customer,
  qrBase?: string,
) => {
  return renderToStream(
    <Voucher
      company={company}
      document={document}
      order={order}
      customer={customer}
      qrBase64={qrBase}
    />,
  );
};

export default generateInvoicePdfStream;
