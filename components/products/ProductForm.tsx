
"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  ImageIcon,
  LoaderCircle,
  X,
} from "lucide-react";

import ProductImage from "@/components/products/ProductImage";

import {
  PRODUCT_UNITS,
  type Product,
  type ProductInput,
  type ProductUnit,
} from "@/types/products";

import {
  addProduct,
  updateProduct,
} from "@/lib/products";

interface Props {
  product: Product | null;
  onClose: () => void;
}

// ==========================================
// DEFAULT FORM VALUES
// ==========================================

const emptyForm: ProductInput = {
  sku: "",
  name: "",
  category: "",
  unit: "pcs",
  costPrice: 0,
  sellingPrice: 0,
  stockQty: 0,
  imageUrl: "",
};

// ==========================================
// VALIDATE LOCAL IMAGE PATH
// ==========================================

const IMAGE_PATH_REGEX =
  /^\/products\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/;

function isValidImagePath(path: string): boolean {
  return path === "" || IMAGE_PATH_REGEX.test(path);
}

// ==========================================
// PRODUCT FORM
// ==========================================

export default function ProductForm({
  product,
  onClose,
}: Props) {
  const [form, setForm] =
    useState<ProductInput>(emptyForm);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ========================================
  // LOAD PRODUCT DATA FOR EDITING
  // ========================================

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
        imageUrl: product.imageUrl ?? "",
      });
    } else {
      setForm({ ...emptyForm });
    }

    setError("");
  }, [product]);

  // ========================================
  // UPDATE FORM FIELDS
  // ========================================

  function updateField<K extends keyof ProductInput>(
    field: K,
    value: ProductInput[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  // ========================================
  // HANDLE NUMBER INPUTS
  // ========================================

  function updateNumberField(
    field: "costPrice" | "sellingPrice" | "stockQty",
    value: string
  ) {
    updateField(
      field,
      value === "" ? 0 : Number(value)
    );
  }

  // ========================================
  // SUBMIT PRODUCT
  // ========================================

  async function handleSubmit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (saving) return;

    setError("");

    const imageUrl = (form.imageUrl ?? "").trim();

    if (!isValidImagePath(imageUrl)) {
      setError(
        "Invalid image path. Use a local path such as /products/red-dhal.jpg."
      );
      return;
    }

    const payload: ProductInput = {
      ...form,
      sku: form.sku.trim().toUpperCase(),
      name: form.name.trim(),
      category: form.category.trim(),
      imageUrl,
    };

    setSaving(true);

    try {
      if (product) {
        await updateProduct(product.id, payload);
      } else {
        await addProduct(payload);
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
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500";

  const imageUrl = (form.imageUrl ?? "").trim();

  const imagePathValid = isValidImagePath(imageUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
        className="my-auto max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        {/* HEADER */}

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
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={22} />
          </button>
        </div>

        {/* ERROR */}

        {error && (
          <p
            role="alert"
            className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div className="grid gap-5 sm:grid-cols-2">

            {/* SKU */}

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
                disabled={Boolean(product) || saving}
                onChange={(e) =>
                  updateField(
                    "sku",
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="ANC400"
                maxLength={40}
                pattern="[A-Za-z0-9_-]{2,40}"
                className={inputClass}
              />
            </div>

            {/* PRODUCT NAME */}

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
                disabled={saving}
                onChange={(e) =>
                  updateField("name", e.target.value)
                }
                placeholder="Anchor Milk Powder 400g"
                className={inputClass}
              />
            </div>

            {/* CATEGORY */}

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
                disabled={saving}
                onChange={(e) =>
                  updateField("category", e.target.value)
                }
                placeholder="Dairy"
                className={inputClass}
              />
            </div>

            {/* UNIT */}

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
                disabled={saving}
                onChange={(e) =>
                  updateField(
                    "unit",
                    e.target.value as ProductUnit
                  )
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

            {/* COST PRICE */}

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
                disabled={saving}
                value={form.costPrice}
                onChange={(e) =>
                  updateNumberField(
                    "costPrice",
                    e.target.value
                  )
                }
                className={inputClass}
              />
            </div>

            {/* SELLING PRICE */}

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
                disabled={saving}
                value={form.sellingPrice}
                onChange={(e) =>
                  updateNumberField(
                    "sellingPrice",
                    e.target.value
                  )
                }
                className={inputClass}
              />
            </div>

            {/* STOCK QUANTITY */}

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
                disabled={saving}
                value={form.stockQty}
                onChange={(e) =>
                  updateNumberField(
                    "stockQty",
                    e.target.value
                  )
                }
                className={inputClass}
              />
            </div>

            {/* ==================================
                PRODUCT IMAGE
            ================================== */}

            <div className="sm:col-span-2">
              <label
                htmlFor="imageUrl"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Product Image Path (Optional)
              </label>

              <div className="flex items-center gap-3">
                <ImageIcon
                  size={20}
                  className="shrink-0 text-blue-600"
                />

                <input
                  id="imageUrl"
                  type="text"
                  value={form.imageUrl ?? ""}
                  disabled={saving}
                  onChange={(e) =>
                    updateField(
                      "imageUrl",
                      e.target.value
                    )
                  }
                  placeholder="/products/red-dhal.jpg"
                  maxLength={200}
                  className={inputClass}
                />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Save the image inside
                {" "}
                <code className="rounded bg-slate-100 px-1 py-0.5">
                  public/products/
                </code>
                {" "}
                and enter its path, for example
                {" "}
                <code className="rounded bg-slate-100 px-1 py-0.5">
                  /products/red-dhal.jpg
                </code>.
              </p>

              {!imagePathValid && (
                <p
                  role="alert"
                  className="mt-2 text-sm text-red-600"
                >
                  Only JPG, JPEG, PNG or WebP images
                  inside /products/ are supported.
                </p>
              )}

              {/* IMAGE PREVIEW */}

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-medium text-slate-700">
                  Image Preview
                </p>

                <div className="flex items-center gap-4">
                  <ProductImage
                    src={
                      imagePathValid && imageUrl
                        ? imageUrl
                        : undefined
                    }
                    alt={form.name || "Product image"}
                  />

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700">
                      {form.name || "New Product"}
                    </p>

                    <p className="mt-1 break-all text-xs text-slate-500">
                      {imageUrl ||
                        "No image selected. Default icon will be displayed."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER */}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-5 py-3 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || !imagePathValid}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving && (
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />
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
