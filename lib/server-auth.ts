
import "server-only";

import { getAdminAuth } from "@/lib/firebase-admin";

export async function verifyManager(
  authorization: string | null
) {
  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("UNAUTHENTICATED");
  }

  const token = authorization.slice(7);
  const user = await getAdminAuth().verifyIdToken(token, true);

  if (user.manager !== true) {
    throw new Error("FORBIDDEN");
  }

  return user;
}

export function authErrorResponse(error: unknown) {
  const message =
    error instanceof Error ? error.message : "";

  if (message === "UNAUTHENTICATED") {
    return Response.json(
      { error: "Please sign in." },
      { status: 401 }
    );
  }

  if (message === "FORBIDDEN") {
    return Response.json(
      { error: "Manager access required." },
      { status: 403 }
    );
  }

  console.error("Server request failed:", error);

  return Response.json(
    { error: "Server request failed." },
    { status: 500 }
  );
}
