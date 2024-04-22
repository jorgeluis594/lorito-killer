import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import { Order } from "@/order/types";
import {
  formatPrice,
  localizeDate,
  paymentMethodToText,
  shortLocalizeDate,
} from "@/lib/utils";

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
  description: {
    fontSize: 10,
    textAlign: "center",
  },
  text: {
    fontSize: 10,
  },
  textCenter: {
    fontSize: 10,
    textAlign: "center",
  },
});

interface voucherProps {
  order: Order;
}

// Create Document Component
const Voucher = ({ order }: voucherProps) => (
  <Document>
    <Page
      size={{ width: 215, height: 595 }}
      style={styles.page}
      orientation="portrait"
    >
      <View
        style={[
          styles.section,
          {
            marginTop: "18px",
            paddingBottom: "12px",
            borderBottom: "1px solid black",
          },
        ]}
      >
        <Text style={styles.header}>Minimarket Chávez</Text>
        <Text style={styles.description}>
          Carretera Central Km 17, Manantay, Pucallpa, Ucayali
        </Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.textCenter}>
          <Text style={{ fontWeight: "ultrabold", marginRight: "2px" }}>
            Fecha:{" "}
          </Text>
          {shortLocalizeDate(order.createdAt!)}
        </Text>
        <Text style={styles.textCenter}>
          <Text style={{ fontWeight: "extrabold", marginRight: "2px" }}>
            Método de pago:{" "}
          </Text>
          {order.payments.length > 1
            ? "Combinado"
            : paymentMethodToText(order.payments[0].method)}
        </Text>
      </View>
      <View style={[styles.section, { marginTop: "5px" }]}>
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            marginBottom: "5px",
          }}
        >
          <Text style={[styles.text, { width: "45%" }]}>Producto</Text>
          <Text style={[styles.text, { width: "15%", textAlign: "center" }]}>
            Cantidad
          </Text>
          <Text style={[styles.text, { width: "20%", textAlign: "center" }]}>
            Precio
          </Text>
          <Text style={[styles.text, { width: "20%", textAlign: "right" }]}>
            Total
          </Text>
        </View>

        {order.orderItems.map((orderItem, index) => (
          <View
            key={index}
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              marginBottom: "1.5px",
            }}
          >
            <Text style={[styles.text, { width: "45%" }]}>
              {orderItem.productName}
            </Text>
            <Text style={[styles.text, { width: "15%", textAlign: "center" }]}>
              {orderItem.quantity}
            </Text>
            <Text style={[styles.text, { width: "20%", textAlign: "center" }]}>
              {formatPrice(orderItem.productPrice)}
            </Text>
            <Text style={[styles.text, { width: "20%", textAlign: "right" }]}>
              {formatPrice(orderItem.total)}
            </Text>
          </View>
        ))}
      </View>
      <View style={[styles.section, { marginTop: "10px" }]}>
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "flex-end",
          }}
        >
          <Text style={{ fontSize: "12px", fontWeight: "black" }}>Total: </Text>
          <Text style={{ fontSize: "12px" }}>{formatPrice(order.total)}</Text>
        </View>
      </View>

      <View style={[styles.section, { marginTop: "4px" }]}>
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "flex-start",
            lineHeight: "1.2px",
          }}
        >
          <Text style={{ fontSize: "10px", fontWeight: "black" }}>
            Total de lineas:{" "}
          </Text>
          <Text style={{ fontSize: "10px" }}>{order.orderItems.length}</Text>
        </View>
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "flex-start",
            lineHeight: "2px",
          }}
        >
          <Text style={{ fontSize: "10px", fontWeight: "black" }}>
            Total de productos:{" "}
          </Text>
          <Text style={{ fontSize: "10px" }}>
            {order.orderItems.reduce((acc, oi) => acc + oi.quantity, 0)}
          </Text>
        </View>
      </View>
    </Page>
  </Document>
);

export default Voucher;
