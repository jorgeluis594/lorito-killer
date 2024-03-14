import {response} from "@/lib/types";

export default interface Interface {
    id?: string
    name: string
    price: number
    sku: string
    stock: number
    createdAt?: Date
    updatedAt?: Date

    save(): Promise<response>
    storePhotos(): Promise<response>
    removePhoto(photoId: string): Promise<response>
}