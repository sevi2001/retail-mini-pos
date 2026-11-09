
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

import {
  ArrowRight,
  AlertTriangle,
  Boxes,
  CalendarDays,
  CircleAlert,
  CircleDollarSign,
  LoaderCircle,
  Package,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Receipt from "@/components/sales/Receipt";

import { subscribeToProducts } from "@/lib/products";
import { subscribeToSales } from "@/lib/sales";

import {
  calculateDashboardStats,
  formatLKRAmount,
  formatSaleDate,
} from "@/lib/dashboard";

import type { Product } from "@/types/products";
import type { Sale } from "@/types/sale";

export default function DashboardPage() {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();
  const isManager = role === "manager";
  const isCashier = role === "cashier";

  useEffect(() => {
    if (!authLoading && (!user || !role)) {
      router.replace("/login");
    }
  }, [authLoading, user, role, router]);

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const [productsLoading, setProductsLoading] =
    useState(true);
  const [salesLoading, setSalesLoading] = useState(true);

  const [productsError, setProductsError] = useState("");
  const [salesError, setSalesError] = useState("");

  const [selectedSale, setSelectedSale] =
    useState<Sale | null>(null);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isManager) return;
    const unsubscribe = subscribeToProducts(
      (data) => {
        setProducts(data);
        setProductsLoading(false);
        setProductsError("");
      },
      (error) => {
        setProductsError(error.message);
        setProductsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isManager]);

  useEffect(() => {
    if (!isManager) return;
    const unsubscribe = subscribeToSales(
      (data) => {
        setSales(data);
        setSalesLoading(false);
        setSalesError("");
      },
      (error) => {
        setSalesError(error.message);
        setSalesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isManager]);

  // Refresh the current date every minute.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  const stats = useMemo(
    () => calculateDashboardStats(products, sales, now),
    [products, sales, now]
  );

  const lowStockItems = useMemo(
    () =>
      products
        .filter(
          (product) =>
            product.isActive &&
            product.stockQty <= 10
        )
        .sort((a, b) => a.stockQty - b.stockQty)
        .slice(0, 6),
    [products]
  );

  const recentSales = useMemo(
    () => sales.slice(0, 5),
    [sales]
  );

  const loading = productsLoading || salesLoading;

  const statCards = [
    {
      title: "Active Products",
      value: productsLoading
        ? "—"
        : stats.totalProducts.toLocaleString("en-LK"),
      description: "Available inventory products",
      icon: Package,
      iconClass: "bg-blue-100 text-blue-600",
    },
    {
      title: "Today's Revenue",
      value: salesLoading
        ? "—"
        : formatLKRAmount(stats.todayRevenue),
      description: "From the latest 100 sales",
      icon: CircleDollarSign,
      iconClass: "bg-green-100 text-green-600",
    },
    {
      title: "Today's Transactions",
      value: salesLoading
        ? "—"
        : stats.todaySales.toLocaleString("en-LK"),
      description: "From the latest 100 sales",
      icon: ReceiptText,
      iconClass: "bg-purple-100 text-purple-600",
    },
    {
      title: "Low Stock",
      value: productsLoading
        ? "—"
        : stats.lowStockProducts.toLocaleString("en-LK"),
      description: "More than 0 and up to 10 units",
      icon: AlertTriangle,
      iconClass: "bg-amber-100 text-amber-600",
    },
  ];

  if (authLoading || !user || !role) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb]">
        <LoaderCircle className="animate-spin text-blue-600" size={36} />
      </main>
    );
  }

  if (isCashier) {
    return (
      <div className="flex min-h-screen bg-[#f5f7fb]">
        <Sidebar />
        <main className="min-w-0 flex-1 p-4 sm:p-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Cashier Dashboard
              </h1>
              <p className="mt-2 text-slate-500">
                Welcome! You can start a new sale below.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
              <CalendarDays size={18} />
              {new Intl.DateTimeFormat("en-LK", {
                timeZone: "Asia/Colombo",
                dateStyle: "medium",
              }).format(now)}
            </div>
          </div>
          <section className="max-w-2xl rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-5 inline-flex rounded-xl bg-blue-100 p-3 text-blue-600">
              <ShoppingCart size={28} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Ready for your next sale?
            </h2>
            <p className="mt-2 text-slate-500">
              Open checkout to add products, accept payment, and generate a receipt.
            </p>
            <Link
              href="/checkout"
              className="mt-6 inline-flex items-center gap-3 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Start New Sale <ArrowRight size={19} />
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f5f7fb]">
      <Sidebar />

      <main className="min-w-0 flex-1 p-4 sm:p-8">
        {/* HEADER */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Dashboard Overview
            </h1>

            <p className="mt-2 text-slate-500">
              Monitor your store's inventory and sales
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            <CalendarDays size={18} />

            {new Intl.DateTimeFormat("en-LK", {
              timeZone: "Asia/Colombo",
              dateStyle: "medium",
            }).format(now)}
          </div>
        </div>

        {/* ERRORS */}
        {productsError && (
          <div
            role="alert"
            className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            Product loading error: {productsError}
          </div>
        )}

        {salesError && (
          <div
            role="alert"
            className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            Sales loading error: {salesError}
          </div>
        )}

        {/* STATS */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <div
                  className={`mb-5 inline-flex rounded-xl p-3 ${card.iconClass}`}
                >
                  <Icon size={24} />
                </div>

                <p className="text-sm font-medium text-slate-500">
                  {card.title}
                </p>

                <p className="mt-2 break-words text-2xl font-bold text-slate-900">
                  {card.value}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* INVENTORY SUMMARY */}
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <Boxes className="text-blue-600" size={23} />
              <h2 className="font-semibold text-slate-900">
                Inventory Cost Value
              </h2>
            </div>

            <p className="text-2xl font-bold text-slate-900">
              {productsLoading
                ? "—"
                : formatLKRAmount(stats.inventoryValue)}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Current stock multiplied by cost price
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <CircleAlert
                className="text-red-600"
                size={23}
              />

              <h2 className="font-semibold text-slate-900">
                Out of Stock
              </h2>
            </div>

            <p className="text-2xl font-bold text-red-600">
              {productsLoading
                ? "—"
                : stats.outOfStockProducts}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Active products with zero stock
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <TrendingUp
                className="text-green-600"
                size={23}
              />

              <h2 className="font-semibold text-slate-900">
                Recent Sales Revenue
              </h2>
            </div>

            <p className="text-2xl font-bold text-slate-900">
              {salesLoading
                ? "—"
                : formatLKRAmount(
                    stats.totalRecentRevenue
                  )}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Revenue from the latest 100 transactions
            </p>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Quick Actions
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Link
              href="/checkout"
              className="flex items-center justify-between rounded-xl bg-blue-600 p-5 font-semibold text-white transition hover:bg-blue-700"
            >
              <span className="flex items-center gap-3">
                <ShoppingCart size={21} />
                New Sale
              </span>
              <ArrowRight size={19} />
            </Link>

            <Link
              href="/products"
              className="flex items-center justify-between rounded-xl border border-slate-200 p-5 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <span className="flex items-center gap-3">
                <Package size={21} />
                Manage Products
              </span>
              <ArrowRight size={19} />
            </Link>

            <Link
              href="/sales"
              className="flex items-center justify-between rounded-xl border border-slate-200 p-5 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <span className="flex items-center gap-3">
                <ReceiptText size={21} />
                Sales History
              </span>
              <ArrowRight size={19} />
            </Link>
          </div>
        </section>

        {/* TABLES */}
        <div className="mt-8 grid items-start gap-6 xl:grid-cols-2">
          {/* LOW STOCK */}
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Stock Alerts
              </h2>

              <Link
                href="/products"
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                View Products
              </Link>
            </div>

            {productsLoading ? (
              <div className="flex items-center justify-center gap-2 p-12 text-slate-500">
                <LoaderCircle
                  className="animate-spin"
                  size={20}
                />
                Loading stock...
              </div>
            ) : lowStockItems.length === 0 ? (
              <p className="p-10 text-center text-slate-500">
                No stock alerts. Your inventory looks good!
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {lowStockItems.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-3 px-6 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {product.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {product.sku}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        product.stockQty === 0
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {product.stockQty === 0
                        ? "Out of Stock"
                        : `${product.stockQty} ${product.unit} left`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* RECENT SALES */}
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Recent Sales
              </h2>

              <Link
                href="/sales"
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                View All
              </Link>
            </div>

            {salesLoading ? (
              <div className="flex items-center justify-center gap-2 p-12 text-slate-500">
                <LoaderCircle
                  className="animate-spin"
                  size={20}
                />
                Loading sales...
              </div>
            ) : recentSales.length === 0 ? (
              <p className="p-10 text-center text-slate-500">
                No completed sales yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between gap-3 px-6 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {sale.invoiceNumber}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatSaleDate(
                          sale.createdAt?.toDate()
                        )}
                      </p>

                      <p className="mt-1 text-sm font-bold text-green-700">
                        {formatLKRAmount(sale.total)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedSale(sale)}
                      className="shrink-0 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      Receipt
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          {loading
            ? "Synchronizing dashboard with Firestore..."
            : "Dashboard synchronized with Firestore."}
          {" "}Sales figures are based on the most recent
          100 transactions currently loaded.
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
