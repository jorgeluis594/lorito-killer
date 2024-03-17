import { Photo } from '@/product/types'
import { find as findProduct, storePhotos } from "@/product/db_repository";
import {NextResponse} from "next/server";

export async function POST(req: Request, { params }: { params: { id: string }}) {
  const photosData = await req.json() as Photo[]
  const { success: isProductFound} = await findProduct(params.id)
  if (!isProductFound) {
    return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 })
  }

  const response = await storePhotos(params.id, photosData)

  return NextResponse.json(response, { status: response.success ? 200 : 400 })
}