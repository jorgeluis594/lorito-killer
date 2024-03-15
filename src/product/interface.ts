import {Photo, response} from "@/lib/types";

export default interface Interface {
    id?: string
    name: string
    price: number
    sku: string
    stock: number
    photos: Photo[]
    createdAt?: Date
    updatedAt?: Date

    save(): Promise<response>
    storePhotos(photos: Photo[]): Promise<response>
    removePhoto(photoId: string): Promise<response>
}