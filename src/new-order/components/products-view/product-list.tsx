import { Product } from "@/product/types";
import ProductItem from "./product-item";

interface ProductListProps {
  products: Product[];
}

export default function ProductList({ products }: ProductListProps) {
  return (
    <div className="py-4 h-[410px] md:h-full grid grid-cols-2 md:flex-wrap md:grid-flow-row md:auto-rows-[250px] md:grid-cols-[repeat(auto-fill,200px)] gap-4">
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
