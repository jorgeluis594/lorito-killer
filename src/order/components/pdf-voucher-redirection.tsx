import React, { useEffect } from "react";
import { Order } from "@/order/types";
import Voucher from "@/order/components/voucher";
import { ReloadIcon } from "@radix-ui/react-icons";
import { BlobProvider } from "@react-pdf/renderer";
import { Company } from "@/company/types";

interface PdfVoucherRedirectionProps {
  order: Order;
  company: Company;
  onPdfCreated: () => void;
}

const PdfVoucherRedirection: React.FC<PdfVoucherRedirectionProps> = ({
  order,
  company,
  onPdfCreated,
}) => {
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);

  useEffect(() => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
      onPdfCreated();
    }
  }, [pdfUrl]);

  return (
    <BlobProvider document={<Voucher order={order} company={company} />}>
      {({ url, loading }) => {
        if (loading) {
          return (
            <>
              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" /> Generando
              comprobante
            </>
          );
        } else {
          setPdfUrl(url);
          return null;
        }
      }}
    </BlobProvider>
  );
};

export default PdfVoucherRedirection;
