import productInterface from './interface';
import { Photo as PhotoType } from '@/lib/types';
import { response } from '@/lib/types';
import * as repository from "@/product/repository";

type productListResponse = {
  success: boolean
  data?: productInterface[]
}

type productResponse = {
  success: boolean
  data?: productInterface
}

export default class Product implements productInterface {
  id?: string;
  name: string;
  price: number;
  sku: string;
  stock: number;
  photos: PhotoType[];
  updatedAt?: Date;
  createdAt?: Date;

  static async list():Promise<productListResponse> {
    const response = await repository.findProducts()

    if (response.success) {
      return { success: true, data: response.data as Product[] } as productListResponse
    } else {
      return { success: false, data: [] } as productListResponse
    }
  }

  static async find(id: string):Promise<productResponse> {
    const response = await repository.findProduct(id)
    if (!response.success) return { success: false } as productResponse
    const photosResponse = await repository.getPhotos(id)
    if (photosResponse.success) {
      response.data.photos = photosResponse.data as PhotoType[]
    }

    return { success: true, data: new Product(
        response.data.name,
        response.data.price,
        response.data.sku,
        response.data.stock,
        response.data.photos,
        response.data.id
      ) } as productResponse
  }

  constructor(name: string, price: number, sku: string, stock: number, photos: PhotoType[] = [], id?: string) {
    this.id = id
    this.name = name;
    this.price = price;
    this.sku = sku;
    this.stock = stock;
    this.photos = photos;
  }

  async save():Promise<response> {
    if (this.isPersisted()) {
      return this.update()
    } else {
      return this.create()
    }
  }

  async storePhotos(photos: PhotoType[]):Promise<response> {
    if (!this.id) return { success: false, message: 'Product must be persisted' }
    if (!this.photos.length) return { success: false, message: 'No photos to store' }

    const response = await repository.storePhotos(this.id, this.photos)
    if (response.success) this.photos.push(...photos)
    return response
  }

  async removePhoto(photoId: string):Promise<response> {
    if (!this.id) return { success: false, message: 'Product must be persisted' }
    if (!this.photos.find(photo => photo.id === photoId)) return { success: false, message: 'Photo not found' }

    return repository.removePhoto(photoId)
  }

  private isPersisted(): boolean {
    return !!this.id
  }

  private async create():Promise<response> {
    const response = await repository.createProduct(this)
    if (response.success) {
      this.id = response.data.id
    }

    return response
  }

  private async update():Promise<response> {
    return repository.updateProduct(this)
  }
}

export class ProductApi implements productInterface {
  id?: string;
  name: string;
  price: number;
  sku: string;
  stock: number;
  photos: PhotoType[];
  updatedAt?: Date;
  createdAt?: Date;

  constructor(name: string, price: number, sku: string, stock: number, photos: PhotoType[], id?: string) {
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
    const currentPhotos = new Set(photos)
    const photosToStore = photos.filter(photo => !currentPhotos.has(photo))
    const res = await fetch(`/api/products/${this.id}/photos`, {
      method: 'POST',
      body: JSON.stringify(photosToStore),
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
    return { success: true }
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