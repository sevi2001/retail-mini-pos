
import Sidebar from "@/components/Sidebar";
import { Package, Plus } from "lucide-react";

export default function ProductsPage() {
  return (
    <div className="flex min-h-screen bg-[#f5f7fb]">
      <Sidebar />

      <main className="min-w-0 flex-1 p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Product Management
            </h1>
            <p className="mt-2 text-slate-500">
              Manage products and available stock
            </p>
          </div>

          <button
            disabled
            title="Available in a later step"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-white opacity-60"
          >
            <Plus size={20} />
            Add Product
          </button>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
          <Package size={48} className="mx-auto text-blue-500" />
          <h2 className="mt-4 text-xl font-semibold text-slate-900">
            Product Inventory
          </h2>
          <p className="mt-2 text-slate-500">
            Product CRUD and search will be implemented after Firebase setup.
          </p>
        </div>
      </main>
    </div>
  );
}
