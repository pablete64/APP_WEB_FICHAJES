import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@/services/authService";
import { authService } from "@/services/authService";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  login: (name: string, password: string) => Promise<boolean>;
  loginAsAdmin: (password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const savedUser = sessionStorage.getItem("user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error("Failed to parse user from sessionStorage", e);
    }
  }, []);

  const login = async (name: string, password: string): Promise<boolean> => {
    try {
      const response = await authService.login(name, password);
      sessionStorage.setItem("token", response.access_token);
      sessionStorage.setItem("user", JSON.stringify(response.user));
      setUser(response.user);
      return true;
    } catch (error: any) {
      console.error("Login Error", error);
      return false;
    }
  };

  const loginAsAdmin = async (password: string): Promise<boolean> => {
    // El usuario ADMIN está alineado con la semilla (seed) y las pruebas E2E.
    return login("ADMIN", password);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginAsAdmin, logout, isAdmin: !!user?.is_admin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
