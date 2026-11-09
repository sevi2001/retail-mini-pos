
import type { Timestamp } from "firebase/firestore";
import type { ProductUnit } from "@/types/products";

export interface SaleItem {
  productId: string;
  sku: string;
  name: string;
  unit: ProductUnit;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  cashierId: string;
  cashierEmail: string;
  items: SaleItem[];
  subtotal: number;
  discountType: "amount" | "percent";
  discountValue: number;
  discount: number;
  total: number;
  cashReceived: number;
  change: number;
  paymentMethod: "cash";
  createdAt: Timestamp | null;
}

export interface CheckoutRequest {
  items: {
    productId: string;
    quantity: number;
  }[];
  discountType: "amount" | "percent";
  discountValue: number;
  cashReceived: number;
}

export interface CheckoutResult {
  saleId: string;
}
