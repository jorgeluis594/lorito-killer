import Product from '@/product/model'
import {NextResponse} from "next/server";

export async function POST(req: Request) {
  const reqData = await req.json()
  const { success: isProductFound, data: product} = await Product.find(reqData.id)
  if (!isProductFound) {
    return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 })
  }

  const response = await (product as Product).storePhotos(reqData.photos)

  return NextResponse.json(response, { status: response.success ? 200 : 400 })
}