
import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import {
  PRODUCT_UNITS,
  type Product,
  type ProductInput,
} from "@/types/products";

// ==========================================
// FIRESTORE COLLECTION
// ==========================================

const productsRef = collection(db, "products");

// ==========================================
// NORMALIZE SKU
// ==========================================

export function normalizeSKU(sku: string): string {
  return sku.trim().toUpperCase();
}

// ==========================================
// DECIMAL VALIDATION
// ==========================================

function hasValidDecimals(
  value: number,
  decimalPlaces: number
): boolean {
  if (!Number.isFinite(value)) {
    return false;
  }

  const factor = 10 ** decimalPlaces;

  return (
    Math.abs(value * factor - Math.round(value * factor)) <
    1e-7
  );
}

// ==========================================
// PRODUCT VALIDATION
// ==========================================

function validateProduct(
  input: ProductInput
): ProductInput {
  const sku = normalizeSKU(input.sku);
  const name = input.name.trim();
  const category = input.category.trim();

  // Validate SKU
  if (!/^[A-Z0-9_-]{2,40}$/.test(sku)) {
    throw new Error(
      "SKU must contain 2–40 letters, numbers, hyphens or underscores."
    );
  }

  // Validate product name
  if (!name || name.length > 120) {
    throw new Error(
      "Product name must contain 1–120 characters."
    );
  }

  // Validate category
  if (!category || category.length > 60) {
    throw new Error(
      "Category must contain 1–60 characters."
    );
  }

  // Validate unit
  if (!PRODUCT_UNITS.includes(input.unit)) {
    throw new Error("Invalid product unit.");
  }

  // Validate prices
  if (
    !Number.isFinite(input.costPrice) ||
    !Number.isFinite(input.sellingPrice) ||
    input.costPrice < 0 ||
    input.sellingPrice < 0
  ) {
    throw new Error(
      "Cost price and selling price must be valid non-negative numbers."
    );
  }

  // Validate price decimal places
  if (
    !hasValidDecimals(input.costPrice, 2) ||
    !hasValidDecimals(input.sellingPrice, 2)
  ) {
    throw new Error(
      "Prices can have a maximum of two decimal places."
    );
  }

  // Validate stock quantity
  if (
    !Number.isFinite(input.stockQty) ||
    input.stockQty < 0
  ) {
    throw new Error(
      "Stock quantity must be a valid non-negative number."
    );
  }

  // Pieces must be whole numbers
  if (
    input.unit === "pcs" &&
    !Number.isInteger(input.stockQty)
  ) {
    throw new Error(
      "Stock quantity for pieces must be a whole number."
    );
  }

  // Stock decimal validation
  if (!hasValidDecimals(input.stockQty, 3)) {
    throw new Error(
      "Stock quantity can have a maximum of three decimal places."
    );
  }

  return {
    sku,
    name,
    category,
    unit: input.unit,
    costPrice: input.costPrice,
    sellingPrice: input.sellingPrice,
    stockQty: input.stockQty,
  };
}

// ==========================================
// REAL-TIME PRODUCT SUBSCRIPTION
// ==========================================

export function subscribeToProducts(
  onData: (products: Product[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    productsRef,
    (snapshot) => {
      const products: Product[] = snapshot.docs
        .map((document) => {
          const data = document.data();

          return {
            id: document.id,
            sku: data.sku,
            name: data.name,
            category: data.category,
            unit: data.unit,
            costPrice: data.costPrice,
            sellingPrice: data.sellingPrice,
            stockQty: data.stockQty,
            isActive: data.isActive,
            updatedAt: data.updatedAt ?? null,
          } as Product;
        })
        .sort((a, b) =>
          a.name.localeCompare(b.name)
        );

      onData(products);
    },
    (error) => {
      console.error(
        "Error fetching products:",
        error
      );

      onError(error);
    }
  );
}

// ==========================================
// ADD PRODUCT
// ==========================================

export async function addProduct(
  input: ProductInput
): Promise<void> {
  const product = validateProduct(input);

  const productRef = doc(
    db,
    "products",
    product.sku
  );

  await runTransaction(db, async (transaction) => {
    const existingProduct =
      await transaction.get(productRef);

    if (existingProduct.exists()) {
      throw new Error(
        "This SKU already exists. Please use another SKU."
      );
    }

    transaction.set(productRef, {
      ...product,
      isActive: true,
      updatedAt: serverTimestamp(),
    });
  });
}

// ==========================================
// UPDATE PRODUCT
// ==========================================

export async function updateProduct(
  id: string,
  input: ProductInput
): Promise<void> {
  const product = validateProduct(input);

  if (id !== product.sku) {
    throw new Error(
      "SKU cannot be changed after product creation."
    );
  }

  const productRef = doc(
    db,
    "products",
    id
  );

  await runTransaction(db, async (transaction) => {
    const snapshot =
      await transaction.get(productRef);

    if (!snapshot.exists()) {
      throw new Error(
        "Product not found."
      );
    }

    if (snapshot.data().isActive !== true) {
      throw new Error(
        "Archived products cannot be edited."
      );
    }

    transaction.update(productRef, {
      ...product,
      updatedAt: serverTimestamp(),
    });
  });
}

// ==========================================
// ARCHIVE PRODUCT (SOFT DELETE)
// ==========================================

export async function archiveProduct(
  id: string
): Promise<void> {
  const productRef = doc(
    db,
    "products",
    id
  );

  await runTransaction(db, async (transaction) => {
    const snapshot =
      await transaction.get(productRef);

    if (!snapshot.exists()) {
      throw new Error(
        "Product not found."
      );
    }

    if (snapshot.data().isActive !== true) {
      throw new Error(
        "This product is already archived."
      );
    }

    transaction.update(productRef, {
      isActive: false,
      updatedAt: serverTimestamp(),
    });
  });
}

// ==========================================
// SAMPLE SRI LANKAN GROCERY PRODUCTS
// ==========================================

const sampleProducts: ProductInput[] = [
  {
    sku: "ANC400",
    name: "Anchor Milk Powder 400g",
    category: "Dairy",
    unit: "pcs",
    costPrice: 1050,
    sellingPrice: 1250,
    stockQty: 30,
  },
  {
    sku: "RICE001",
    name: "Keeri Samba Rice",
    category: "Rice",
    unit: "kg",
    costPrice: 280,
    sellingPrice: 320,
    stockQty: 100,
  },
  {
    sku: "SUGAR001",
    name: "White Sugar",
    category: "Grocery",
    unit: "kg",
    costPrice: 220,
    sellingPrice: 250,
    stockQty: 75,
  },
  {
    sku: "OIL001",
    name: "Coconut Oil",
    category: "Cooking Essentials",
    unit: "L",
    costPrice: 650,
    sellingPrice: 750,
    stockQty: 40,
  },
  {
    sku: "BIS001",
    name: "Munchee Cream Cracker",
    category: "Biscuits",
    unit: "pcs",
    costPrice: 160,
    sellingPrice: 200,
    stockQty: 45,
  },
  {
    sku: "TEA001",
    name: "Ceylon Tea",
    category: "Beverages",
    unit: "g",
    costPrice: 2.5,
    sellingPrice: 3,
    stockQty: 5000,
  },
  {
    sku: "SOAP001",
    name: "Sunlight Soap",
    category: "Household",
    unit: "pcs",
    costPrice: 115,
    sellingPrice: 140,
    stockQty: 60,
  },
];

// ==========================================
// SEED SAMPLE PRODUCTS
// ==========================================

export async function seedSampleProducts(): Promise<number> {
  let added = 0;

  for (const product of sampleProducts) {
    try {
      await addProduct(product);

      added++;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes(
          "SKU already exists"
        )
      ) {
        // Skip existing products.
        // Never overwrite inventory.
        continue;
      }

      throw error;
    }
  }

  return added;
}
