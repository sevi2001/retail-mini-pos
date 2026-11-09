
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

type UserRole = "manager" | "cashier" | null;

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isManager: boolean;
  isCashier: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

async function getUserRole(
  firebaseUser: User
): Promise<UserRole> {
  const tokenResult = await firebaseUser.getIdTokenResult(true);

  if (tokenResult.claims.manager === true) {
    return "manager";
  }

  if (tokenResult.claims.cashier === true) {
    return "cashier";
  }

  return null;
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (!active) return;

        setLoading(true);
        setUser(firebaseUser);
        setRole(null);

        if (!firebaseUser) {
          setLoading(false);
          return;
        }

        try {
          const userRole = await getUserRole(firebaseUser);

          if (active && auth.currentUser?.uid === firebaseUser.uid) {
            setRole(userRole);
          }
        } catch (error) {
          console.error("Failed to load user role:", error);

          if (active) {
            setRole(null);
          }
        } finally {
          if (active && auth.currentUser?.uid === firebaseUser.uid) {
            setLoading(false);
          }
        }
      },
      (error) => {
        console.error("Authentication error:", error);

        if (active) {
          setUser(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const userRole = await getUserRole(credential.user);

      setUser(credential.user);
      setRole(userRole);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setRole(null);
  };

  const refreshRole = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setRole(null);
      return;
    }

    setLoading(true);

    try {
      const userRole = await getUserRole(currentUser);

      if (auth.currentUser?.uid === currentUser.uid) {
        setRole(userRole);
      }
    } catch (error) {
      console.error("Failed to refresh user role:", error);
      setRole(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isManager: role === "manager",
        isCashier: role === "cashier",
        loading,
        login,
        logout,
        refreshRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}
