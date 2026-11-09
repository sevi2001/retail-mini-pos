
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Banknote,
  LoaderCircle,
  PackageSearch,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  RefreshCw,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import CartItem from "@/components/checkout/CartItem";
import ProductImage from "@/components/products/ProductImage";

import {
  completeSale,
  createCheckoutRequestId,
  type IdempotentCheckoutRequest,
} from "@/lib/sales";

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

// ==========================================
// LOCAL PRODUCT IMAGES
// ==========================================

const PRODUCT_IMAGES: Record<string, string> = {
  ANC400: "/products/anchor-milk.jpg",
  TEA001: "/products/ceylon-tea.jpg",
  EGG001: "/products/chicken-eggs.jpg",
  OIL001: "/products/coconut-oil.jpg",
  BUTTER001: "/products/highland-butter.jpg",
  RICE001: "/products/keeri-samba-rice.jpg",
  BIS001: "/products/munchee-cream-cracker.jpg",
  NOOD001: "/products/prima-noodles.jpg",
  DHAL001: "/products/red-dhal.jpg",
  SOAP001: "/products/sunlight-soap.jpg",
  SUGAR001: "/products/white-sugar.jpg",
};

function getProductImage(product: Product): string | undefined {
  // Prefer the image path saved with the product in Firestore.
  const savedPath = product.imageUrl?.trim();

  if (
    savedPath &&
    /^\/products\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(savedPath)
  ) {
    return savedPath;
  }

  // Existing products without a saved image can use their local images.
  return PRODUCT_IMAGES[product.sku.trim().toUpperCase()];
}

// ==========================================
// CHECKOUT PAGE
// ==========================================

export default function CheckoutPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItemType[]>([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [processingSale, setProcessingSale] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [discountType, setDiscountType] =
    useState<DiscountType>("amount");

  const [discountValue, setDiscountValue] = useState(0);
  const [cashReceived, setCashReceived] = useState(0);

  // Prevent rapid double-click submissions.
  const checkoutInProgressRef = useRef(false);

  // Keep the exact request for safe retries.
  const pendingCheckoutRef =
    useRef<IdempotentCheckoutRequest | null>(null);

  const [pendingCheckout, setPendingCheckout] =
    useState(false);

  // ==========================================
  // LOAD PRODUCTS FROM FIRESTORE
  // ==========================================

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

  // ==========================================
  // ACTIVE PRODUCTS
  // ==========================================

  const activeProducts = useMemo(() => {
    return products.filter(
      (product) => product.isActive
    );
  }, [products]);

  // ==========================================
  // SEARCH PRODUCTS
  // ==========================================

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return activeProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term)
    );
  }, [activeProducts, search]);

  // ==========================================
  // LIVE CART
  // ==========================================

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

  // ==========================================
  // VALIDATE CART
  // ==========================================

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

  // ==========================================
  // CALCULATE BILL
  // ==========================================

  const bill = useMemo(() => {
    return calculateBill(
      liveCart,
      discountValue,
      discountType,
      cashReceived
    );
  }, [
    liveCart,
    discountValue,
    discountType,
    cashReceived,
  ]);

  const totalItems = liveCart.length;

  const discountInvalid =
    !Number.isFinite(discountValue) ||
    discountValue < 0 ||
    (discountType === "percent" &&
      discountValue > 100) ||
    (discountType === "amount" &&
      discountValue > bill.subtotal);

  const cashInvalid =
    !Number.isFinite(cashReceived) ||
    cashReceived < 0;

  const readyToCheckout =
    !loading &&
    !processingSale &&
    !pendingCheckout &&
    !error &&
    invalidItems.length === 0 &&
    !discountInvalid &&
    !cashInvalid &&
    bill.canPay &&
    liveCart.length > 0;

  const cartLocked =
    processingSale || pendingCheckout;

  // ==========================================
  // ADD PRODUCT TO CART
  // ==========================================

  function addToCart(product: Product) {
    if (cartLocked) return;

    setNotice("");

    if (!product.isActive || product.stockQty <= 0) {
      setNotice("This product is unavailable.");
      return;
    }

    const existing = liveCart.find(
      (item) => item.productId === product.id
    );

    // Increase by 1 when clicking a product.
    const step = 1;

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
            ? {
                ...item,
                quantity: nextQuantity,
              }
            : item
        )
      );
    } else {
      const minimumQuantity =
        product.unit === "pcs" ? 1 : 0.001;

      const initialQuantity =
        product.stockQty >= 1
          ? 1
          : minimumQuantity;

      if (initialQuantity > product.stockQty) {
        setNotice("Insufficient stock.");
        return;
      }

      setCart((previous) => [
        ...previous,
        {
          ...productToCartItem(product),
          quantity: initialQuantity,
        },
      ]);
    }
  }

  // ==========================================
  // CHANGE QUANTITY
  // ==========================================

  function changeQuantity(
    id: string,
    quantity: number
  ) {
    if (cartLocked) return;

    const item = liveCart.find(
      (product) => product.productId === id
    );

    if (!item || !Number.isFinite(quantity)) {
      return;
    }

    const minimumQuantity =
      item.unit === "pcs" ? 1 : 0.001;

    const rounded = roundQuantity(quantity);

    if (
      rounded < minimumQuantity ||
      (item.unit === "pcs" &&
        !Number.isInteger(rounded))
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
          ? {
              ...product,
              quantity: rounded,
            }
          : product
      )
    );
  }

  // ==========================================
  // REMOVE PRODUCT
  // ==========================================

  function removeFromCart(id: string) {
    if (cartLocked) return;

    setCart((previous) =>
      previous.filter(
        (item) => item.productId !== id
      )
    );

    setNotice("");
  }

  // ==========================================
  // CLEAR CART
  // ==========================================

  function clearCart() {
    if (cartLocked || cart.length === 0) {
      return;
    }

    if (
      !window.confirm(
        "Clear all items from the cart?"
      )
    ) {
      return;
    }

    setCart([]);
    setDiscountValue(0);
    setCashReceived(0);
    setNotice("");
  }

  // ==========================================
  // SEND CHECKOUT REQUEST
  // ==========================================

  async function submitCheckout(
    checkout: IdempotentCheckoutRequest
  ) {
    if (checkoutInProgressRef.current) {
      return;
    }

    checkoutInProgressRef.current = true;

    setProcessingSale(true);
    setError("");
    setNotice("");

    try {
      const result = await completeSale(checkout);

      // Server confirmed the sale.
      pendingCheckoutRef.current = null;
      setPendingCheckout(false);

      setCart([]);
      setDiscountValue(0);
      setCashReceived(0);

      router.push(
        `/sales?receipt=${encodeURIComponent(result.saleId)}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete sale."
      );

      // Keep the exact original checkout payload.
      // Do not generate another ID for retries.
      setPendingCheckout(true);
    } finally {
      checkoutInProgressRef.current = false;
      setProcessingSale(false);
    }
  }

  // ==========================================
  // COMPLETE SALE
  // ==========================================

  async function handleCompleteSale() {
    if (
      !readyToCheckout ||
      checkoutInProgressRef.current
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Complete this cash sale for ${formatLKR(bill.total)}?`
    );

    if (!confirmed) return;

    const checkout: IdempotentCheckoutRequest = {
      requestId: createCheckoutRequestId(),

      items: liveCart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),

      discountType,
      discountValue,
      cashReceived,
    };

    pendingCheckoutRef.current = checkout;
    setPendingCheckout(true);

    await submitCheckout(checkout);
  }

  // ==========================================
  // RETRY SAME SALE
  // ==========================================

  async function handleRetrySale() {
    const checkout = pendingCheckoutRef.current;

    if (!checkout || checkoutInProgressRef.current) {
      return;
    }

    await submitCheckout(checkout);
  }

  // ==========================================
  // PAGE UI
  // ==========================================

  return (
    <div className="flex min-h-screen bg-[#f5f7fb]">
      <Sidebar />

      <main className="min-w-0 flex-1 p-4 sm:p-8">
        {/* PAGE HEADING */}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Cashier Checkout
          </h1>

          <p className="mt-2 text-slate-500">
            Search products, build a cart and calculate bills
          </p>
        </div>

        {/* ERROR MESSAGE */}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl bg-red-50 p-4 text-red-700"
          >
            Checkout error: {error}
          </div>
        )}

        {/* NOTICE MESSAGE */}

        {notice && (
          <div
            role="status"
            className="mb-5 rounded-xl bg-amber-50 p-4 text-amber-800"
          >
            {notice}
          </div>
        )}

        {/* PENDING CHECKOUT NOTICE */}

        {pendingCheckout && !processingSale && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-900">
              Checkout requires confirmation
            </p>

            <p className="mt-1 text-sm text-amber-800">
              Your previous request may have been saved.
              Retry using the same request ID to avoid
              creating a duplicate sale.
            </p>

            <button
              type="button"
              onClick={handleRetrySale}
              className="mt-3 flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700"
            >
              <RefreshCw size={16} />
              Retry Same Sale
            </button>
          </div>
        )}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">

          {/* ==================================
              LEFT: PRODUCT SEARCH
          ================================== */}

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

            {/* SEARCH */}

            <div className="relative mb-6">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search product name, SKU or category..."
                aria-label="Search checkout products"
                className="w-full rounded-xl border border-slate-200 py-4 pl-12 pr-4 text-slate-900 outline-none focus:border-blue-500"
              />
            </div>

            {/* PRODUCT LIST */}

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
                  const unavailable =
                    product.stockQty <= 0;

                  const imageUrl =
                    getProductImage(product);

                  return (
                    <button
                      type="button"
                      key={product.id}
                      onClick={() =>
                        addToCart(product)
                      }
                      disabled={
                        unavailable || cartLocked
                      }
                      className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {/* IMAGE AND STOCK */}

                      <div className="flex items-start justify-between gap-3">

                        <ProductImage
                          src={imageUrl}
                          alt={product.name}
                        />

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

                      {/* PRODUCT NAME */}

                      <h3 className="mt-4 font-semibold text-slate-900">
                        {product.name}
                      </h3>

                      {/* SKU AND CATEGORY */}

                      <p className="mt-1 text-xs text-slate-500">
                        {product.sku} · {product.category}
                      </p>

                      {/* PRICE */}

                      <div className="mt-4 flex items-center justify-between gap-2">
                        <span className="font-bold text-blue-700">
                          {formatLKR(
                            product.sellingPrice
                          )}
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

          {/* ==================================
              RIGHT: CART AND BILLING
          ================================== */}

          <section className="min-w-0 rounded-2xl bg-white p-5 shadow-sm sm:p-6">

            {/* CART HEADING */}

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
                disabled={
                  cart.length === 0 || cartLocked
                }
                title="Clear cart"
                aria-label="Clear cart"
                className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-30"
              >
                <Trash2 size={20} />
              </button>
            </div>

            {/* CART ITEMS */}

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
                <div
                  className={
                    cartLocked
                      ? "pointer-events-none opacity-70"
                      : ""
                  }
                >
                  {liveCart.map((item) => (
                    <CartItem
                      key={item.productId}
                      item={item}
                      onQuantityChange={
                        changeQuantity
                      }
                      onRemove={removeFromCart}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* INVALID STOCK WARNING */}

            {invalidItems.length > 0 && (
              <div
                role="alert"
                className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
                Some cart items are unavailable or exceed
                current stock. Please adjust or remove them.
              </div>
            )}

            {/* ==================================
                DISCOUNT
            ================================== */}

            <div className="mt-6 border-t border-slate-100 pt-5">
              <h3 className="mb-3 font-semibold text-slate-900">
                Discount
              </h3>

              <div className="grid grid-cols-[130px_1fr] gap-3">

                <select
                  value={discountType}
                  disabled={cartLocked}
                  onChange={(e) => {
                    setDiscountType(
                      e.target.value as DiscountType
                    );
                    setDiscountValue(0);
                  }}
                  aria-label="Discount type"
                  className="min-w-0 rounded-xl border border-slate-200 px-3 py-3 text-slate-900 disabled:opacity-50"
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
                  disabled={cartLocked}
                  value={
                    Number.isFinite(discountValue)
                      ? discountValue
                      : ""
                  }
                  onChange={(e) => {
                    const value = e.target.value;

                    setDiscountValue(
                      value === ""
                        ? 0
                        : Number(value)
                    );
                  }}
                  aria-label="Discount value"
                  className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 text-slate-900 disabled:opacity-50"
                />
              </div>

              {discountInvalid && (
                <p className="mt-2 text-xs text-red-600">
                  Discount must be between 0 and{" "}
                  {discountType === "percent"
                    ? "100%."
                    : `${formatLKR(
                        bill.subtotal
                      )}.`}
                </p>
              )}
            </div>

            {/* ==================================
                BILL SUMMARY
            ================================== */}

            <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">

              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>
                  {formatLKR(bill.subtotal)}
                </span>
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

            {/* ==================================
                CASH PAYMENT
            ================================== */}

            <div className="mt-6 rounded-xl bg-slate-50 p-4">

              <div className="mb-3 flex items-center gap-2">
                <Banknote
                  size={20}
                  className="text-blue-600"
                />

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
                disabled={cartLocked}
                value={
                  Number.isFinite(cashReceived)
                    ? cashReceived
                    : ""
                }
                onChange={(e) => {
                  const value = e.target.value;

                  setCashReceived(
                    value === ""
                      ? 0
                      : Number(value)
                  );
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg font-semibold text-slate-900 outline-none focus:border-blue-500 disabled:opacity-50"
              />

              {/* BALANCE DUE */}

              <div className="mt-4 flex justify-between text-sm">
                <span className="text-slate-600">
                  Balance Due
                </span>

                <span className="font-semibold text-red-600">
                  {formatLKR(bill.balanceDue)}
                </span>
              </div>

              {/* CHANGE */}

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

            {/* ==================================
                COMPLETE SALE BUTTON
            ================================== */}

            <button
              type="button"
              onClick={handleCompleteSale}
              disabled={!readyToCheckout}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-4 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processingSale ? (
                <>
                  <LoaderCircle
                    size={20}
                    className="animate-spin"
                  />
                  Processing Sale...
                </>
              ) : (
                <>
                  <Banknote size={20} />
                  Complete Sale —{" "}
                  {formatLKR(bill.total)}
                </>
              )}
            </button>

            <p className="mt-3 text-center text-xs text-slate-500">
              {pendingCheckout
                ? "Resolve the pending checkout before starting another sale."
                : readyToCheckout
                ? "Ready to complete this cash sale."
                : "Add products and enter sufficient cash to prepare a bill."}
            </p>

          </section>
        </div>
      </main>
    </div>
  );
}
