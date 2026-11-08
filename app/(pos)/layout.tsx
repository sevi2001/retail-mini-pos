
"use client";

import ProtectedRoute from "@/components/ProtectedRoute";

export default function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  );
}
