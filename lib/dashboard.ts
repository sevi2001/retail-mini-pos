
import type { Product } from "@/types/products";
import type { Sale } from "@/types/sale";
import type { DashboardStats } from "@/types/dashboard";

export function formatLKRAmount(value: number): string {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getColomboDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatSaleDate(
  date: Date | null | undefined
): string {
  if (!date) return "Pending";

  return new Intl.DateTimeFormat("en-LK", {
    timeZone: "Asia/Colombo",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function calculateDashboardStats(
  products: Product[],
  sales: Sale[],
  now: Date = new Date()
): DashboardStats {
  const activeProducts = products.filter(
    (product) => product.isActive === true
  );

  const todayKey = getColomboDateKey(now);

  const todaySalesList = sales.filter((sale) => {
    const date = sale.createdAt?.toDate();

    return date
      ? getColomboDateKey(date) === todayKey
      : false;
  });

  return {
    totalProducts: activeProducts.length,

    // Sum of quantities across different units.
    // Useful as an indicator, not a physical unit total.
    totalStockUnits: activeProducts.reduce(
      (sum, product) => sum + product.stockQty,
      0
    ),

    inventoryValue: activeProducts.reduce(
      (sum, product) =>
        sum + product.stockQty * product.costPrice,
      0
    ),

    lowStockProducts: activeProducts.filter(
      (product) =>
        product.stockQty > 0 && product.stockQty <= 10
    ).length,

    outOfStockProducts: activeProducts.filter(
      (product) => product.stockQty <= 0
    ).length,

    todaySales: todaySalesList.length,

    todayRevenue: todaySalesList.reduce(
      (sum, sale) => sum + sale.total,
      0
    ),

    totalRecentRevenue: sales.reduce(
      (sum, sale) => sum + sale.total,
      0
    ),
  };
}
