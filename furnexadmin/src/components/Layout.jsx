import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Image, Layers, Armchair, MessageSquareQuote, LogOut, Menu, X, Images, Award, Star, BookOpen, Globe, ExternalLink } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { API_ORIGIN } from "../api/client";
import logo from "../Logo.png";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/banners", label: "Banners", icon: Image },
  { to: "/categories", label: "Categories", icon: Layers },
  { to: "/products", label: "Products", icon: Armchair },
  { to: "/blogs", label: "Blogs", icon: BookOpen },
  { to: "/gallery", label: "Gallery", icon: Images },
  { to: "/product-reviews", label: "Product Reviews", icon: Star },
  { to: "/reviews", label: "Company Stats", icon: Award },
  { to: "/inquiries", label: "Inquiries", icon: MessageSquareQuote },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();

  const sidebar = (
    <div className="flex h-full flex-col bg-ink-900 text-white">
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-md">
            <img src={logo} alt="Ashirwad Furnex" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-extrabold leading-tight truncate">Ashirwad Furnex</p>
            <p className="text-xs text-white/60">Admin panel</p>
          </div>
        </div>
        <button className="rounded p-1 lg:hidden text-white/70 hover:text-white" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-3 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${isActive ? "bg-brass-500 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`}>
            <Icon className="h-5 w-5" /> {label}
          </NavLink>
        ))}

        <div className="pt-2">
          <a
            href={`${API_ORIGIN}/sitemap.xml`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-white/70 border border-white/10 hover:bg-white/10 hover:text-white transition"
          >
            <span className="flex items-center gap-2.5">
              <Globe className="h-4 w-4 text-brass-400" /> Dynamic Sitemap
            </span>
            <ExternalLink className="h-3 w-3 text-white/40" />
          </a>
        </div>
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-semibold">{user?.fullName || "Admin"}</p>
        <p className="mb-3 truncate text-xs text-white/60">{user?.email}</p>
        <button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20">
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%]">{sidebar}</aside>
        </div>
      )}
      {/* Top Header Bar for Desktop & Mobile */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-stone-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-white border border-stone-200 p-1 shadow-xs lg:hidden">
            <img src={logo} alt="Ashirwad Furnex" className="h-full w-full object-contain" />
          </div>
          <p className="font-extrabold text-sm sm:text-base text-ink-900 lg:hidden">Ashirwad Furnex</p>
          <span className="hidden text-xs font-semibold uppercase tracking-wider text-ink-400 lg:inline-block">
            Furnex Admin Workspace
          </span>
        </div>

        {/* Right Header Action Items: Dynamic Sitemap Link + User Status */}
        <div className="flex items-center gap-3">
          <a
            href={`${API_ORIGIN}/sitemap.xml`}
            target="_blank"
            rel="noreferrer"
            title="Open Live Dynamic Sitemap XML"
            className="inline-flex items-center gap-2 rounded-xl border border-brass-200 bg-brass-50/70 px-3.5 py-1.5 text-xs font-semibold text-brass-700 shadow-2xs hover:bg-brass-100 transition"
          >
            <Globe className="h-4 w-4 text-brass-600" />
            <span>Sitemap</span>
            <ExternalLink className="h-3 w-3 text-brass-500" />
          </a>

          <div className="hidden h-5 w-[1px] bg-stone-200 sm:block" />

          <div className="hidden items-center gap-2 text-right sm:flex">
            <div className="text-xs">
              <p className="font-semibold text-ink-900 leading-tight">{user?.fullName || "Admin"}</p>
              <p className="text-[10px] text-ink-400">{user?.email}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brass-100 font-bold text-xs text-brass-700">
              {(user?.fullName?.[0] || "A").toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><Outlet /></main>
    </div>
  );
}
