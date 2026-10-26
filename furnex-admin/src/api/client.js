import axios from "axios";

export const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || "http://localhost:5000").replace(/\/$/, "");

export const tokenStore = {
  get access() { return localStorage.getItem("fx_access"); },
  get refresh() { return localStorage.getItem("fx_refresh"); },
  set({ access, refresh }) {
    if (access) localStorage.setItem("fx_access", access);
    if (refresh) localStorage.setItem("fx_refresh", refresh);
  },
  clear() {
    localStorage.removeItem("fx_access");
    localStorage.removeItem("fx_refresh");
  },
};

const api = axios.create({ baseURL: `${API_ORIGIN}/api/v1` });

api.interceptors.request.use((config) => {
  if (tokenStore.access) config.headers.Authorization = `Bearer ${tokenStore.access}`;
  return config;
});

let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthCall = original?.url?.includes("/auth/");

    if (status === 401 && !original._retry && !isAuthCall && tokenStore.refresh) {
      original._retry = true;
      try {
        refreshing =
          refreshing ||
          axios.post(`${API_ORIGIN}/api/v1/auth/refresh`, { refreshToken: tokenStore.refresh });
        const res = await refreshing;
        const d = res.data?.data ?? res.data;
        tokenStore.set({ access: d.accessToken || d.token, refresh: d.refreshToken });
        refreshing = null;
        original.headers.Authorization = `Bearer ${tokenStore.access}`;
        return api(original);
      } catch (e) {
        refreshing = null;
        tokenStore.clear();
        window.location.href = "/login";
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
