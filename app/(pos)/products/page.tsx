
"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Archive,
  Boxes,
  LoaderCircle,
  Package,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  TriangleAlert,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import ProductForm from "@/components/products/ProductForm";

import {
  archiveProduct,
  seedSampleProducts,
  subscribeToProducts,
} from "@/lib/products";

import { formatLKR } from "@/lib/currency";
import type { Product } from "@/types/products";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToProducts(
      (data) => {
        setProducts(data);
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

  const activeProducts = useMemo(
    () => products.filter((p) => p.isActive),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return activeProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term)
    );
  }, [activeProducts, search]);

  const lowStock = activeProducts.filter(
    (p) => p.stockQty > 0 && p.stockQty <= 10
  ).length;

  const outOfStock = activeProducts.filter(
    (p) => p.stockQty === 0
  ).length;

  const archivedCount = products.filter(
    (p) => !p.isActive
  ).length;

  function openAddForm() {
    setEditingProduct(null);
    setShowForm(true);
    setMessage("");
  }

  function openEditForm(product: Product) {
    setEditingProduct(product);
    setShowForm(true);
    setMessage("");
  }

  async function handleArchive(product: Product) {
    const confirmed = window.confirm(
      `Archive "${product.name}"?\n\nThe product will be hidden from the active inventory but its data will be preserved.`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await archiveProduct(product.id);
      setMessage(`${product.name} archived successfully.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to archive product."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSeed() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const count = await seedSampleProducts();

      setMessage(
        count > 0
          ? `${count} sample grocery products added successfully.`
          : "All sample products already exist."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to add sample products."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f5f7fb]">
      <Sidebar />

      <main className="min-w-0 flex-1 p-4 sm:p-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Product Management
            </h1>

            <p className="mt-2 text-slate-500">
              Manage your grocery inventory and stock
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSeed}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60"
            >
              {saving ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <PackagePlus size={18} />
              )}
              Seed Sample Items
            </button>

            <button
              onClick={openAddForm}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={20} />
              Add Product
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {message}
          </div>
        )}

        <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "Active Products",
              value: activeProducts.length,
              icon: Package,
              color: "bg-blue-100 text-blue-600",
            },
            {
              title: "Low Stock",
              value: lowStock,
              icon: TriangleAlert,
              color: "bg-amber-100 text-amber-600",
            },
            {
              title: "Out of Stock",
              value: outOfStock,
              icon: Boxes,
              color: "bg-red-100 text-red-600",
            },
            {
              title: "Archived Products",
              value: archivedCount,
              icon: Archive,
              color: "bg-slate-100 text-slate-600",
            },
          ].map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="rounded-2xl bg-white p-5 shadow-sm"
              >
                <div className={`mb-4 inline-flex rounded-xl p-3 ${card.color}`}>
                  <Icon size={22} />
                </div>

                <p className="text-sm text-slate-500">
                  {card.title}
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {loading ? "—" : card.value}
                </p>
              </div>
            );
          })}
        </div>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Product Inventory
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {filteredProducts.length} products displayed
              </p>
            </div>

            <div className="relative w-full max-w-sm">
              <Search
                size={19}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, SKU or category..."
                aria-label="Search products"
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 p-16 text-slate-500">
              <LoaderCircle
                size={24}
                className="animate-spin text-blue-600"
              />
              Loading products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-16 text-center">
              <Package
                size={48}
                className="mx-auto text-slate-300"
              />

              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                No products found
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {search
                  ? "Try another search term."
                  : "Add a product or seed sample grocery items."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">SKU</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Unit</th>
                    <th className="px-6 py-4">Cost</th>
                    <th className="px-6 py-4">Selling Price</th>
                    <th className="px-6 py-4">Stock</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((product) => {
                    const status =
                      product.stockQty === 0
                        ? "Out of Stock"
                        : product.stockQty <= 10
                        ? "Low Stock"
                        : "In Stock";

                    const statusClass =
                      product.stockQty === 0
                        ? "bg-red-100 text-red-700"
                        : product.stockQty <= 10
                        ? "bg-amber-100 text-amber-700"
                        : "bg-green-100 text-green-700";

                    return (
                      <tr
                        key={product.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {product.name}
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-500">
                          {product.sku}
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600">
                          {product.category}
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600">
                          {product.unit}
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatLKR(product.costPrice)}
                        </td>

                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {formatLKR(product.sellingPrice)}
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-700">
                          {product.stockQty}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
                          >
                            {status}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditForm(product)}
                              title="Edit product"
                              aria-label={`Edit ${product.name}`}
                              className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                            >
                              <Pencil size={18} />
                            </button>

                            <button
                              onClick={() => handleArchive(product)}
                              disabled={saving}
                              title="Archive product"
                              aria-label={`Archive ${product.name}`}
                              className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              <Archive size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {showForm && (
        <ProductForm
          product={editingProduct}
          onClose={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}
