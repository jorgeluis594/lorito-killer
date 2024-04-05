import { Product } from "@/product/types";
import ProductItem from "./product-item";

interface ProductListProps {
  products: Product[];
}

export default function ProductList({ products }: ProductListProps) {
  return (
    <div className="py-4 h-full flex-wrap grid grid-flow-row auto-rows-[250px] grid-cols-[repeat(auto-fill,200px)] gap-4">
      {products.length ? (
        products.map((product) => (
          <ProductItem key={product.id} product={product} />
        ))
      ) : (
        <div className="text-center">No hay productos</div>
      )}
    </div>
  );
}
