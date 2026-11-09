
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  type Unsubscribe,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

import type {
  CheckoutRequest,
  CheckoutResult,
  Sale,
} from "@/types/sale";

// ==========================================
// CREATE UNIQUE CHECKOUT REQUEST ID
// ==========================================

export function createCheckoutRequestId(): string {
  return crypto.randomUUID();
}

// ==========================================
// CHECKOUT REQUEST TYPE
// ==========================================

// This extends your existing CheckoutRequest type
// without changing the other checkout fields.
export type IdempotentCheckoutRequest =
  CheckoutRequest & {
    requestId: string;
  };

// ==========================================
// COMPLETE SALE
// ==========================================

export async function completeSale(
  checkout: IdempotentCheckoutRequest
): Promise<CheckoutResult> {
  // Check authentication
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "Please log in before completing a sale."
    );
  }

  // Validate request ID
  if (
    typeof checkout.requestId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(checkout.requestId)
  ) {
    throw new Error(
      "Invalid checkout request ID."
    );
  }

  // Get Firebase authentication token
  const token = await user.getIdToken();

  let response: Response;

  try {
    response = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },

      // Includes requestId and existing checkout fields
      body: JSON.stringify(checkout),
    });
  } catch {
    throw new Error(
      "Network error. Your sale may have been saved. Retry with the same checkout request ID."
    );
  }

  // ==========================================
  // HANDLE API RESPONSE
  // ==========================================

  let data: {
    saleId?: string;
    alreadyProcessed?: boolean;
    error?: string;
  };

  try {
    data = (await response.json()) as typeof data;
  } catch {
    throw new Error(
      "Unable to read the server response. Retry using the same checkout request ID."
    );
  }

  if (!response.ok || !data.saleId) {
    throw new Error(
      data.error ?? "Unable to complete sale."
    );
  }

  return {
    saleId: data.saleId,
  };
}

// ==========================================
// GET SALE BY ID
// ==========================================

export async function getSale(
  id: string
): Promise<Sale | null> {
  if (!id.trim()) {
    throw new Error("Sale ID is required.");
  }

  const snapshot = await getDoc(
    doc(db, "sales", id)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    ...snapshot.data(),
    id: snapshot.id,
  } as Sale;
}

// ==========================================
// REAL-TIME SALES SUBSCRIPTION
// ==========================================

export function subscribeToSales(
  onData: (sales: Sale[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const salesQuery = query(
    collection(db, "sales"),
    orderBy("createdAt", "desc"),
    limit(100)
  );

  return onSnapshot(
    salesQuery,
    (snapshot) => {
      const sales: Sale[] = snapshot.docs.map(
        (document) =>
          ({
            ...document.data(),
            id: document.id,
          }) as Sale
      );

      onData(sales);
    },
    (error) => {
      console.error(
        "Error fetching sales:",
        error
      );

      onError(error);
    }
  );
}
