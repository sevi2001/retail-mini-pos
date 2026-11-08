
"use client";

import { Minus, Plus, Trash2 } from "lucide-react";

import type { CartItem as CartItemType } from "@/types/checkout";
import { calculateLineTotal } from "@/lib/checkout";
import { formatLKR } from "@/lib/currency";

interface Props {
  item: CartItemType;
  onQuantityChange: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export default function CartItem({
  item,
  onQuantityChange,
  onRemove,
}: Props) {
  const step = item.unit === "pcs" ? 1 : 0.001;
  const quantityStep = item.unit === "pcs" ? "1" : "0.001";

  return (
    <div className="border-b border-slate-100 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900">
            {item.name}
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            {item.sku} · {formatLKR(item.sellingPrice)} / {item.unit}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Available: {item.availableStock} {item.unit}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onRemove(item.productId)}
          aria-label={`Remove ${item.name}`}
          className="rounded-lg p-2 text-red-500 hover:bg-red-50"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() =>
              onQuantityChange(
                item.productId,
                Number((item.quantity - step).toFixed(3))
              )
            }
            className="p-2 text-slate-600 hover:bg-slate-100"
            aria-label={`Decrease ${item.name} quantity`}
          >
            <Minus size={16} />
          </button>

          <input
            type="number"
            min={step}
            max={item.availableStock}
            step={quantityStep}
            value={item.quantity}
            onChange={(e) =>
              onQuantityChange(
                item.productId,
                e.target.valueAsNumber
              )
            }
            aria-label={`${item.name} quantity`}
            className="w-20 border-x border-slate-200 px-2 py-2 text-center text-sm text-slate-900 outline-none"
          />

          <button
            type="button"
            onClick={() =>
              onQuantityChange(
                item.productId,
                Number((item.quantity + step).toFixed(3))
              )
            }
            disabled={item.quantity + step > item.availableStock}
            className="p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
            aria-label={`Increase ${item.name} quantity`}
          >
            <Plus size={16} />
          </button>
        </div>

        <span className="font-bold text-slate-900">
          {formatLKR(calculateLineTotal(item))}
        </span>
      </div>
    </div>
  );
}
