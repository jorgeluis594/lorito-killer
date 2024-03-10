import Product from '@/product/model'
import {NextResponse} from "next/server";

export async function POST(req: Request) {
  const data = await req.json()
  const product = new Product(data.name, data.price, data.sku, data.stock)
  const response = await product.save()

  console.log({response, product})
  if (response.success) {
    return NextResponse.json({ success: true, data: { ...product } }, { status: 201 })
  } else {
    return NextResponse.json(response, { status: 400 })
  }
}