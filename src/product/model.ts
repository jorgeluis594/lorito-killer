import productInterface from './interface';
import { response } from '@/lib/types';
import { createProduct, updateProduct } from "@/product/repository";

class Product implements productInterface {
  id?: string;
  name: string;
  price: number;
  sku: string;
  stock: number;
  updatedAt?: Date;
  createdAt?: Date;

  constructor(name: string, price: number, sku: string, stock: number) {
    this.name = name;
    this.price = price;
    this.sku = sku;
    this.stock = stock;
  }

  async save():Promise<response> {
    if (this.isPersisted()) {
      return this.update()
    } else {
      return this.create()
    }
  }

  private isPersisted(): boolean {
    return !!this.id
  }

  private async create():Promise<response> {
    return createProduct(this)
  }

  private async update():Promise<response> {
    return updateProduct(this)
  }
}