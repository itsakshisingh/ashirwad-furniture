import api from "./client";

const crud = (base) => ({
  list: (params) => api.get(`${base}/admin/all`, { params: { limit: 1000, ...params } }),
  create: (formData) => api.post(`${base}/admin`, formData),
  update: (id, formData) => api.patch(`${base}/admin/${id}`, formData),
  setStatus: (id, isActive) => api.patch(`${base}/admin/${id}/status`, { isActive }),
  remove: (id) => api.delete(`${base}/admin/${id}`),
});

export const bannersApi = crud("/banners");
export const categoriesApi = crud("/categories");
export const subcategoriesApi = crud("/subcategories");
export const productsApi = { ...crud("/products"), get: (id) => api.get(`/products/admin/${id}`) };

export const inquiriesApi = {
  list: (params) => api.get("/inquiries/admin/all", { params: { limit: 1000, ...params } }),
  stats: () => api.get("/inquiries/admin/stats"),
  update: (id, body) => api.patch(`/inquiries/admin/${id}`, body),
  remove: (id) => api.delete(`/inquiries/admin/${id}`),
};

export const authApi = {
  adminLogin: (body) => api.post("/auth/admin/login", body),
  me: () => api.get("/auth/admin/me"),
  logout: () => api.post("/auth/logout", { refreshToken: localStorage.getItem("fx_refresh") }),
};
