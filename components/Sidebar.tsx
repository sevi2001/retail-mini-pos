
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  Store,
  LogOut,
  UserRound,
  LoaderCircle,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";

const managerMenuItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Products",
    href: "/products",
    icon: Package,
  },
  {
    name: "Checkout",
    href: "/checkout",
    icon: ShoppingCart,
  },
  {
    name: "Sales History",
    href: "/sales",
    icon: Receipt,
  },
];

const cashierMenuItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Checkout",
    href: "/checkout",
    icon: ShoppingCart,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const {
    user,
    role,
    isManager,
    isCashier,
    loading,
    logout,
  } = useAuth();

  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const menuItems = isManager
    ? managerMenuItems
    : isCashier
      ? cashierMenuItems
      : [];

  async function handleLogout() {
    setLoggingOut(true);
    setError("");

    try {
      await logout();
      router.replace("/login");
    } catch {
      setError("Unable to sign out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col bg-[#101d35] p-5 text-white">
      {/* BRAND */}
      <div className="mb-12 flex items-center gap-3">
        <div className="rounded-xl bg-blue-600 p-3">
          <Store size={24} />
        </div>

        <div>
          <h1 className="text-xl font-bold">
            RetailPOS
          </h1>

          <p className="text-xs text-slate-400">
            {isManager
              ? "Store Management"
              : isCashier
                ? "Cashier Terminal"
                : "Retail Mini-POS"}
          </p>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-400">
            <LoaderCircle
              size={18}
              className="animate-spin"
            />
            Loading menu...
          </div>
        ) : (
          menuItems.map((item) => {
            const Icon = item.icon;

            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={
                  active ? "page" : undefined
                }
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })
        )}
      </nav>

      {/* USER INFORMATION */}
      <div className="border-t border-slate-700 pt-5">
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-slate-800 p-3">
          <div className="rounded-full bg-blue-600 p-2">
            <UserRound size={18} />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {loading
                ? "Loading account..."
                : role === "manager"
                  ? "Active Manager"
                  : role === "cashier"
                    ? "Active Cashier"
                    : "No Assigned Role"}
            </p>

            <p
              className="truncate text-xs text-slate-400"
              title={user?.email ?? ""}
            >
              {user?.email ?? "Unknown user"}
            </p>
          </div>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <p
            role="alert"
            className="mb-3 text-xs text-red-300"
          >
            {error}
          </p>
        )}

        {/* LOGOUT BUTTON */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-red-500/20 hover:text-red-300 disabled:opacity-60"
        >
          {loggingOut ? (
            <LoaderCircle
              size={20}
              className="animate-spin"
            />
          ) : (
            <LogOut size={20} />
          )}

          <span>
            {loggingOut
              ? "Signing out..."
              : "Logout"}
          </span>
        </button>
      </div>
    </aside>
  );
}
