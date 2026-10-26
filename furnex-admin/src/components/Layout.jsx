import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Image, Layers, Armchair, MessageSquareQuote, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/banners", label: "Banners", icon: Image },
  { to: "/categories", label: "Categories", icon: Layers },
  { to: "/products", label: "Products", icon: Armchair },
  { to: "/inquiries", label: "Inquiries", icon: MessageSquareQuote },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();

  const sidebar = (
    <div className="flex h-full flex-col bg-ink-900 text-white">
      <div className="flex items-center justify-between px-5 py-5">
        <div>
          <p className="text-lg font-extrabold leading-tight">Ashirwad Furnex</p>
          <p className="text-xs text-white/60">Admin panel</p>
        </div>
        <button className="rounded p-1 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${isActive ? "bg-brass-500 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`}>
            <Icon className="h-5 w-5" /> {label}
          </NavLink>
        ))}
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
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3 lg:hidden">
        <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 hover:bg-stone-100" aria-label="Open menu"><Menu className="h-6 w-6" /></button>
        <p className="font-extrabold">Ashirwad Furnex</p>
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><Outlet /></main>
    </div>
  );
}
