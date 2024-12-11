import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { Order } from "@/order/types";
import {
  Document as BillingDocument,
  DocumentType,
  Invoice,
  INVOICE,
  Receipt,
  RECEIPT,
  Ticket,
  TICKET,
} from "@/document/types";
import {
  billableNumberToWords,
  formatPrice,
  formatPriceWithoutCurrency,
  localizeOnlyDate,
  paymentMethodToText,
  shortLocalizeDate,
} from "@/lib/utils";
import { Company } from "@/company/types";
import { fullName } from "@/customer/utils";
import { isBillableDocument } from "@/document/utils";

const styles = StyleSheet.create({
  page: {
    flexDirection: "row",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    padding: 4,
  },
  section: {
    width: "100%",
    margin: 2,
    padding: 6,
    fontSize: 10,
  },
  header: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  documentSerialAndNumber: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  description: {
    fontSize: 10,
    textAlign: "center",
  },
  text: {
    fontSize: "8px",
    fontWeight: "ultralight",
  },
  smallText: {
    fontSize: "6px",
    fontWeight: "ultralight",
  },
  listProductsText: {
    fontSize: "8px",
    fontWeight: "ultralight",
  },
  textCenter: {
    fontSize: 10,
    textAlign: "center",
  },
  bold: {
    fontWeight: "bold",
  },
});

interface voucherProps {
  order: Order;
  document: BillingDocument;
  qrBase64?: string;
  company: Company;
}

const documentTypeToEs: Record<DocumentType, string> = {
  [INVOICE]: "FACTURA ELECTRÓNICA",
  [RECEIPT]: "BOLETA ELECTRÓNICA",
  [TICKET]: "NOTA DE VENTA ELECTRÓNICA",
};

const documentTypeToCustomerDocumentTypeES: Record<DocumentType, string> = {
  [TICKET]: "DNI",
  [RECEIPT]: "DNI",
  [INVOICE]: "RUC",
};

const zeroPad = (number: string) => number.padStart(8, "0");

const TicketTotals = ({ document }: { document: Ticket }) => (
  <View style={[styles.section, { marginTop: "10px" }]}>
    <View
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "flex-end",
      }}
    >
      <View>
        {document.discountAmount > 0 && (
          <>
            <Text
              style={{
                fontSize: "8px",
                fontWeight: "bold",
                textAlign: "right",
              }}
            >
              Subtotal:{" "}
            </Text>
            <Text
              style={{
                fontSize: "8px",
                fontWeight: "bold",
                textAlign: "right",
              }}
            >
              Descuento:{" "}
            </Text>
          </>
        )}
        <Text
          style={{
            fontSize: "12px",
            fontWeight: "bold",
            textAlign: "right",
          }}
        >
          Total:{" "}
        </Text>
      </View>
      <View>
        {document.discountAmount > 0 && (
          <>
            <Text style={{ fontSize: "10px" }}>
              {formatPrice(document.netTotal)}
            </Text>
            <Text style={{ fontSize: "10px" }}>
              {formatPrice(document.discountAmount)}
            </Text>
          </>
        )}
        <Text style={{ fontSize: "12px" }}>{formatPrice(document.total)}</Text>
      </View>
    </View>
  </View>
);

const BillingTotals = ({ document }: { document: Invoice | Receipt }) => (
  <View style={[styles.section, { marginTop: "10px" }]}>
    <View
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "flex-end",
      }}
    >
      <View>
        <Text
          style={{
            fontSize: "8px",
            fontWeight: "bold",
            textAlign: "right",
          }}
        >
          OP. Exoneradas:{" "}
        </Text>
        {document.discountAmount > 0 && (
          <>
            <Text
              style={{
                fontSize: "8px",
                fontWeight: "bold",
                textAlign: "right",
              }}
            >
              DESCUENTO:{" "}
            </Text>
          </>
        )}
        <Text
          style={{
            fontSize: "8px",
            fontWeight: "bold",
            textAlign: "right",
          }}
        >
          IGV:{" "}
        </Text>
        <Text
          style={{
            fontSize: "10px",
            fontWeight: "bold",
            textAlign: "right",
          }}
        >
          TOTAL A PAGAR:{" "}
        </Text>
      </View>
      <View>
        <Text style={{ fontSize: "8px" }}>
          {formatPrice(document.netTotal)}
        </Text>
        {document.discountAmount > 0 && (
          <>
            <Text style={{ fontSize: "8px" }}>
              {formatPrice(document.discountAmount)}
            </Text>
          </>
        )}
        <Text style={{ fontSize: "8px" }}>{formatPrice(0)}</Text>
        <Text style={{ fontSize: "10px" }}>{formatPrice(document.total)}</Text>
      </View>
    </View>
  </View>
);

// Create Document Component
const Voucher = ({ order, company, document, qrBase64 }: voucherProps) => (
  <Document>
    <Page
      size={{ width: 215, height: 850 }}
      style={styles.page}
      orientation="portrait"
    >
      {/*Company data*/}
      <View
        style={[
          styles.section,
          {
            marginTop: "18px",
            paddingBottom: "12px",
            borderBottom: "1px solid black",
            alignItems: "center",
          },
        ]}
      >
        {company.logo && (
          <Image src={company.logo.url} style={{ width: "40px" }} />
        )}
        <Text style={styles.header}>{company.subName}</Text>
        {company.ruc && (
          <Text style={styles.description}>RUC {company.ruc}</Text>
        )}
        <Text style={{ fontSize: 9, textAlign: "center" }}>
          {[company.district, company.provincial, company.department]
            .filter(Boolean)
            .join("-")}
        </Text>
        {company.address && (
          <Text style={styles.description}>
            D. Comercial: {company.address}
          </Text>
        )}
        <Text style={styles.description}>{company.email}</Text>
        <Text style={styles.description}>{company.phone}</Text>
      </View>

      {/*Document series and number*/}
      <View
        style={[
          styles.section,
          {
            paddingBottom: "12px",
            borderBottom: "1px solid black",
          },
        ]}
      >
        <Text style={styles.documentSerialAndNumber}>
          {documentTypeToEs[document.documentType]}
        </Text>
        <Text style={styles.documentSerialAndNumber}>
          {`${document.series}-${zeroPad(document.number)}`}
        </Text>
      </View>

      {/*Document data*/}
      <View
        style={[
          styles.section,
          {
            paddingBottom: "8px",
          },
        ]}
      >
        <Text style={styles.text}>
          F. Emisión: {shortLocalizeDate(document.dateOfIssue)}
        </Text>

        <Text style={styles.text}>
          F. Vencimiento: {localizeOnlyDate(document.dateOfIssue)}
        </Text>

        <Text style={styles.text}>
          Cliente: {order.customer && fullName(order.customer)}
        </Text>

        <Text style={styles.text}>
          {documentTypeToCustomerDocumentTypeES[document.documentType]}:{" "}
          {order.customer?.documentNumber}
        </Text>
      </View>

      {/*Document Details / Product list */}
      <View
        style={[
          styles.section,
          {
            marginTop: "5px",
            paddingBottom: "8px",
            borderBottom: "1px solid black",
          },
        ]}
      >
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            marginBottom: "5px",
          }}
        >
          <Text style={[styles.text, { width: "15%", textAlign: "center" }]}>
            Cant.
          </Text>
          <Text style={[styles.text, { width: "45%" }]}>Producto</Text>
          <Text style={[styles.text, { width: "20%", textAlign: "center" }]}>
            Precio
          </Text>
          <Text style={[styles.text, { width: "20%", textAlign: "right" }]}>
            Total
          </Text>
        </View>

        {order.orderItems.map((orderItem, index) => (
          <>
            <View
              key={index}
              style={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                marginBottom: orderItem.discount ? "2px" : "6px",
              }}
            >
              <Text
                style={[
                  styles.listProductsText,
                  { width: "15%", textAlign: "center" },
                ]}
              >
                {orderItem.quantity}
              </Text>
              <Text style={[styles.listProductsText, { width: "40%" }]}>
                {orderItem.productName}
              </Text>
              <Text
                style={[
                  styles.listProductsText,
                  { width: "22%", textAlign: "center" },
                ]}
              >
                {formatPriceWithoutCurrency(orderItem.productPrice)}
              </Text>
              <Text
                style={[
                  styles.listProductsText,
                  { width: "23%", textAlign: "right" },
                ]}
              >
                {formatPriceWithoutCurrency(orderItem.netTotal)}
              </Text>
            </View>

            {orderItem.discount && (
              <View
                key={index}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  flexWrap: "wrap",
                  marginBottom: "6px",
                }}
              >
                <Text
                  style={[
                    styles.listProductsText,
                    { width: "15%", textAlign: "center" },
                  ]}
                ></Text>
                <Text style={[styles.listProductsText, { width: "40%" }]}>
                  Descuento
                </Text>
                <Text
                  style={[
                    styles.listProductsText,
                    { width: "22%", textAlign: "center" },
                  ]}
                ></Text>
                <Text
                  style={[
                    styles.listProductsText,
                    { width: "23%", textAlign: "right" },
                  ]}
                >
                  - {formatPriceWithoutCurrency(orderItem.discountAmount)}
                </Text>
              </View>
            )}
          </>
        ))}
      </View>

      {document.documentType == "ticket" ? (
        <TicketTotals document={document} />
      ) : (
        <BillingTotals document={document} />
      )}

      <View
        style={{ marginBottom: "4px", marginRight: "auto", marginTop: "5px" }}
      >
        <Text style={styles.text}>
          Son:{" "}
          <Text style={[styles.bold, styles.text]}>
            {billableNumberToWords(document.total)}
          </Text>
        </Text>
      </View>

      <View style={{ display: "flex", flexDirection: "row", flexWrap: "wrap" }}>
        <View style={{ width: "35%" }}>
          {qrBase64 && <Image style={{ width: "90%" }} src={qrBase64} />}
        </View>
        <View style={{ width: "65%" }}>
          {isBillableDocument(document) && (
            <>
              <Text style={[styles.bold, styles.text]}>Código hash:</Text>
              <Text style={styles.text}>{document.hash}</Text>
            </>
          )}
          {order.payments.length && (
            <>
              <Text style={[styles.text, { marginTop: "2px" }]}>
                <Text style={styles.bold}>Condicion de pago:</Text>
                {order.payments.length > 1
                  ? "Combinado"
                  : paymentMethodToText(order.payments[0].method)}
              </Text>
              <Text style={[styles.bold, styles.text, { marginTop: "2px" }]}>
                Pagos:
              </Text>
              {order.payments.map((payment) => (
                <Text style={styles.text} key={payment.id}>
                  {`• ${paymentMethodToText(payment.method)} - ${formatPrice(payment.amount)}`}
                </Text>
              ))}
            </>
          )}
        </View>
      </View>
    </Page>
  </Document>
);

export default Voucher;
