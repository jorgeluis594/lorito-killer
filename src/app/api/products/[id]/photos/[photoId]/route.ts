import { removePhoto, find as findProduct } from '@/product/db_repository'
import {NextResponse} from "next/server";

export async function DELETE(_req: Request, { params }: { params: { id: string, photoId: string }}) {
  const { success: isProductFound, data: product} = await findProduct(params.id)
  if (!isProductFound || !product) {
    return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 })
  }

  const response = await removePhoto(product.id as string, params.photoId)

  return NextResponse.json(response, { status: response.success ? 200 : 400 })
}