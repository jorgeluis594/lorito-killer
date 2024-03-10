import productInterface from './interface';
import { response } from '@/lib/types';
import { createProduct, updateProduct } from "@/product/repository";

export default class Product implements productInterface {
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
    const response = await createProduct(this)
    if (response.success) {
      this.id = response.data.id
    }

    return response
  }

  private async update():Promise<response> {
    return updateProduct(this)
  }
}

export class ProductApi implements productInterface {
  id?: string;
  name: string;
  price: number;
  sku: string;
  stock: number;
  updatedAt?: Date;
  createdAt?: Date;

  constructor(name: string, price: number, sku: string, stock: number, id?: string) {
    this.id = id;
    this.name = name;
    this.price = price;
    this.sku = sku;
    this.stock = stock;
  }

  async save():Promise<response> {
    return this.isPersisted() ? await this.update() : await this.create();
  }

  private isPersisted(): boolean {
    return !!this.id
  }

  private async create():Promise<response> {
    const res = await fetch('/api/products', {
      method: 'POST',
      body: this.toJson(),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const responseData = await res.json()
    if (responseData.success) {
      this.id = responseData.data.id
      return { success: true } as response
    } else {
      return { success: false, message: responseData.message } as response
    }
  }

  private async update():Promise<response> {
    return updateProduct(this)
  }

  private toJson() {
    return JSON.stringify(this)
  }
}