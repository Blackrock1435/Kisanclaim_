import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, getToken, setToken } from "./api";
import i18n from "../i18n";

export type User = { id: number; name: string; email: string; role: "farmer" | "officer" | "admin"; language: string; district?: string };
type Ctx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  sendOtp: (phone: string) => Promise<{ success: boolean; phone: string; otp: string; dev_otp?: string; is_registered: boolean; name?: string; message: string }>;
  loginWithOtp: (phone: string, otp: string, name?: string) => Promise<User>;
  register: (b: any) => Promise<User>;
  logout: () => void;
};
const AuthCtx = createContext<Ctx>(null as any);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!getToken());
  const qc = useQueryClient();

  useEffect(() => {
    if (!getToken()) return;
    api<User>("/auth/me").then((u) => { setUser(u); })
      .catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  const finish = (r: { token: string; user: User }) => { setToken(r.token); setUser(r.user); qc.clear(); return r.user; };
  return (
    <AuthCtx.Provider value={{ user, loading,
      login: async (email, password) => finish(await api("/auth/login", { body: { email, password } })),
      sendOtp: async (phone) => api("/auth/otp/send", { body: { phone } }),
      loginWithOtp: async (phone, otp, name) => finish(await api("/auth/otp/verify", { body: { phone, otp, name } })),
      register: async (b) => finish(await api("/auth/register", { body: b })),
      logout: () => { setToken(null); setUser(null); qc.clear(); } }}>
      {children}
    </AuthCtx.Provider>
  );
}
