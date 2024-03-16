import {Photo as PhotoType, Photo, response} from "@/lib/types";

export type productType = {
    id?: string;
    name: string;
    price: number;
    sku: string;
    stock: number;
    photos: PhotoType[];
    updatedAt?: Date;
    createdAt?: Date;
}

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
    values(): productType
}