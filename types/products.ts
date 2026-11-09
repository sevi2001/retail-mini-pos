
import type { Timestamp } from "firebase/firestore";

// ==========================================
// PRODUCT UNITS
// ==========================================

export const PRODUCT_UNITS = [
  "pcs",
  "kg",
  "g",
  "L",
] as const;

export type ProductUnit =
  (typeof PRODUCT_UNITS)[number];

// ==========================================
// PRODUCT INTERFACE
// ==========================================

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

  // Local image path, e.g. /products/red-dhal.jpg
  imageUrl?: string;

  updatedAt: Timestamp | null;
}

// ==========================================
// PRODUCT INPUT
// ==========================================

export type ProductInput = Pick<
  Product,
  | "sku"
  | "name"
  | "category"
  | "unit"
  | "costPrice"
  | "sellingPrice"
  | "stockQty"
  | "imageUrl"
>;
