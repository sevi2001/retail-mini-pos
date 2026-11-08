
import type { Product, ProductUnit } from "@/types/products";

export interface CartItem {
  productId: string;
  sku: string;
  name: string;
  unit: ProductUnit;
  sellingPrice: number;
  quantity: number;
  availableStock: number;
}

export function productToCartItem(product: Product): CartItem {
  return {
    productId: product.id,
    sku: product.sku,
    name: product.name,
    unit: product.unit,
    sellingPrice: product.sellingPrice,
    quantity: 1,
    availableStock: product.stockQty,
  };
}
