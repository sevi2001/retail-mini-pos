
import Sidebar from "@/components/Sidebar";
import { ShoppingCart } from "lucide-react";

export default function CheckoutPage() {
  return (
    <div className="flex min-h-screen bg-[#f5f7fb]">
      <Sidebar />

      <main className="min-w-0 flex-1 p-8">
        <h1 className="text-3xl font-bold text-slate-900">
          Cashier Checkout
        </h1>
        <p className="mt-2 text-slate-500">
          Create bills and process customer purchases
        </p>

        <div className="mt-8 rounded-2xl bg-white p-12 text-center shadow-sm">
          <ShoppingCart
            size={52}
            className="mx-auto text-blue-600"
          />
          <h2 className="mt-4 text-xl font-semibold text-slate-900">
            Checkout Counter
          </h2>
          <p className="mt-2 text-slate-500">
            Product search, cart, discounts and cash payment
            will be added in a later step.
          </p>
        </div>
      </main>
    </div>
  );
}
