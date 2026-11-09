
"use client";

import { Printer, X } from "lucide-react";
import { formatLKR } from "@/lib/currency";
import type { Sale } from "@/types/sale";

interface Props {
  sale: Sale;
  onClose: () => void;
}

export default function Receipt({ sale, onClose }: Props) {
  const date = sale.createdAt?.toDate();

  function printReceipt() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 print:static print:bg-white print:p-0">
      <div className="mx-auto my-6 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl print:my-0 print:max-w-none print:rounded-none print:p-2 print:shadow-none">
        <div className="mb-5 flex justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={printReceipt}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <Printer size={17} />
            Print
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close receipt"
            className="rounded-lg border border-slate-200 p-2 text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-slate-900">
            RETAIL MINI POS
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Sri Lankan Grocery Store
          </p>

          <p className="mt-2 text-sm font-semibold">
            CASH RECEIPT
          </p>
        </div>

        <div className="my-5 border-y border-dashed border-slate-300 py-4 text-sm text-slate-700">
          <p className="break-all">
            <strong>Invoice:</strong> {sale.invoiceNumber}
          </p>

          <p className="mt-1">
            <strong>Date:</strong>{" "}
            {date
              ? date.toLocaleString("en-LK", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Asia/Colombo",
                })
              : "Pending timestamp"}
          </p>

          <p className="mt-1 break-all">
            <strong>Cashier:</strong> {sale.cashierEmail}
          </p>
        </div>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-2">Item</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>

          <tbody>
            {sale.items.map((item) => (
              <tr key={item.productId} className="border-b border-slate-100">
                <td className="py-3 pr-2">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatLKR(item.unitPrice)} / {item.unit}
                  </p>
                </td>

                <td className="py-3 text-right">
                  {item.quantity}
                </td>

                <td className="py-3 text-right">
                  {formatLKR(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatLKR(sale.subtotal)}</span>
          </div>

          <div className="flex justify-between">
            <span>Discount</span>
            <span>- {formatLKR(sale.discount)}</span>
          </div>

          <div className="flex justify-between border-t border-dashed border-slate-300 pt-3 text-lg font-bold">
            <span>Total</span>
            <span>{formatLKR(sale.total)}</span>
          </div>

          <div className="flex justify-between">
            <span>Cash Received</span>
            <span>{formatLKR(sale.cashReceived)}</span>
          </div>

          <div className="flex justify-between font-semibold">
            <span>Change</span>
            <span>{formatLKR(sale.change)}</span>
          </div>
        </div>

        <div className="mt-8 border-t border-dashed border-slate-300 pt-5 text-center text-sm">
          <p className="font-semibold">Thank you for shopping!</p>
          <p className="mt-1 text-slate-500">
            Please visit us again.
          </p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          .fixed.z-50,
          .fixed.z-50 * {
            visibility: visible !important;
          }

          .fixed.z-50 {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            background: white !important;
          }

          @page {
            margin: 8mm;
          }
        }
      `}</style>
    </div>
  );
}
