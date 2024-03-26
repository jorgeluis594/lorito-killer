import { Product } from "@/product/types";

export type OrderItem = {
  id?: string;
  product: Product;
  quantity: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export type Order = {
  id?: string;
  orderItems: OrderItem[];
  total: number;
  createdAt?: Date;
  updatedAt?: Date;
};
