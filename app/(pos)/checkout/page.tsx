
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  LoaderCircle,
  PackageSearch,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import CartItem from "@/components/checkout/CartItem";

import { subscribeToProducts } from "@/lib/products";
import { formatLKR } from "@/lib/currency";

import {
  calculateBill,
  roundQuantity,
  type DiscountType,
} from "@/lib/checkout";

import {
  productToCartItem,
  type CartItem as CartItemType,
} from "@/types/checkout";

import type { Product } from "@/types/products";

export default function CheckoutPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItemType[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [discountType, setDiscountType] =
    useState<DiscountType>("amount");
  const [discountValue, setDiscountValue] = useState(0);
  const [cashReceived, setCashReceived] = useState(0);

  // Load live inventory from Firestore
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

  // Only display active products
  const activeProducts = useMemo(
    () => products.filter((product) => product.isActive),
    [products]
  );

  // Search by name, SKU, or category
  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return activeProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term)
    );
  }, [activeProducts, search]);

  // Synchronize cart display with live inventory
  const liveCart = useMemo(() => {
    return cart.map((item) => {
      const currentProduct = products.find(
        (product) => product.id === item.productId
      );

      return {
        ...item,
        availableStock:
          currentProduct?.isActive === true
            ? currentProduct.stockQty
            : 0,
        sellingPrice:
          currentProduct?.isActive === true
            ? currentProduct.sellingPrice
            : item.sellingPrice,
      };
    });
  }, [cart, products]);

  // Detect stock changes or archived products
  const invalidItems = useMemo(() => {
    return liveCart.filter((item) => {
      const product = products.find(
        (p) => p.id === item.productId
      );

      return (
        !product ||
        !product.isActive ||
        item.quantity > item.availableStock ||
        item.quantity <= 0
      );
    });
  }, [liveCart, products]);

  const bill = useMemo(
    () =>
      calculateBill(
        liveCart,
        discountValue,
        discountType,
        cashReceived
      ),
    [liveCart, discountValue, discountType, cashReceived]
  );

  const totalItems = liveCart.length;

  // Add product to cart
  function addToCart(product: Product) {
    setNotice("");

    if (!product.isActive || product.stockQty <= 0) {
      setNotice("This product is unavailable.");
      return;
    }

    const existing = liveCart.find(
      (item) => item.productId === product.id
    );

    const step = product.unit === "pcs" ? 1 : 0.001;

    if (existing) {
      const nextQuantity = roundQuantity(
        existing.quantity + step
      );

      if (nextQuantity > product.stockQty) {
        setNotice(
          `Only ${product.stockQty} ${product.unit} available for ${product.name}.`
        );
        return;
      }

      setCart((previous) =>
        previous.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: nextQuantity }
            : item
        )
      );
    } else {
      const initialQuantity =
        product.stockQty >= 1 ? 1 : step;

      setCart((previous) => [
        ...previous,
        {
          ...productToCartItem(product),
          quantity: initialQuantity,
        },
      ]);
    }
  }

  // Change product quantity
  function changeQuantity(id: string, quantity: number) {
    const item = liveCart.find(
      (product) => product.productId === id
    );

    if (!item || !Number.isFinite(quantity)) return;

    const step = item.unit === "pcs" ? 1 : 0.001;
    const rounded = roundQuantity(quantity);

    if (
      rounded < step ||
      (item.unit === "pcs" && !Number.isInteger(rounded))
    ) {
      setNotice(
        item.unit === "pcs"
          ? "Quantity must be a positive whole number."
          : "Quantity must be at least 0.001."
      );
      return;
    }

    if (rounded > item.availableStock) {
      setNotice(
        `Only ${item.availableStock} ${item.unit} available.`
      );
      return;
    }

    setNotice("");

    setCart((previous) =>
      previous.map((product) =>
        product.productId === id
          ? { ...product, quantity: rounded }
          : product
      )
    );
  }

  // Remove item
  function removeFromCart(id: string) {
    setCart((previous) =>
      previous.filter((item) => item.productId !== id)
    );

    setNotice("");
  }

  // Clear cart
  function clearCart() {
    if (cart.length === 0) return;

    if (!window.confirm("Clear all items from the cart?")) {
      return;
    }

    setCart([]);
    setDiscountValue(0);
    setCashReceived(0);
    setNotice("");
  }

  const discountInvalid =
    !Number.isFinite(discountValue) ||
    discountValue < 0 ||
    (discountType === "percent" && discountValue > 100) ||
    (discountType === "amount" &&
      discountValue > bill.subtotal);

  const cashInvalid =
    !Number.isFinite(cashReceived) || cashReceived < 0;

  const readyToCheckout =
    !loading &&
    !error &&
    invalidItems.length === 0 &&
    !discountInvalid &&
    !cashInvalid &&
    bill.canPay;

  return (
    <div className="flex min-h-screen bg-[#f5f7fb]">
      <Sidebar />

      <main className="min-w-0 flex-1 p-4 sm:p-8">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Cashier Checkout
          </h1>

          <p className="mt-2 text-slate-500">
            Search products, build a cart and calculate bills
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl bg-red-50 p-4 text-red-700"
          >
            Firestore error: {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mb-5 rounded-xl bg-amber-50 p-4 text-amber-800"
          >
            {notice}
          </div>
        )}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          {/* LEFT: PRODUCT SEARCH */}
          <section className="min-w-0 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
                <PackageSearch size={23} />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Select Products
                </h2>

                <p className="text-sm text-slate-500">
                  {activeProducts.length} active products
                </p>
              </div>
            </div>

            <div className="relative mb-6">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product name, SKU or category..."
                aria-label="Search checkout products"
                className="w-full rounded-xl border border-slate-200 py-4 pl-12 pr-4 text-slate-900 outline-none focus:border-blue-500"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-3 py-20 text-slate-500">
                <LoaderCircle
                  className="animate-spin text-blue-600"
                  size={22}
                />
                Loading products...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-20 text-center text-slate-500">
                <ShoppingBag
                  size={42}
                  className="mx-auto mb-3 text-slate-300"
                />
                No matching products found.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredProducts.map((product) => {
                  const unavailable = product.stockQty <= 0;

                  return (
                    <button
                      type="button"
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={unavailable}
                      className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="rounded-xl bg-slate-100 p-3 text-slate-500">
                          <ShoppingBag size={22} />
                        </div>

                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            unavailable
                              ? "bg-red-100 text-red-700"
                              : product.stockQty <= 10
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {unavailable
                            ? "Out of Stock"
                            : `${product.stockQty} ${product.unit} left`}
                        </span>
                      </div>

                      <h3 className="mt-4 font-semibold text-slate-900">
                        {product.name}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        {product.sku} · {product.category}
                      </p>

                      <div className="mt-4 flex items-center justify-between gap-2">
                        <span className="font-bold text-blue-700">
                          {formatLKR(product.sellingPrice)}
                        </span>

                        <span className="text-xs text-slate-500">
                          per {product.unit}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* RIGHT: CART & BILLING */}
          <section className="min-w-0 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
                  <ShoppingCart size={23} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Current Cart
                  </h2>

                  <p className="text-sm text-slate-500">
                    {totalItems} product types
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={clearCart}
                disabled={cart.length === 0}
                title="Clear cart"
                aria-label="Clear cart"
                className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-30"
              >
                <Trash2 size={20} />
              </button>
            </div>

            {/* Cart items */}
            <div className="max-h-[360px] overflow-y-auto">
              {liveCart.length === 0 ? (
                <div className="py-12 text-center">
                  <ShoppingCart
                    size={42}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 font-medium text-slate-600">
                    Your cart is empty
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Select products to start a bill.
                  </p>
                </div>
              ) : (
                liveCart.map((item) => (
                  <CartItem
                    key={item.productId}
                    item={item}
                    onQuantityChange={changeQuantity}
                    onRemove={removeFromCart}
                  />
                ))
              )}
            </div>

            {invalidItems.length > 0 && (
              <div
                role="alert"
                className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
                Some cart items are unavailable or exceed current stock.
                Please adjust or remove them.
              </div>
            )}

            {/* Discount */}
            <div className="mt-6 border-t border-slate-100 pt-5">
              <h3 className="mb-3 font-semibold text-slate-900">
                Discount
              </h3>

              <div className="grid grid-cols-[130px_1fr] gap-3">
                <select
                  value={discountType}
                  onChange={(e) => {
                    setDiscountType(
                      e.target.value as DiscountType
                    );
                    setDiscountValue(0);
                  }}
                  aria-label="Discount type"
                  className="min-w-0 rounded-xl border border-slate-200 px-3 py-3 text-slate-900"
                >
                  <option value="amount">Rs.</option>
                  <option value="percent">%</option>
                </select>

                <input
                  type="number"
                  min="0"
                  max={
                    discountType === "percent"
                      ? 100
                      : bill.subtotal
                  }
                  step="0.01"
                  value={discountValue}
                  onChange={(e) =>
                    setDiscountValue(e.target.valueAsNumber)
                  }
                  aria-label="Discount value"
                  className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 text-slate-900"
                />
              </div>

              {discountInvalid && (
                <p className="mt-2 text-xs text-red-600">
                  Discount must be between 0 and{" "}
                  {discountType === "percent"
                    ? "100%."
                    : `${formatLKR(bill.subtotal)}.`}
                </p>
              )}
            </div>

            {/* Bill summary */}
            <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatLKR(bill.subtotal)}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Discount</span>
                <span className="text-red-600">
                  - {formatLKR(bill.discount)}
                </span>
              </div>

              <div className="flex justify-between border-t border-dashed border-slate-200 pt-4 text-xl font-bold text-slate-900">
                <span>Grand Total</span>
                <span className="text-blue-700">
                  {formatLKR(bill.total)}
                </span>
              </div>
            </div>

            {/* Cash payment */}
            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Banknote size={20} className="text-blue-600" />
                <h3 className="font-semibold text-slate-900">
                  Cash Payment
                </h3>
              </div>

              <label
                htmlFor="cashReceived"
                className="mb-2 block text-sm text-slate-600"
              >
                Cash Received (Rs.)
              </label>

              <input
                id="cashReceived"
                type="number"
                min="0"
                step="0.01"
                value={cashReceived}
                onChange={(e) =>
                  setCashReceived(e.target.valueAsNumber)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg font-semibold text-slate-900 outline-none focus:border-blue-500"
              />

              <div className="mt-4 flex justify-between text-sm">
                <span className="text-slate-600">
                  Balance Due
                </span>

                <span className="font-semibold text-red-600">
                  {formatLKR(bill.balanceDue)}
                </span>
              </div>

              <div className="mt-3 flex justify-between border-t border-slate-200 pt-3">
                <span className="font-semibold text-slate-700">
                  Change to Return
                </span>

                <span className="text-xl font-bold text-green-600">
                  {formatLKR(bill.change)}
                </span>
              </div>

              {cashInvalid && (
                <p className="mt-2 text-xs text-red-600">
                  Enter a valid non-negative cash amount.
                </p>
              )}
            </div>

            {/* Sale action */}
            <button
              type="button"
              disabled
              title="Sale recording will be enabled in Step 7"
              className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-4 font-semibold text-white opacity-60"
            >
              <span className="flex items-center justify-center gap-2">
                <Banknote size={20} />
                Complete Sale — Step 7
              </span>
            </button>

            <p className="mt-3 text-center text-xs text-slate-500">
              {readyToCheckout
                ? "Bill is ready. Secure sale recording will be added in Step 7."
                : "Add products and enter sufficient cash to prepare a bill."}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
