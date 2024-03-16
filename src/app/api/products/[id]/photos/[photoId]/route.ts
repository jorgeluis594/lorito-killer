import Product from '@/product/model'
import {NextResponse} from "next/server";

export async function DELETE(_req: Request, { params }: { params: { id: string, photoId: string }}) {
  const { success: isProductFound, data: product} = await Product.find(params.id)
  if (!isProductFound) {
    return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 })
  }

  const response = await (product as Product).removePhoto(params.photoId)

  return NextResponse.json(response, { status: response.success ? 200 : 400 })
}