import { API_ORIGIN } from "../api/client";

// Backend ke alag-alag response shapes se array nikalta hai
export function getList(res) {
  const find = (o) => {
    if (Array.isArray(o)) return o;
    if (o && typeof o === "object") {
      for (const v of Object.values(o)) if (Array.isArray(v)) return v;
      for (const v of Object.values(o)) {
        const r = find(v);
        if (r) return r;
      }
    }
    return null;
  };
  return find(res.data?.data ?? res.data) || [];
}

export function errMsg(err, fallback = "Something went wrong. Please try again.") {
  return err?.response?.data?.message || err?.message || fallback;
}

export function imgUrl(path) {
  if (!path) return "";
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  return `${API_ORIGIN}/${String(path).replace(/^\/+/, "")}`;
}

export const idOf = (v) => (v && typeof v === "object" ? v._id : v) || "";

export const slugify = (s = "") =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export const formatPrice = (n, currency = "INR") =>
  n == null || n === "" ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

export const pickItem = (res) => {
  const d = res.data?.data ?? res.data;
  if (d && !d._id && typeof d === "object") {
    const inner = Object.values(d).find((v) => v && typeof v === "object" && v._id);
    if (inner) return inner;
  }
  return d;
};
