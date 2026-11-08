
import { LockKeyhole, Store } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#101d35] p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center">
          <div className="rounded-2xl bg-blue-600 p-4 text-white">
            <Store size={30} />
          </div>

          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            RetailPOS
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to manage your store
          </p>
        </div>

        <form className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="cashier@example.com"
              autoComplete="email"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="button"
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white opacity-60"
          >
            <LockKeyhole size={18} />
            Sign In (Coming Soon)
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Authentication will be enabled with Firebase.
        </p>
      </div>
    </main>
  );
}
