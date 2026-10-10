export const FULFILLMENT_ORDER_TYPES = ["TAKE_AWAY", "DELIVERY"] as const;

export type FulfillmentOrderType = (typeof FULFILLMENT_ORDER_TYPES)[number];

export const isFulfillmentOrderType = (
  orderType: string | null | undefined,
): orderType is FulfillmentOrderType =>
  FULFILLMENT_ORDER_TYPES.some((type) => type === orderType);
