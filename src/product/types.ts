export type Photo = {
  id?: string
  name: string
  size: number
  key: string
  url: string
  createdAt?: Date
}

export type Product = {
  id?: string;
  name: string;
  price: number;
  sku: string;
  stock: number;
  photos?: Photo[];
  updatedAt?: Date;
  createdAt?: Date;
}
