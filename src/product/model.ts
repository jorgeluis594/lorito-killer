import productInterface, {productType} from './interface';
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
    console.log({ photosResponse })
    if (photosResponse.success) {
      response.data.photos = photosResponse.data as PhotoType[]
    }

    return { success: true, data: new Product(
        response.data.name,
        response.data.price,
        response.data.sku,
        response.data.stock,
        response.data.photos,
        response.data.id,
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
    if (!photos.length) return { success: false, message: 'No photos to store' }

    const response = await repository.storePhotos(this.id, photos)
    if (response.success) this.photos.push(...photos)
    return response
  }

  async removePhoto(photoId: string):Promise<response> {
    if (!this.id) return { success: false, message: 'Product must be persisted' }
    if (!this.photos.find(photo => photo.id === photoId)) return { success: false, message: 'Photo not found' }

    return repository.removePhoto(photoId)
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
