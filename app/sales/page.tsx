
import Sidebar from "@/components/Sidebar";
import { Receipt } from "lucide-react";

export default function SalesPage() {
  return (
    <div className="flex min-h-screen bg-[#f5f7fb]">
      <Sidebar />

      <main className="min-w-0 flex-1 p-8">
        <h1 className="text-3xl font-bold text-slate-900">
          Sales History
        </h1>
        <p className="mt-2 text-slate-500">
          View completed transactions and receipts
        </p>

        <div className="mt-8 rounded-2xl bg-white p-12 text-center shadow-sm">
          <Receipt size={52} className="mx-auto text-blue-600" />
          <h2 className="mt-4 text-xl font-semibold text-slate-900">
            Sales Records
          </h2>
          <p className="mt-2 text-slate-500">
            Completed sales and printable receipts
            will appear here.
          </p>
        </div>
      </main>
    </div>
  );
}
