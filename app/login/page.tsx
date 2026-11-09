
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  LockKeyhole,
  Store,
  Eye,
  EyeOff,
  LoaderCircle,
} from "lucide-react";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();

  const {
    login,
    logout,
    user,
    role,
    loading,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading || !user) return;

    if (role === "manager" || role === "cashier") {
      router.replace("/dashboard");
    }
  }, [user, role, loading, router]);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setSubmitting(true);

    try {
      await login(email.trim(), password);

      // Read the user's latest Firebase custom claims.
      const currentUser = await import("firebase/auth").then(
        ({ getAuth }) => getAuth().currentUser
      );

      if (!currentUser) {
        throw new Error("Authentication session not found.");
      }

      const tokenResult = await currentUser.getIdTokenResult(true);

      const isManager = tokenResult.claims.manager === true;
      const isCashier = tokenResult.claims.cashier === true;

      if (!isManager && !isCashier) {
        await logout();
        setError(
          "Access denied. Your account does not have a Manager or Cashier role."
        );
        return;
      }

      router.replace("/dashboard");
    } catch (err: unknown) {
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case "auth/invalid-email":
            setError("Please enter a valid email address.");
            break;

          case "auth/invalid-credential":
          case "auth/wrong-password":
          case "auth/user-not-found":
            setError("Incorrect email or password.");
            break;

          case "auth/too-many-requests":
            setError("Too many attempts. Please try again later.");
            break;

          case "auth/network-request-failed":
            setError(
              "Network error. Check your internet connection."
            );
            break;

          default:
            setError("Unable to sign in. Please try again.");
        }
      } else {
        console.error("Login error:", err);
        setError("Unable to sign in. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (
    loading ||
    (user && (role === "manager" || role === "cashier"))
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#101d35]">
        <LoaderCircle
          className="animate-spin text-white"
          size={40}
        />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#101d35] p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <Store size={32} />
          </div>

          <h1 className="mt-5 text-3xl font-bold text-slate-900">
            RetailPOS
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Sign in to your Manager or Cashier account
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <LoaderCircle
                  size={19}
                  className="animate-spin"
                />
                Signing In...
              </>
            ) : (
              <>
                <LockKeyhole size={19} />
                Sign In
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-400">
          Retail Mini-POS | Secure Manager & Cashier Access
        </p>
      </div>
    </main>
  );
}
