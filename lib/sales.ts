
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

export async function completeSale(
  checkout: CheckoutRequest
): Promise<CheckoutResult> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please log in before completing a sale.");
  }

  const token = await user.getIdToken();

  let response: Response;

  try {
    response = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(checkout),
    });
  } catch {
    throw new Error(
      "Network error. Check Sales History before retrying payment."
    );
  }

  const data = (await response.json()) as {
    saleId?: string;
    error?: string;
  };

  if (!response.ok || !data.saleId) {
    throw new Error(data.error ?? "Unable to complete sale.");
  }

  return { saleId: data.saleId };
}

export async function getSale(id: string): Promise<Sale | null> {
  const snapshot = await getDoc(doc(db, "sales", id));

  if (!snapshot.exists()) return null;

  return {
    ...snapshot.data(),
    id: snapshot.id,
  } as Sale;
}

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
      onData(
        snapshot.docs.map(
          (document) =>
            ({
              ...document.data(),
              id: document.id,
            }) as Sale
        )
      );
    },
    onError
  );
}
