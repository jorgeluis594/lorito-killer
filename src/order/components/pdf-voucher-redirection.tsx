import React, { useEffect } from "react";
import { Order } from "@/order/types";
import Voucher from "@/order/components/voucher";
import { ReloadIcon } from "@radix-ui/react-icons";
import { BlobProvider } from "@react-pdf/renderer";
import { Company } from "@/company/types";
import type { Document } from "@/document/types";
import QRCode from "qrcode";

interface PdfVoucherRedirectionProps {
  order: Order;
  document: Document;
  company: Company;
  onPdfCreated: () => void;
}

const PdfVoucherRedirection: React.FC<PdfVoucherRedirectionProps> = ({
  order,
  document,
  company,
  onPdfCreated,
}) => {
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [QRBase64, setQRBase64] = React.useState<string | undefined>(undefined);
  const [QRProcessed, setQRProcessed] = React.useState<boolean>(false);

  useEffect(() => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
      onPdfCreated();
    }
  }, [pdfUrl]);

  const generateQRBase64 = (qrValue: string): Promise<string> =>
    new Promise((resolve, reject) => {
      QRCode.toDataURL(qrValue, function (err, code) {
        if (err) {
          reject(reject);
          return;
        }
        resolve(code);
      });
    });

  const setQR = async (qrBase64: string): Promise<undefined> => {
    setQRBase64(await generateQRBase64(qrBase64));
    setQRProcessed(true);
  };

  useEffect(() => {
    if (document.documentType != "ticket") setQR(document.qr);
    else setQRProcessed(true);
  }, []);

  return (
    QRProcessed && (
      <BlobProvider
        document={
          <Voucher
            document={document}
            order={order}
            company={company}
            qrBase64={QRBase64}
          />
        }
      >
        {({ url, loading, error }) => {
          console.log({ url, loading, error });
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
    )
  );
};

export default PdfVoucherRedirection;
