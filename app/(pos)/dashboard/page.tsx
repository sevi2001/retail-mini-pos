
import Sidebar from "@/components/Sidebar";
import {
  Package,
  ShoppingCart,
  Wallet,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";

const stats = [
  {
    title: "Total Products",
    value: "—",
    icon: Package,
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Today's Sales",
    value: "—",
    icon: ShoppingCart,
    color: "bg-purple-100 text-purple-600",
  },
  {
    title: "Today's Revenue",
    value: "—",
    icon: Wallet,
    color: "bg-green-100 text-green-600",
  },
  {
    title: "Low Stock Items",
    value: "—",
    icon: TrendingUp,
    color: "bg-orange-100 text-orange-600",
  },
];

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-[#f5f7fb]">
      <Sidebar />

      <main className="min-w-0 flex-1 p-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Dashboard
            </h1>
            <p className="mt-2 text-slate-500">
              Welcome to your Retail POS Management System
            </p>
          </div>

          <div className="rounded-xl bg-white px-5 py-3 shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              Store Overview
            </p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.title}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className={`rounded-xl p-3 ${stat.color}`}>
                    <Icon size={24} />
                  </div>
                  <ArrowUpRight className="text-slate-400" size={18} />
                </div>

                <p className="text-sm text-slate-500">{stat.title}</p>
                <h2 className="mt-2 text-3xl font-bold text-slate-900">
                  {stat.value}
                </h2>
              </div>
            );
          })}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Recent Sales
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Your latest transactions will appear here.
            </p>

            <div className="mt-8 rounded-xl border border-dashed border-slate-200 p-10 text-center text-slate-400">
              No sales data connected yet
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Inventory Overview
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Monitor your products and stock levels.
            </p>

            <div className="mt-8 rounded-xl border border-dashed border-slate-200 p-10 text-center text-slate-400">
              Inventory data will appear here
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
