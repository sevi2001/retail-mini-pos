
import type { CartItem } from "@/types/checkout";

export type DiscountType = "amount" | "percent";

export interface BillSummary {
  subtotal: number;
  discount: number;
  total: number;
  cashReceived: number;
  change: number;
  balanceDue: number;
  canPay: boolean;
}

export function toCents(value: number): number {
  return Math.round(value * 100);
}

export function fromCents(value: number): number {
  return value / 100;
}

export function roundQuantity(quantity: number): number {
  return Math.round(quantity * 1000) / 1000;
}

export function calculateLineTotal(item: CartItem): number {
  return fromCents(
    Math.round(toCents(item.sellingPrice) * item.quantity)
  );
}

export function calculateBill(
  items: CartItem[],
  discountValue: number,
  discountType: DiscountType,
  cashReceived: number
): BillSummary {
  const subtotalCents = items.reduce(
    (sum, item) =>
      sum + Math.round(toCents(item.sellingPrice) * item.quantity),
    0
  );

  const safeDiscount = Number.isFinite(discountValue)
    ? Math.max(0, discountValue)
    : 0;

  const discountCents =
    discountType === "percent"
      ? Math.round(
          (subtotalCents * Math.min(safeDiscount, 100)) / 100
        )
      : Math.min(toCents(safeDiscount), subtotalCents);

  const totalCents = Math.max(0, subtotalCents - discountCents);

  const cashCents =
    Number.isFinite(cashReceived) && cashReceived >= 0
      ? toCents(cashReceived)
      : 0;

  return {
    subtotal: fromCents(subtotalCents),
    discount: fromCents(discountCents),
    total: fromCents(totalCents),
    cashReceived: fromCents(cashCents),
    change: fromCents(Math.max(0, cashCents - totalCents)),
    balanceDue: fromCents(Math.max(0, totalCents - cashCents)),
    canPay: items.length > 0 && cashCents >= totalCents,
  };
}
