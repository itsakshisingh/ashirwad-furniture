import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Armchair, Layers, FolderTree, Image, MessageSquareQuote } from "lucide-react";
import { bannersApi, categoriesApi, inquiriesApi, productsApi, subcategoriesApi } from "../api/services";
import { formatDate, getList } from "../utils/helpers";
import { Badge, PageHeader, PageLoader } from "../components/ui";
import { INQUIRY_TONES } from "./Inquiries";

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.allSettled([productsApi.list(), categoriesApi.list(), subcategoriesApi.list(), bannersApi.list(), inquiriesApi.list()]).then((r) => {
      const l = r.map((x) => (x.status === "fulfilled" ? getList(x.value) : []));
      setData({ products: l[0], categories: l[1], subcategories: l[2], banners: l[3], inquiries: l[4] });
    });
  }, []);

  if (!data) return <PageLoader />;
  const pending = data.inquiries.filter((i) => i.status === "pending").length;
  const lowStock = data.products.filter((p) => ["low_stock", "out_of_stock"].includes(p.inventory?.stockStatus));
  const recent = [...data.inquiries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);

  const stats = [
    { label: "Products", value: data.products.length, icon: Armchair, to: "/products" },
    { label: "Categories", value: data.categories.length, icon: Layers, to: "/categories" },
    { label: "Subcategories", value: data.subcategories.length, icon: FolderTree, to: "/subcategories" },
    { label: "Banners", value: data.banners.length, icon: Image, to: "/banners" },
    { label: "New inquiries", value: pending, icon: MessageSquareQuote, to: "/inquiries", highlight: pending > 0 },
  ];

  return (
    <>
      <PageHeader title="Dashboard" subtitle="A quick look at your store." />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {stats.map(({ label, value, icon: Icon, to, highlight }) => (
          <Link key={label} to={to} className={`card p-4 transition hover:border-brass-500 ${highlight ? "border-brass-500 bg-brass-50" : ""}`}>
            <Icon className="h-5 w-5 text-brass-600" />
            <p className="mt-3 text-2xl font-extrabold">{value}</p>
            <p className="text-sm text-stone-500">{label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="card lg:col-span-3">
          <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
            <h2 className="font-bold">Recent inquiries</h2>
            <Link to="/inquiries" className="text-sm font-semibold text-brass-600 hover:underline">View all</Link>
          </div>
          {recent.length === 0 ? <p className="p-6 text-sm text-stone-500">No inquiries yet. They will show up here when customers send one.</p> : (
            <ul className="divide-y divide-stone-100">
              {recent.map((i) => (
                <li key={i._id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{i.customerName || "Guest customer"}</p>
                    <p className="truncate text-xs text-stone-500">{i.productSnapshot?.name || i.product?.name || "Product"} · {formatDate(i.createdAt)}</p>
                  </div>
                  <Badge tone={INQUIRY_TONES[i.status]}>{i.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card lg:col-span-2">
          <div className="border-b border-stone-200 px-4 py-3"><h2 className="font-bold">Stock needs attention</h2></div>
          {lowStock.length === 0 ? <p className="p-6 text-sm text-stone-500">All products have enough stock.</p> : (
            <ul className="divide-y divide-stone-100">
              {lowStock.slice(0, 6).map((p) => (
                <li key={p._id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <Link to={`/products/${p._id}/edit`} className="min-w-0 truncate text-sm font-semibold hover:underline">{p.name}</Link>
                  <Badge tone={p.inventory.stockStatus === "out_of_stock" ? "red" : "amber"}>
                    {p.inventory.stockStatus === "out_of_stock" ? "Out of stock" : `${p.inventory.stockQuantity} left`}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
