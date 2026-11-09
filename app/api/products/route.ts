
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";

import {
  verifyManager,
  authErrorResponse,
} from "@/lib/server-auth";

export const runtime = "nodejs";

// ==========================================
// PRODUCT TYPES
// ==========================================

const units = ["pcs", "kg", "g", "L"] as const;

type ProductData = {
  sku: string;
  name: string;
  category: string;
  unit: (typeof units)[number];
  costPrice: number;
  sellingPrice: number;
  stockQty: number;
  imageUrl?: string;
};

// ==========================================
// IMAGE PATH VALIDATION
// ==========================================

// Only allow local images inside public/products/.
//
// Example:
// /products/red-dhal.jpg
//
// Do not accept external URLs or directory traversal.

const IMAGE_PATH_REGEX =
  /^\/products\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/;

function isValidImagePath(value: unknown): boolean {
  return (
    value === undefined ||
    value === "" ||
    (typeof value === "string" &&
      IMAGE_PATH_REGEX.test(value))
  );
}

// ==========================================
// PRODUCT VALIDATION
// ==========================================

function isValidProduct(
  value: unknown
): value is ProductData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const p = value as Record<string, unknown>;

  const validPrice = (n: unknown) =>
    typeof n === "number" &&
    Number.isFinite(n) &&
    n >= 0 &&
    n <= 100000000 &&
    Math.abs(n * 100 - Math.round(n * 100)) < 1e-7;

  return (
    typeof p.sku === "string" &&
    /^[A-Z0-9_-]{2,40}$/.test(p.sku) &&

    typeof p.name === "string" &&
    p.name.trim().length > 0 &&
    p.name.trim().length <= 120 &&

    typeof p.category === "string" &&
    p.category.trim().length > 0 &&
    p.category.trim().length <= 60 &&

    units.some((unit) => unit === p.unit) &&

    validPrice(p.costPrice) &&
    validPrice(p.sellingPrice) &&

    typeof p.stockQty === "number" &&
    Number.isFinite(p.stockQty) &&
    p.stockQty >= 0 &&
    p.stockQty <= 1000000 &&

    Math.abs(
      p.stockQty * 1000 - Math.round(p.stockQty * 1000)
    ) < 1e-7 &&

    (p.unit !== "pcs" ||
      Number.isInteger(p.stockQty)) &&

    isValidImagePath(p.imageUrl)
  );
}

// ==========================================
// ERROR RESPONSE
// ==========================================

function invalidProductResponse() {
  return NextResponse.json(
    {
      error: "Invalid product information.",
    },
    {
      status: 400,
    }
  );
}

// ==========================================
// PREPARE PRODUCT DATA
// ==========================================

// Save only approved product fields.
// Do not spread arbitrary request properties
// into Firestore.

function prepareProductData(product: ProductData) {
  return {
    sku: product.sku,
    name: product.name.trim(),
    category: product.category.trim(),
    unit: product.unit,
    costPrice: product.costPrice,
    sellingPrice: product.sellingPrice,
    stockQty: product.stockQty,
    imageUrl: product.imageUrl ?? "",
  };
}

// ==========================================
// POST — ADD PRODUCT
// ==========================================

export async function POST(request: NextRequest) {
  try {
    // Verify manager permission.
    await verifyManager(
      request.headers.get("authorization")
    );

    const input: unknown = await request.json();

    if (!isValidProduct(input)) {
      return invalidProductResponse();
    }

    const db = getAdminDb();

    // SKU is the Firestore document ID.
    const reference = db
      .collection("products")
      .doc(input.sku);

    const productData = prepareProductData(input);

    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(reference);

      if (existing.exists) {
        throw new Error("SKU_ALREADY_EXISTS");
      }

      transaction.create(reference, {
        ...productData,
        isActive: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "Product added successfully.",
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "SKU_ALREADY_EXISTS"
    ) {
      return NextResponse.json(
        {
          error: "This SKU already exists.",
        },
        {
          status: 409,
        }
      );
    }

    return authErrorResponse(error);
  }
}

// ==========================================
// PUT — UPDATE PRODUCT
// ==========================================

export async function PUT(request: NextRequest) {
  try {
    // Verify manager permission.
    await verifyManager(
      request.headers.get("authorization")
    );

    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return invalidProductResponse();
    }

    const { id, product } = body as {
      id?: unknown;
      product?: unknown;
    };

    if (
      typeof id !== "string" ||
      !isValidProduct(product) ||
      id !== product.sku
    ) {
      return invalidProductResponse();
    }

    const db = getAdminDb();

    const reference = db
      .collection("products")
      .doc(id);

    const productData = prepareProductData(product);

    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);

      if (
        !snapshot.exists ||
        snapshot.data()?.isActive !== true
      ) {
        throw new Error("PRODUCT_UNAVAILABLE");
      }

      transaction.update(reference, {
        name: productData.name,
        category: productData.category,
        unit: productData.unit,
        costPrice: productData.costPrice,
        sellingPrice: productData.sellingPrice,
        stockQty: productData.stockQty,
        imageUrl: productData.imageUrl,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({
      success: true,
      message: "Product updated successfully.",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "PRODUCT_UNAVAILABLE"
    ) {
      return NextResponse.json(
        {
          error: "Product is unavailable.",
        },
        {
          status: 409,
        }
      );
    }

    return authErrorResponse(error);
  }
}

// ==========================================
// DELETE — ARCHIVE PRODUCT
// ==========================================

export async function DELETE(request: NextRequest) {
  try {
    // Verify manager permission.
    await verifyManager(
      request.headers.get("authorization")
    );

    const body: unknown = await request.json();

    const id =
      body && typeof body === "object"
        ? (body as { id?: unknown }).id
        : null;

    if (
      typeof id !== "string" ||
      !/^[A-Z0-9_-]{2,40}$/.test(id)
    ) {
      return NextResponse.json(
        {
          error: "Invalid product ID.",
        },
        {
          status: 400,
        }
      );
    }

    const db = getAdminDb();

    const reference = db
      .collection("products")
      .doc(id);

    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);

      if (
        !snapshot.exists ||
        snapshot.data()?.isActive !== true
      ) {
        throw new Error("PRODUCT_UNAVAILABLE");
      }

      // Soft delete — retain historical sales.
      transaction.update(reference, {
        isActive: false,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({
      success: true,
      message: "Product archived successfully.",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "PRODUCT_UNAVAILABLE"
    ) {
      return NextResponse.json(
        {
          error: "Product is unavailable.",
        },
        {
          status: 409,
        }
      );
    }

    return authErrorResponse(error);
  }
}
