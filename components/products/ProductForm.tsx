
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, X } from "lucide-react";

import {
  PRODUCT_UNITS,
  type Product,
  type ProductInput,
  type ProductUnit,
} from "@/types/products";

import { addProduct, updateProduct } from "@/lib/products";

interface Props {
  product: Product | null;
  onClose: () => void;
}

const emptyForm: ProductInput = {
  sku: "",
  name: "",
  category: "",
  unit: "pcs",
  costPrice: 0,
  sellingPrice: 0,
  stockQty: 0,
};

export default function ProductForm({
  product,
  onClose,
}: Props) {
  const [form, setForm] = useState<ProductInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (product) {
      setForm({
        sku: product.sku,
        name: product.name,
        category: product.category,
        unit: product.unit,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        stockQty: product.stockQty,
      });
    } else {
      setForm(emptyForm);
    }
  }, [product]);

  function updateField<K extends keyof ProductInput>(
    field: K,
    value: ProductInput[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (product) {
        await updateProduct(product.id, form);
      } else {
        await addProduct(form);
      }

      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save product."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
        className="my-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2
            id="product-form-title"
            className="text-2xl font-bold text-slate-900"
          >
            {product ? "Edit Product" : "Add New Product"}
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close product form"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={22} />
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="sku"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                SKU / Barcode
              </label>

              <input
                id="sku"
                required
                value={form.sku}
                disabled={Boolean(product)}
                onChange={(e) =>
                  updateField("sku", e.target.value.toUpperCase())
                }
                placeholder="ANC400"
                maxLength={40}
                pattern="[A-Za-z0-9_-]{2,40}"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Product Name
              </label>

              <input
                id="name"
                required
                maxLength={120}
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Anchor Milk Powder 400g"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="category"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Category
              </label>

              <input
                id="category"
                required
                maxLength={60}
                value={form.category}
                onChange={(e) =>
                  updateField("category", e.target.value)
                }
                placeholder="Dairy"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="unit"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Unit Type
              </label>

              <select
                id="unit"
                value={form.unit}
                onChange={(e) =>
                  updateField("unit", e.target.value as ProductUnit)
                }
                className={inputClass}
              >
                {PRODUCT_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="costPrice"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Cost Price (Rs.)
              </label>

              <input
                id="costPrice"
                type="number"
                min="0"
                step="0.01"
                required
                value={form.costPrice}
                onChange={(e) =>
                  updateField("costPrice", e.target.valueAsNumber)
                }
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="sellingPrice"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Selling Price (Rs.)
              </label>

              <input
                id="sellingPrice"
                type="number"
                min="0"
                step="0.01"
                required
                value={form.sellingPrice}
                onChange={(e) =>
                  updateField("sellingPrice", e.target.valueAsNumber)
                }
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="stockQty"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Available Stock Quantity ({form.unit})
              </label>

              <input
                id="stockQty"
                type="number"
                min="0"
                step={form.unit === "pcs" ? "1" : "0.001"}
                required
                value={form.stockQty}
                onChange={(e) =>
                  updateField("stockQty", e.target.valueAsNumber)
                }
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-5 py-3 font-medium text-slate-700"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving && (
                <LoaderCircle size={18} className="animate-spin" />
              )}

              {saving
                ? "Saving..."
                : product
                ? "Update Product"
                : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
