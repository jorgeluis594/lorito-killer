import productInterface, {productType} from "@/product/interface";
import {Photo as PhotoType, response} from "@/lib/types";

export default class ProductApi implements productInterface {
  id?: string;
  name: string;
  price: number;
  sku: string;
  stock: number;
  photos: PhotoType[];
  updatedAt?: Date;
  createdAt?: Date;

  constructor(name: string, price: number, sku: string, stock: number, photos: PhotoType[] = [], id?: string) {
    this.id = id;
    this.name = name;
    this.price = price;
    this.sku = sku;
    this.stock = stock;
    this.photos = photos;
  }

  async save():Promise<response> {
    return this.isPersisted() ? await this.update() : await this.create();
  }

  async storePhotos(photos: PhotoType[]):Promise<response> {
    const currentPhotos = new Set(this.photos)
    const photosToStore = photos.filter(photo => !currentPhotos.has(photo))
    const res = await fetch(`/api/products/${this.id}/photos`, {
      method: 'POST',
      body: JSON.stringify({photos: photosToStore}),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const responseData = await res.json()
    if (responseData.success) {
      this.photos.push(...photosToStore)
    }

    return responseData
  }

  async removePhoto(photoId: string):Promise<response> {
    const res = await fetch(`/api/products/${this.id}/photos/${photoId}`, {
      method: 'DELETE'
    })

    const responseData = await res.json()
    if (responseData.success) {
      this.photos = this.photos.filter(photo => photo.id !== photoId)
    }

    return responseData
  }

  values(): productType {
    return {
      id: this.id,
      name: this.name,
      price: this.price,
      sku: this.sku,
      stock: this.stock,
      photos: this.photos,
      updatedAt: this.updatedAt,
      createdAt: this.createdAt
    }
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
    const res = await fetch(`/api/products/${this.id}`, {
      method: 'PUT',
      body: this.toJson(),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    return await res.json()
  }

  private toJson() {
    return JSON.stringify(this)
  }
}