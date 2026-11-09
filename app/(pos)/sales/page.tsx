
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  LoaderCircle,
  ReceiptText,
  Search,
  ShoppingBag,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Receipt from "@/components/sales/Receipt";

import { subscribeToSales, getSale } from "@/lib/sales";
import { formatLKR } from "@/lib/currency";
import type { Sale } from "@/types/sale";

export default function SalesPage() {
  const searchParams = useSearchParams();
  const receiptId = searchParams.get("receipt");

  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToSales(
      (data) => {
        setSales(data);
        setLoading(false);
        setError("");
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!receiptId) return;

    let cancelled = false;

    getSale(receiptId)
      .then((sale) => {
        if (!cancelled && sale) {
          setSelectedSale(sale);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load receipt."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [receiptId]);

  const filteredSales = useMemo(() => {
    const term = search.trim().toLowerCase();

    return sales.filter(
      (sale) =>
        sale.invoiceNumber.toLowerCase().includes(term) ||
        sale.cashierEmail.toLowerCase().includes(term)
    );
  }, [sales, search]);

  const totalRevenue = sales.reduce(
    (sum, sale) => sum + sale.total,
    0
  );

  return (
    <div className="flex min-h-screen bg-[#f5f7fb]">
      <Sidebar />

      <main className="min-w-0 flex-1 p-4 sm:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Sales History
          </h1>

          <p className="mt-2 text-slate-500">
            View completed transactions and print receipts
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl bg-red-50 p-4 text-red-700"
          >
            {error}
          </div>
        )}

        <div className="mb-8 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-xl bg-blue-100 p-3 text-blue-600">
              <ShoppingBag size={23} />
            </div>

            <p className="text-sm text-slate-500">
              Recent Sales
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {loading ? "—" : sales.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-xl bg-green-100 p-3 text-green-600">
              <ReceiptText size={23} />
            </div>

            <p className="text-sm text-slate-500">
              Recent Sales Revenue
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {loading ? "—" : formatLKR(totalRevenue)}
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-6">
            <h2 className="text-xl font-bold text-slate-900">
              Transactions
            </h2>

            <div className="relative w-full max-w-sm">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice or cashier..."
                aria-label="Search sales"
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-slate-900 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center gap-3 p-16 text-slate-500">
              <LoaderCircle className="animate-spin" />
              Loading sales...
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="p-16 text-center text-slate-500">
              No sales found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Invoice</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Cashier</th>
                    <th className="px-6 py-4">Items</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Receipt</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {sale.invoiceNumber}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {sale.createdAt
                          ? sale.createdAt
                              .toDate()
                              .toLocaleString("en-LK", {
                                dateStyle: "medium",
                                timeStyle: "short",
                                timeZone: "Asia/Colombo",
                              })
                          : "Pending"}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {sale.cashierEmail}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {sale.items.length}
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {formatLKR(sale.total)}
                      </td>

                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedSale(sale)}
                          className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-4 text-xs text-slate-500">
          Showing up to 100 most recent sales. Revenue above
          covers only these displayed transactions.
        </p>
      </main>

      {selectedSale && (
        <Receipt
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
        />
      )}
    </div>
  );
}
