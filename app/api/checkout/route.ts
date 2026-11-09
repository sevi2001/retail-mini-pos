
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

type RequestItem = {
  productId: string;
  quantity: number;
};

type CheckoutBody = {
  requestId: string;
  items: RequestItem[];
  discountType: "amount" | "percent";
  discountValue: number;
  cashReceived: number;
};

class CheckoutError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

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

  if (unit === "pcs") {
    return Number.isInteger(value);
  }

  return (
    Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-7
  );
}

function fingerprintCheckout(body: CheckoutBody): string {
  const normalizedItems = [...body.items]
    .map(({ productId, quantity }) => ({
      productId,
      quantity,
    }))
    .sort((a, b) =>
      a.productId.localeCompare(b.productId)
    );

  return createHash("sha256")
    .update(
      JSON.stringify({
        items: normalizedItems,
        discountType: body.discountType,
        discountValue: body.discountValue,
        cashReceived: body.cashReceived,
      })
    )
    .digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    // STEP 1: Verify Firebase authentication token
    const header = request.headers.get("authorization");

    if (!header?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const token = header.slice(7);

    let cashier;

    try {
      cashier = await getAdminAuth().verifyIdToken(token);
    } catch {
      throw new CheckoutError(
        "Invalid or expired authentication token.",
        401
      );
    }

    if (!cashier.email) {
      throw new CheckoutError(
        "Cashier email is required.",
        403
      );
    }

    // STEP 2: Allow Manager and Cashier roles only
    const isManager = cashier.manager === true;
    const isCashier = cashier.cashier === true;

    if (!isManager && !isCashier) {
      throw new CheckoutError(
        "Only Managers and Cashiers can complete sales.",
        403
      );
    }

    // STEP 3: Read checkout request
    let body: CheckoutBody;

    try {
      body = (await request.json()) as CheckoutBody;
    } catch {
      throw new CheckoutError(
        "Invalid request body.",
        400
      );
    }

    // STEP 4: Validate checkout details
    if (
      !body ||
      typeof body.requestId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        body.requestId
      ) ||
      !Array.isArray(body.items) ||
      body.items.length === 0 ||
      body.items.length > 50 ||
      !["amount", "percent"].includes(body.discountType) ||
      !validMoney(body.discountValue) ||
      !validMoney(body.cashReceived)
    ) {
      throw new CheckoutError(
        "Invalid checkout details or request ID.",
        400
      );
    }

    if (
      body.discountType === "percent" &&
      body.discountValue > 100
    ) {
      throw new CheckoutError(
        "Discount cannot exceed 100%.",
        400
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
        throw new CheckoutError(
          "Invalid or duplicate cart item.",
          400
        );
      }

      ids.add(item.productId);
    }

    // STEP 5: Prepare Firestore references
    const db = getAdminDb();

    const saleRef = db
      .collection("sales")
      .doc(`${cashier.uid}_${body.requestId}`);

    const payloadHash = fingerprintCheckout(body);

    const productRefs = body.items.map((item) =>
      db.collection("products").doc(item.productId)
    );

    // STEP 6: Process checkout transaction
    const result = await db.runTransaction(
      async (transaction) => {
        // Prevent duplicate checkout requests
        const existingSale = await transaction.get(saleRef);

        if (existingSale.exists) {
          if (
            existingSale.get("requestHash") !== payloadHash
          ) {
            throw new CheckoutError(
              "This checkout request ID was already used for different sale details.",
              409
            );
          }

          return {
            saleId: saleRef.id,
            alreadyProcessed: true,
          };
        }

        // Read product data
        const snapshots = await transaction.getAll(
          ...productRefs
        );

        const saleItems = [];
        let subtotalCents = 0;

        for (
          let index = 0;
          index < body.items.length;
          index++
        ) {
          const requested = body.items[index];
          const snapshot = snapshots[index];

          if (!snapshot.exists) {
            throw new CheckoutError(
              `Product ${requested.productId} was not found.`,
              400
            );
          }

          const product = snapshot.data();

          if (!product || product.isActive !== true) {
            throw new CheckoutError(
              `Product ${requested.productId} is unavailable.`,
              400
            );
          }

          if (
            !validMoney(product.sellingPrice) ||
            typeof product.stockQty !== "number" ||
            !Number.isFinite(product.stockQty) ||
            product.stockQty < 0 ||
            !["pcs", "kg", "g", "L"].includes(product.unit) ||
            !validQuantity(
              requested.quantity,
              product.unit
            )
          ) {
            throw new CheckoutError(
              `Invalid product data or quantity for ${requested.productId}.`,
              400
            );
          }

          if (
            requested.quantity >
            product.stockQty + 1e-9
          ) {
            throw new CheckoutError(
              `Insufficient stock for ${product.name}. Available: ${product.stockQty}.`,
              409
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

        // STEP 7: Calculate discount
        const discountCents =
          body.discountType === "percent"
            ? Math.round(
                (subtotalCents * body.discountValue) /
                  100
              )
            : moneyToCents(body.discountValue);

        if (discountCents > subtotalCents) {
          throw new CheckoutError(
            "Discount exceeds subtotal.",
            400
          );
        }

        const totalCents =
          subtotalCents - discountCents;

        const cashCents = moneyToCents(
          body.cashReceived
        );

        if (cashCents < totalCents) {
          throw new CheckoutError(
            "Cash received is insufficient.",
            400
          );
        }

        // STEP 8: Update stock quantities
        for (
          let index = 0;
          index < body.items.length;
          index++
        ) {
          const currentStock = snapshots[index]
            .data()!.stockQty as number;

          const quantity = body.items[index].quantity;

          const newStock =
            Math.round(
              (currentStock - quantity) * 1000
            ) / 1000;

          transaction.update(productRefs[index], {
            stockQty: newStock,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        // STEP 9: Save completed sale
        const invoiceNumber =
          `INV-${saleRef.id.toUpperCase()}`;

        transaction.create(saleRef, {
          invoiceNumber,
          cashierId: cashier.uid,
          cashierEmail: cashier.email,
          requestId: body.requestId,
          requestHash: payloadHash,
          items: saleItems,
          subtotal: subtotalCents / 100,
          discountType: body.discountType,
          discountValue: body.discountValue,
          discount: discountCents / 100,
          total: totalCents / 100,
          cashReceived: cashCents / 100,
          change:
            (cashCents - totalCents) / 100,
          paymentMethod: "cash",
          createdAt: FieldValue.serverTimestamp(),
        });

        return {
          saleId: saleRef.id,
          alreadyProcessed: false,
        };
      }
    );

    return NextResponse.json(result, {
      status: result.alreadyProcessed ? 200 : 201,
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("CHECKOUT SERVER ERROR:", error);

    return NextResponse.json(
      {
        error:
          "Checkout failed. Retry the same request ID before starting another sale.",
        details:
          process.env.NODE_ENV === "development" &&
          error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}
