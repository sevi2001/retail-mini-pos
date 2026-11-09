
import {
  collection,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

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
// LOCAL PRODUCT IMAGE VALIDATION
// ==========================================

const IMAGE_PATH_REGEX =
  /^\/products\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/;

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
    Math.abs(
      value * factor - Math.round(value * factor)
    ) < 1e-7
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

  // Normalize optional image path.
  const imageUrl = (input.imageUrl ?? "").trim();

  // SKU validation
  if (!/^[A-Z0-9_-]{2,40}$/.test(sku)) {
    throw new Error(
      "SKU must contain 2–40 letters, numbers, hyphens or underscores."
    );
  }

  // Product name validation
  if (!name || name.length > 120) {
    throw new Error(
      "Product name must contain 1–120 characters."
    );
  }

  // Category validation
  if (!category || category.length > 60) {
    throw new Error(
      "Category must contain 1–60 characters."
    );
  }

  // Unit validation
  if (!PRODUCT_UNITS.includes(input.unit)) {
    throw new Error("Invalid product unit.");
  }

  // Price validation
  if (
    !Number.isFinite(input.costPrice) ||
    !Number.isFinite(input.sellingPrice) ||
    input.costPrice < 0 ||
    input.sellingPrice < 0 ||
    input.costPrice > 100000000 ||
    input.sellingPrice > 100000000
  ) {
    throw new Error(
      "Prices must be valid non-negative numbers."
    );
  }

  // Price decimal validation
  if (
    !hasValidDecimals(input.costPrice, 2) ||
    !hasValidDecimals(input.sellingPrice, 2)
  ) {
    throw new Error(
      "Prices can have a maximum of two decimal places."
    );
  }

  // Stock validation
  if (
    !Number.isFinite(input.stockQty) ||
    input.stockQty < 0 ||
    input.stockQty > 1000000
  ) {
    throw new Error(
      "Stock must be between 0 and 1,000,000."
    );
  }

  // Pieces must be whole numbers.
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

  // ========================================
  // IMAGE PATH VALIDATION
  // ========================================

  if (
    imageUrl !== "" &&
    !IMAGE_PATH_REGEX.test(imageUrl)
  ) {
    throw new Error(
      "Invalid product image path. Use /products/filename.jpg, .jpeg, .png or .webp."
    );
  }

  // ========================================
  // RETURN VALIDATED PRODUCT
  // ========================================

  return {
    sku,
    name,
    category,
    unit: input.unit,
    costPrice: input.costPrice,
    sellingPrice: input.sellingPrice,
    stockQty: input.stockQty,

    // Important: send image path to Firebase API.
    imageUrl,
  };
}

// ==========================================
// SECURE PRODUCT API REQUEST
// ==========================================

async function productRequest(
  method: "POST" | "PUT" | "DELETE",
  body: unknown
): Promise<void> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "Please log in before managing products."
    );
  }

  const token = await user.getIdToken();

  let response: Response;

  try {
    response = await fetch("/api/products", {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Network error. Please check your connection and try again."
    );
  }

  let result: {
    success?: boolean;
    error?: string;
  };

  try {
    result = await response.json();
  } catch {
    throw new Error(
      `Server returned an invalid response (${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(
      result.error ?? "Product operation failed."
    );
  }
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

            // Important: include the saved image path.
            imageUrl:
              typeof data.imageUrl === "string"
                ? data.imageUrl
                : "",
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
// ADD PRODUCT — SECURE API
// ==========================================

export async function addProduct(
  input: ProductInput
): Promise<void> {
  const product = validateProduct(input);

  await productRequest("POST", product);
}

// ==========================================
// UPDATE PRODUCT — SECURE API
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

  await productRequest("PUT", {
    id,
    product,
  });
}

// ==========================================
// ARCHIVE PRODUCT — SOFT DELETE
// ==========================================

export async function archiveProduct(
  id: string
): Promise<void> {
  if (!/^[A-Z0-9_-]{2,40}$/.test(id)) {
    throw new Error("Invalid product ID.");
  }

  await productRequest("DELETE", { id });
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
    imageUrl: "/products/anchor-milk.jpg",
  },
  {
    sku: "RICE001",
    name: "Keeri Samba Rice",
    category: "Rice",
    unit: "kg",
    costPrice: 280,
    sellingPrice: 320,
    stockQty: 100,
    imageUrl: "/products/keeri-samba-rice.jpg",
  },
  {
    sku: "SUGAR001",
    name: "White Sugar",
    category: "Grocery",
    unit: "kg",
    costPrice: 220,
    sellingPrice: 250,
    stockQty: 75,
    imageUrl: "/products/white-sugar.jpg",
  },
  {
    sku: "OIL001",
    name: "Coconut Oil",
    category: "Cooking Essentials",
    unit: "L",
    costPrice: 650,
    sellingPrice: 750,
    stockQty: 40,
    imageUrl: "/products/coconut-oil.jpg",
  },
  {
    sku: "BIS001",
    name: "Munchee Cream Cracker",
    category: "Biscuits",
    unit: "pcs",
    costPrice: 160,
    sellingPrice: 200,
    stockQty: 45,
    imageUrl: "/products/munchee-cream-cracker.jpg",
  },
  {
    sku: "TEA001",
    name: "Ceylon Tea",
    category: "Beverages",
    unit: "g",
    costPrice: 2.5,
    sellingPrice: 3,
    stockQty: 5000,
    imageUrl: "/products/ceylon-tea.jpg",
  },
  {
    sku: "SOAP001",
    name: "Sunlight Soap",
    category: "Household",
    unit: "pcs",
    costPrice: 115,
    sellingPrice: 140,
    stockQty: 60,
    imageUrl: "/products/sunlight-soap.jpg",
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
        (
          error.message.includes(
            "This SKU already exists"
          ) ||
          error.message.includes(
            "SKU_ALREADY_EXISTS"
          )
        )
      ) {
        // Skip existing products.
        // Never overwrite existing inventory.
        continue;
      }

      throw error;
    }
  }

  return added;
}
