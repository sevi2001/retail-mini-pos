
import type { Timestamp } from "firebase/firestore";

export const PRODUCT_UNITS = ["pcs", "kg", "g", "L"] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: ProductUnit;
  costPrice: number;
  sellingPrice: number;
  stockQty: number;
  isActive: boolean;
  updatedAt: Timestamp | null;
}

export type ProductInput = Pick<
  Product,
  | "sku"
  | "name"
  | "category"
  | "unit"
  | "costPrice"
  | "sellingPrice"
  | "stockQty"
>;
