import Product from '@/product/model'
import {NextResponse} from "next/server";
export async function PUT(req: Request) {
  const reqData = await req.json()
  const {success} = await Product.find(reqData.id)
  if (!success) {
    return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 })
  }

  const product = new Product(reqData.name, reqData.price, reqData.sku, reqData.stock, reqData.id)
  const response = await product.save()
  return NextResponse.json(response, { status: response.success ? 200 : 400 })
}