
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

type RequestItem = {
  productId: string;
  quantity: number;
};

type CheckoutBody = {
  items: RequestItem[];
  discountType: "amount" | "percent";
  discountValue: number;
  cashReceived: number;
};

function moneyToCents(value: number): number {
  return Math.round(value * 100);
}

function validMoney(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100000000 &&
    Math.abs(value * 100 - Math.round(value * 100)) < 1e-7
  );
}

function validQuantity(value: unknown, unit: string): value is number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0 ||
    value > 1000000
  ) {
    return false;
  }

  if (unit === "pcs") return Number.isInteger(value);

  return (
    Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-7
  );
}

export async function POST(request: NextRequest) {
  try {
    const header = request.headers.get("authorization");

    if (!header?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const token = header.slice(7);
    const cashier = await getAdminAuth().verifyIdToken(token);

    if (!cashier.email) {
      return NextResponse.json(
        { error: "Cashier email is required." },
        { status: 403 }
      );
    }

    let body: CheckoutBody;

    try {
      body = (await request.json()) as CheckoutBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    if (
      !body ||
      !Array.isArray(body.items) ||
      body.items.length === 0 ||
      body.items.length > 50 ||
      !["amount", "percent"].includes(body.discountType) ||
      !validMoney(body.discountValue) ||
      !validMoney(body.cashReceived)
    ) {
      return NextResponse.json(
        { error: "Invalid checkout details." },
        { status: 400 }
      );
    }

    if (
      body.discountType === "percent" &&
      body.discountValue > 100
    ) {
      return NextResponse.json(
        { error: "Discount cannot exceed 100%." },
        { status: 400 }
      );
    }

    const ids = new Set<string>();

    for (const item of body.items) {
      if (
        !item ||
        typeof item.productId !== "string" ||
        !/^[A-Z0-9_-]{2,40}$/.test(item.productId) ||
        typeof item.quantity !== "number" ||
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0 ||
        ids.has(item.productId)
      ) {
        return NextResponse.json(
          { error: "Invalid or duplicate cart item." },
          { status: 400 }
        );
      }

      ids.add(item.productId);
    }

    const db = getAdminDb();
    const saleRef = db.collection("sales").doc();

    const productRefs = body.items.map((item) =>
      db.collection("products").doc(item.productId)
    );

    const result = await db.runTransaction(async (transaction) => {
      // All transaction reads happen before any writes.
      const snapshots = await transaction.getAll(...productRefs);

      const saleItems = [];
      let subtotalCents = 0;

      for (let index = 0; index < body.items.length; index++) {
        const requested = body.items[index];
        const snapshot = snapshots[index];

        if (!snapshot.exists) {
          throw new Error(
            `Product ${requested.productId} was not found.`
          );
        }

        const product = snapshot.data();

        if (!product || product.isActive !== true) {
          throw new Error(
            `Product ${requested.productId} is unavailable.`
          );
        }

        if (
          !validMoney(product.sellingPrice) ||
          typeof product.stockQty !== "number" ||
          !Number.isFinite(product.stockQty) ||
          product.stockQty < 0 ||
          !["pcs", "kg", "g", "L"].includes(product.unit) ||
          !validQuantity(requested.quantity, product.unit)
        ) {
          throw new Error(
            `Invalid product data or quantity for ${requested.productId}.`
          );
        }

        if (requested.quantity > product.stockQty + 1e-9) {
          throw new Error(
            `Insufficient stock for ${product.name}. Available: ${product.stockQty}.`
          );
        }

        const lineCents = Math.round(
          moneyToCents(product.sellingPrice) *
            requested.quantity
        );

        subtotalCents += lineCents;

        saleItems.push({
          productId: snapshot.id,
          sku: product.sku,
          name: product.name,
          unit: product.unit,
          quantity: requested.quantity,
          unitPrice: product.sellingPrice,
          lineTotal: lineCents / 100,
        });
      }

      const discountCents =
        body.discountType === "percent"
          ? Math.round(
              (subtotalCents * body.discountValue) / 100
            )
          : moneyToCents(body.discountValue);

      if (discountCents > subtotalCents) {
        throw new Error("Discount exceeds subtotal.");
      }

      const totalCents = subtotalCents - discountCents;
      const cashCents = moneyToCents(body.cashReceived);

      if (cashCents < totalCents) {
        throw new Error("Cash received is insufficient.");
      }

      // Read and validate everything before writing.
      for (let index = 0; index < body.items.length; index++) {
        const currentStock = snapshots[index].data()!.stockQty;
        const quantity = body.items[index].quantity;

        const newStock =
          Math.round((currentStock - quantity) * 1000) / 1000;

        transaction.update(productRefs[index], {
          stockQty: newStock,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      const invoiceNumber = `INV-${saleRef.id.toUpperCase()}`;

      transaction.create(saleRef, {
        invoiceNumber,
        cashierId: cashier.uid,
        cashierEmail: cashier.email,
        items: saleItems,
        subtotal: subtotalCents / 100,
        discountType: body.discountType,
        discountValue: body.discountValue,
        discount: discountCents / 100,
        total: totalCents / 100,
        cashReceived: cashCents / 100,
        change: (cashCents - totalCents) / 100,
        paymentMethod: "cash",
        createdAt: FieldValue.serverTimestamp(),
      });

      return { saleId: saleRef.id };
    });

    return NextResponse.json(result, { status: 201 });
 
} catch (error) {
  console.error("CHECKOUT SERVER ERROR:", error);

  const message =
    error instanceof Error
      ? error.message
      : String(error);

  return NextResponse.json(
    {
      error: "Checkout failed.",
      details:
        process.env.NODE_ENV === "development"
          ? message
          : undefined,
    },
    { status: 500 }
  );
}

}
