export type Adjustment = {
  id: string;
  productId?: string;
  quantity: number;
  type: "INCREASE" | "DECREASE";
};
