import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi } from "../api/services";
import { tokenStore } from "../api/client";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const pickUser = (res) => res.data?.user || res.data?.data?.user || res.data?.data || null;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!tokenStore.access);

  useEffect(() => {
    if (!tokenStore.access) return;
    authApi
      .me()
      .then((res) => setUser(pickUser(res)))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.adminLogin({ email, password });
    const d = res.data?.data ?? res.data;
    tokenStore.set({ access: d.accessToken || d.token, refresh: d.refreshToken });
    let u = d.user || res.data?.user;
    if (!u) u = pickUser(await authApi.me());
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    tokenStore.clear();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}
