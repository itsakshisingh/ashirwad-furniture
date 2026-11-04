import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Trash2, Search } from "lucide-react";
import toast from "react-hot-toast";
import { inquiriesApi } from "../api/services";
import { errMsg, formatDate, formatPrice, getList, imgUrl } from "../utils/helpers";
import { Badge, ConfirmDialog, EmptyState, Field, Modal, PageHeader, PageLoader, Pagination, Spinner } from "../components/ui";

export const INQUIRY_STATUSES = ["pending", "contacted", "responded", "accepted", "rejected", "completed"];
export const INQUIRY_TONES = { pending: "amber", contacted: "blue", responded: "purple", accepted: "green", rejected: "red", completed: "gray" };
const PER_PAGE = 10;

export default function Inquiries() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(getList(await inquiriesApi.list())); } catch (e) { toast.error(errMsg(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => rows.filter((r) =>
    (status === "all" || r.status === status) &&
    [r.customerName, r.customerEmail, r.customerPhone, r.productSnapshot?.name].join(" ").toLowerCase().includes(q.toLowerCase())
  ), [rows, status, q]);
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const openRow = (r) => { setOpen(r); setForm({ status: r.status, quotedPrice: r.quotedPrice ?? "", adminNotes: r.adminNotes || "" }); };

  const save = async () => {
    setSaving(true);
    try {
      await inquiriesApi.update(open._id, { status: form.status, adminNotes: form.adminNotes, quotedPrice: form.quotedPrice === "" ? null : Number(form.quotedPrice) });
      toast.success("Inquiry updated"); setOpen(null); load();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  const remove = async () => {
    setSaving(true);
    try { await inquiriesApi.remove(deleting._id); toast.success("Inquiry deleted"); setDeleting(null); load(); }
    catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  const snap = open?.productSnapshot;

  return (
    <>
      <PageHeader title="Inquiries" subtitle="Quote requests from customers." />
      <div className="overflow-hidden card">
        <div className="p-4 space-y-3 border-b border-stone-200">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input className="input pl-9" placeholder="Search name, email, phone or product" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          <div className="flex gap-2 pb-1 overflow-x-auto">
            {["all", ...INQUIRY_STATUSES].map((s) => (
              <button key={s} onClick={() => { setStatus(s); setPage(1); }}
                className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold capitalize ${status === s ? "bg-ink-800 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}>
                {s}{s !== "all" && ` (${rows.filter((r) => r.status === s).length})`}
              </button>
            ))}
          </div>
        </div>

        {loading ? <PageLoader /> : visible.length === 0 ? <EmptyState title="No inquiries found" text="Change the filter or search to see more." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-50 text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">Product</th>
                  <th className="hidden px-4 py-3 font-semibold sm:table-cell">Date</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {visible.map((r) => (
                  <tr key={r._id} className="cursor-pointer hover:bg-stone-50/60" onClick={() => openRow(r)}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{r.customerName || "Guest customer"}</p>
                      <p className="text-xs text-stone-500">{r.customerPhone || r.customerEmail || "—"}</p>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <div className="flex items-center gap-2.5">
                        {(() => {
                          const img = r.product?.thumbnail || r.productSnapshot?.images?.[0] || r.product?.images?.[0];
                          const src = img ? imgUrl(img) : "";
                          return (
                            <div className="relative flex items-center justify-center w-10 h-10 overflow-hidden border rounded-lg shrink-0 bg-stone-100 text-stone-400 border-stone-200">
                              {src ? (
                                <img
                                  src={src}
                                  alt=""
                                  className="object-cover w-full h-full"
                                  onError={(e) => {
                                    const fallback = imgUrl("/uploads/products/02-furnex-class-pro-ms-three-seater-school-desk.jpg");
                                    if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
                                  }}
                                />
                              ) : (
                                <span className="text-[9px] font-medium text-stone-400 select-none">No img</span>
                              )}
                            </div>
                          );
                        })()}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{r.productSnapshot?.name || r.product?.name || "—"}</p>
                          <span className="text-xs text-stone-400">Qty: {r.quantity}</span>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">{formatDate(r.createdAt)}</td>
                    <td className="px-4 py-3"><Badge tone={INQUIRY_TONES[r.status]}>{r.status}</Badge></td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button className="p-2 rounded-lg text-stone-600 hover:bg-stone-100" onClick={() => openRow(r)} aria-label="View"><Eye className="w-4 h-4" /></button>
                        <button className="p-2 text-red-600 rounded-lg hover:bg-red-50" onClick={() => setDeleting(r)} aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pages={pages} onChange={setPage} />
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title="Inquiry details" wide
        footer={<>
          <button className="btn-ghost" onClick={() => setOpen(null)}>Close</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving && <Spinner className="w-4 h-4" />}Save changes</button>
        </>}>
        {open && (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-4">
              <div className="p-4 text-sm rounded-lg bg-stone-50">
                <p className="mb-2 font-bold">Customer</p>
                <p>{open.customerName || "Guest customer"}</p>
                {open.customerPhone && <p><a className="text-brass-600 hover:underline" href={`tel:${open.customerPhone}`}>{open.customerPhone}</a></p>}
                {open.customerEmail && <p><a className="text-brass-600 hover:underline" href={`mailto:${open.customerEmail}`}>{open.customerEmail}</a></p>}
                {open.customerAddress && <p className="mt-1 text-stone-600">{open.customerAddress}</p>}
              </div>
              <div className="p-4 text-sm rounded-lg bg-stone-50">
                <p className="mb-2 font-bold">Product</p>
                <div className="flex gap-3">
                  {(() => {
                    const img = open.product?.thumbnail || snap?.images?.[0] || open.product?.images?.[0];
                    if (!img) return null;
                    return (
                      <img
                        src={imgUrl(img)}
                        alt=""
                        className="object-cover w-16 h-16 border rounded-lg border-stone-200"
                        onError={(e) => {
                          const fallback = imgUrl("/uploads/products/02-furnex-class-pro-ms-three-seater-school-desk.jpg");
                          if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
                        }}
                      />
                    );
                  })()}
                  <div>
                    <p className="font-semibold">{snap?.name || open.product?.name}</p>
                    {snap?.sku && <p className="text-xs text-stone-500">SKU {snap.sku}</p>}
                    <p>{formatPrice(snap?.pricing?.salePrice ?? snap?.pricing?.price, snap?.pricing?.currency)}</p>
                  </div>
                </div>
                <p className="mt-2 text-stone-600">Quantity: {open.quantity}{open.selectedVariant && ` · ${open.selectedVariant}`}</p>
              </div>
              {open.message && (
                <div className="p-4 text-sm rounded-lg bg-stone-50"><p className="mb-1 font-bold">Customer message</p><p className="whitespace-pre-wrap text-stone-700">{open.message}</p></div>
              )}
            </div>
            <div className="space-y-4">
              <Field label="Status">
                <select className="capitalize input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {INQUIRY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Quoted price (₹)"><input type="number" min="0" className="input" value={form.quotedPrice} onChange={(e) => setForm({ ...form, quotedPrice: e.target.value })} /></Field>
              <Field label="Internal notes" hint="Only admins can see these."><textarea className="input min-h-[120px]" value={form.adminNotes} onChange={(e) => setForm({ ...form, adminNotes: e.target.value })} /></Field>
              <p className="text-xs text-stone-500">Received on {formatDate(open.createdAt)}</p>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} busy={saving}
        title="Delete inquiry?" text="This inquiry will be removed permanently." />
    </>
  );
}
