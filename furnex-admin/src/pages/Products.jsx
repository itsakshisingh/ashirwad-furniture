import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Search, Star } from "lucide-react";
import toast from "react-hot-toast";
import { categoriesApi, productsApi } from "../api/services";
import { errMsg, formatPrice, getList, idOf, imgUrl } from "../utils/helpers";
import { Badge, ConfirmDialog, EmptyState, PageHeader, PageLoader, Pagination, Toggle } from "../components/ui";

const PER_PAGE = 10;
const STOCK = { in_stock: ["green", "In stock"], low_stock: ["amber", "Low stock"], out_of_stock: ["red", "Out of stock"], discontinued: ["gray", "Discontinued"] };

export default function Products() {
  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([productsApi.list(), categoriesApi.list()]);
      setRows(getList(p)); setCats(getList(c));
    } catch (e) { toast.error(errMsg(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => rows.filter((p) =>
    (!cat || idOf(p.category) === cat) &&
    `${p.name} ${p.sku}`.toLowerCase().includes(q.toLowerCase())
  ), [rows, q, cat]);
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const toggle = async (p, val) => {
    setRows((rs) => rs.map((r) => (r._id === p._id ? { ...r, isActive: val } : r)));
    try { await productsApi.setStatus(p._id, val); toast.success(val ? "Now visible" : "Now hidden"); }
    catch (e) { toast.error(errMsg(e)); load(); }
  };

  const remove = async () => {
    setBusy(true);
    try { await productsApi.remove(deleting._id); toast.success("Product deleted"); setDeleting(null); load(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const addBtn = <Link to="/products/new" className="btn-primary"><Plus className="h-4 w-4" /> Add product</Link>;

  return (
    <>
      <PageHeader title="Products" subtitle="Everything in your catalogue." action={addBtn} />
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-stone-200 p-4 sm:flex-row">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input className="input pl-9" placeholder="Search by name or SKU" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          <select className="input sm:w-56" value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }}>
            <option value="">All categories</option>
            {cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>

        {loading ? <PageLoader /> : visible.length === 0 ? (
          <EmptyState title={q || cat ? "No products found" : "No products yet"} text={q || cat ? "Try a different search or category." : "Add your first product to start selling."} action={!q && !cat && addBtn} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="hidden px-4 py-3 font-semibold lg:table-cell">Category</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">Stock</th>
                  <th className="px-4 py-3 font-semibold">Visible</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {visible.map((p) => {
                  const [tone, label] = STOCK[p.inventory?.stockStatus] || STOCK.in_stock;
                  const img = p.thumbnail || p.images?.[0];
                  return (
                    <tr key={p._id} className="hover:bg-stone-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-stone-100">{img && <img src={imgUrl(img)} alt="" className="h-full w-full object-cover" />}</div>
                          <div className="min-w-0">
                            <p className="flex items-center gap-1 truncate font-semibold">{p.name}{p.isFeatured && <Star className="h-3.5 w-3.5 fill-brass-500 text-brass-500" />}</p>
                            <p className="text-xs text-stone-500">{p.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-stone-600 lg:table-cell">{p.category?.name || "—"}</td>
                      <td className="px-4 py-3">
                        {p.pricing?.salePrice ? (<><span className="font-semibold">{formatPrice(p.pricing.salePrice)}</span> <span className="text-xs text-stone-400 line-through">{formatPrice(p.pricing.price)}</span></>) : <span className="font-semibold">{formatPrice(p.pricing?.price)}</span>}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell"><Badge tone={tone}>{label}</Badge> <span className="text-xs text-stone-500">{p.inventory?.stockQuantity}</span></td>
                      <td className="px-4 py-3"><Toggle checked={!!p.isActive} onChange={(v) => toggle(p, v)} label="Visible on website" /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Link to={`/products/${p._id}/edit`} className="rounded-lg p-2 text-stone-600 hover:bg-stone-100" aria-label="Edit"><Pencil className="h-4 w-4" /></Link>
                          <button className="rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => setDeleting(p)} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pages={pages} onChange={setPage} />
      </div>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} busy={busy}
        title="Delete product?" text={`"${deleting?.name}" will be removed permanently. This cannot be undone.`} />
    </>
  );
}
