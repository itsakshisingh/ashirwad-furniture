import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import toast from "react-hot-toast";
import { bannersApi, categoriesApi, subcategoriesApi } from "../api/services";
import { errMsg, formatDate, getList, idOf, imgUrl, slugify } from "../utils/helpers";
import { ConfirmDialog, EmptyState, Field, ImageUploader, Modal, PageHeader, PageLoader, Pagination, Spinner, Toggle } from "../components/ui";

const PER_PAGE = 10;

const CONFIGS = {
  banners: {
    title: "Banners", singular: "banner", api: bannersApi, nameKey: "title", imageField: "image", imagesKey: "image", mobileImageField: "mobileImage",
    subtitle: "Homepage sliders shown to customers.",
    meta: (r) => r.subtitle ? r.subtitle.slice(0, 40) : "No subtitle",
    fields: [
      { name: "title", label: "Title", required: true, span2: true },
      { name: "subtitle", label: "Subtitle", type: "textarea", span2: true },
      { name: "displayOrder", label: "Display order", type: "number", hint: "Lower number shows first." },
      { name: "mobileImage", label: "Mobile image", type: "imagefile", hint: "Optional single image for mobile screens. Upload from your computer.", span2: true },
      { name: "isActive", label: "Show on website", type: "checkbox", def: true },
    ],
  },
  categories: {
    title: "Categories", singular: "category", api: categoriesApi, nameKey: "name", imageField: "image", imagesKey: "image",
    subtitle: "Top-level furniture groups, e.g. Sofas, Beds.",
    meta: (r) => r.slug,
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "slug", label: "Slug", required: true, slugFrom: "name", hint: "Used in the website URL." },
      { name: "description", label: "Description", type: "textarea", span2: true },
      { name: "displayOrder", label: "Display order", type: "number" },
      { name: "isActive", label: "Show on website", type: "checkbox", def: true },
    ],
  },
  subcategories: {
    title: "Subcategories", singular: "subcategory", api: subcategoriesApi, nameKey: "name", imageField: "images", imagesKey: "images",
    subtitle: "Narrower groups inside a category, e.g. L-shape sofas.", lookups: ["categories"],
    meta: (r) => r.category?.name || "—",
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "slug", label: "Slug", required: true, slugFrom: "name" },
      { name: "category", label: "Category", type: "select", options: "categories", required: true },
      { name: "displayOrder", label: "Display order", type: "number" },
      { name: "description", label: "Description", type: "textarea", span2: true },
      { name: "isActive", label: "Show on website", type: "checkbox", def: true },
    ],
  },
};

function ResourcePage({ cfg }) {
  const [rows, setRows] = useState([]);
  const [lookups, setLookups] = useState({ categories: [] });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // {} = new
  const [form, setForm] = useState({});
  const [files, setFiles] = useState([]);
  const [mobileImageFile, setMobileImageFile] = useState(null); // single file for mobileImage
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, cats] = await Promise.all([
        cfg.api.list(),
        cfg.lookups ? categoriesApi.list() : Promise.resolve(null),
      ]);
      setRows(getList(res));
      if (cats) setLookups({ categories: getList(cats) });
    } catch (e) { toast.error(errMsg(e)); }
    finally { setLoading(false); }
  }, [cfg]);

  useEffect(() => { setPage(1); setQ(""); load(); }, [load]);

  const filtered = useMemo(
    () => rows.filter((r) => (r[cfg.nameKey] || "").toLowerCase().includes(q.toLowerCase())),
    [rows, q, cfg]
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const openForm = (row = {}) => {
    const init = {};
    cfg.fields.forEach((f) => {
      if (f.type === "imagefile") return; // handled by separate state
      let v = row[f.name];
      if (f.type === "select") v = idOf(v);
      if (f.type === "date" && v) v = String(v).slice(0, 10);
      if (f.type === "checkbox") v = v ?? f.def ?? false;
      init[f.name] = v ?? f.def ?? "";
    });
    setForm(init); setFiles([]); setMobileImageFile(null); setSlugTouched(!!row._id); setEditing(row);
  };

  const setField = (name, value, f) => {
    setForm((p) => {
      const next = { ...p, [name]: value };
      cfg.fields.forEach((x) => {
        if (x.slugFrom === name && !slugTouched) next[x.name] = slugify(value);
      });
      return next;
    });
    if (f?.name === "slug") setSlugTouched(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const isNew = !editing._id;
    if (isNew && files.length === 0 && cfg.imageField) return toast.error("Please add at least one image.");
    const fd = new FormData();
    cfg.fields.forEach((f) => {
      if (f.type === "imagefile") return; // handled separately below
      const v = form[f.name];
      if ((f.type === "select" || f.type === "date") && v === "") return;
      fd.append(f.name, typeof v === "boolean" ? String(v) : v);
    });
    files.forEach((file) => fd.append(cfg.imageField, file));
    // append mobileImage file if banner config and file chosen
    if (cfg.mobileImageField && mobileImageFile) {
      fd.append(cfg.mobileImageField, mobileImageFile);
    }
    setSaving(true);
    try {
      await (isNew ? cfg.api.create(fd) : cfg.api.update(editing._id, fd));
      toast.success(isNew ? `${cfg.singular} added` : `${cfg.singular} updated`);
      setEditing(null);
      load();
    } catch (err) { toast.error(errMsg(err)); }
    finally { setSaving(false); }
  };

  const toggle = async (row, val) => {
    setRows((rs) => rs.map((r) => (r._id === row._id ? { ...r, isActive: val } : r)));
    try { await cfg.api.setStatus(row._id, val); toast.success(val ? "Now visible" : "Now hidden"); }
    catch (e) { toast.error(errMsg(e)); load(); }
  };

  const remove = async () => {
    setSaving(true);
    try { await cfg.api.remove(deleting._id); toast.success(`${cfg.singular} deleted`); setDeleting(null); load(); }
    catch (e) { toast.error(errMsg(e)); }
    finally { setSaving(false); }
  };

  const selectOptions = (f) =>
    f.options === "categories"
      ? lookups.categories.filter((c) => c._id !== editing?._id).map((c) => ({ value: c._id, label: c.name }))
      : f.options;

  const rawExisting = editing?._id ? (editing[cfg.imagesKey] ?? editing.images ?? editing.image ?? []) : [];
  const existingImages = [].concat(rawExisting || []).filter(Boolean);

  return (
    <>
      <PageHeader title={cfg.title} subtitle={cfg.subtitle}
        action={<button className="btn-primary" onClick={() => openForm()}><Plus className="h-4 w-4" /> Add {cfg.singular}</button>} />

      <div className="card overflow-hidden">
        <div className="border-b border-stone-200 p-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input className="input pl-9" placeholder={`Search ${cfg.title.toLowerCase()}`} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
        </div>

        {loading ? <PageLoader /> : visible.length === 0 ? (
          <EmptyState title={q ? "No results found" : `No ${cfg.title.toLowerCase()} yet`}
            text={q ? "Try a different search word." : `Add your first ${cfg.singular} to show it on the website.`}
            action={!q && <button className="btn-primary" onClick={() => openForm()}><Plus className="h-4 w-4" /> Add {cfg.singular}</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">{cfg.singular[0].toUpperCase() + cfg.singular.slice(1)}</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">Details</th>
                  <th className="hidden px-4 py-3 font-semibold sm:table-cell">Order</th>
                  <th className="px-4 py-3 font-semibold">Visible</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {visible.map((r) => {
                  const rawImg = r[cfg.imagesKey] ?? r.images ?? r.image ?? r.thumbnail;
                  const img = Array.isArray(rawImg) ? rawImg[0] : rawImg;
                  const resolvedImg = img ? imgUrl(img) : "";
                  return (
                    <tr key={r._id} className="hover:bg-stone-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-100 flex items-center justify-center text-stone-400">
                            {resolvedImg ? (
                              <img
                                src={resolvedImg}
                                alt=""
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  if (e.currentTarget.nextElementSibling) {
                                    e.currentTarget.nextElementSibling.style.display = "flex";
                                  }
                                }}
                              />
                            ) : null}
                            <span
                              className="text-[11px] font-medium text-stone-400 select-none"
                              style={{ display: resolvedImg ? "none" : "flex" }}
                            >
                              No img
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{r[cfg.nameKey]}</p>
                            <p className="truncate text-xs text-stone-500 md:hidden">{cfg.meta(r)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-stone-600 md:table-cell">
                        {cfg.meta(r)}
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">{r.displayOrder}</td>
                      <td className="px-4 py-3"><Toggle checked={!!r.isActive} onChange={(v) => toggle(r, v)} label="Visible on website" /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button className="rounded-lg p-2 text-stone-600 hover:bg-stone-100" onClick={() => openForm(r)} aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                          <button className="rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => setDeleting(r)} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
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

      <Modal open={!!editing} onClose={() => setEditing(null)} wide
        title={editing?._id ? `Edit ${cfg.singular}` : `Add ${cfg.singular}`}
        footer={<>
          <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
          <button form="resource-form" type="submit" className="btn-primary" disabled={saving}>{saving && <Spinner className="h-4 w-4" />}Save {cfg.singular}</button>
        </>}>
        <form id="resource-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {cfg.fields.map((f) => (
            <Field key={f.name} label={f.label + (f.required ? " *" : "")} hint={f.hint} className={f.span2 ? "sm:col-span-2" : ""}>
              {f.type === "imagefile" ? (
                // Dedicated single-file uploader for mobileImage
                <div className="space-y-2">
                  {/* Show existing mobile image preview when editing */}
                  {editing?._id && editing?.mobileImage && !mobileImageFile && (
                    <div className="relative inline-block">
                      <img src={imgUrl(editing.mobileImage)} alt="Current mobile image" className="h-24 w-40 rounded-lg object-cover border border-stone-200" />
                      <p className="text-xs text-stone-400 mt-1">Current — upload new to replace</p>
                    </div>
                  )}
                  {mobileImageFile && (
                    <div className="relative inline-block">
                      <img src={URL.createObjectURL(mobileImageFile)} alt="New mobile image" className="h-24 w-40 rounded-lg object-cover border-2 border-emerald-400" />
                      <button type="button" onClick={() => setMobileImageFile(null)}
                        className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs font-bold leading-none">
                        ×
                      </button>
                    </div>
                  )}
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-600 hover:border-brass-500 hover:bg-brass-50 transition-colors">
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) setMobileImageFile(f); e.target.value = ""; }} />
                    📱 {mobileImageFile ? "Change mobile image" : editing?.mobileImage ? "Replace mobile image" : "Upload mobile image"}
                  </label>
                </div>
              ) : f.type === "textarea" ? (
                <textarea className="input min-h-[80px]" value={form[f.name] ?? ""} onChange={(e) => setField(f.name, e.target.value, f)} />
              ) : f.type === "select" ? (
                <select className="input" required={f.required} value={form[f.name] ?? ""} onChange={(e) => setField(f.name, e.target.value, f)}>
                  <option value="">{f.optional ? "None" : "Select…"}</option>
                  {selectOptions(f).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === "checkbox" ? (
                <label className="flex items-center gap-2 pt-1 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-emerald-700" checked={!!form[f.name]} onChange={(e) => setField(f.name, e.target.checked, f)} /> Yes
                </label>
              ) : (
                <input className="input" type={f.type || "text"} min={f.type === "number" ? 0 : undefined} required={f.required}
                  value={form[f.name] ?? ""} onChange={(e) => setField(f.name, e.target.value, f)} />
              )}
            </Field>
          ))}
          <Field label={`Images${editing?._id ? "" : " *"}`} className="sm:col-span-2"
            hint={editing?._id ? "Upload new images only if you want to change them." : "You can add up to 10 images."}>
            <ImageUploader existing={existingImages} files={files} onFiles={setFiles} />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} busy={saving}
        title={`Delete ${cfg.singular}?`} text={`"${deleting?.[cfg.nameKey]}" will be removed permanently. This cannot be undone.`} />
    </>
  );
}

export const BannersPage = () => <ResourcePage cfg={CONFIGS.banners} />;

export function CategoriesPage() {
  const [tab, setTab] = useState("categories");
  return (
    <div>
      {/* Tab switcher */}
      <div className="mb-6 flex gap-1 rounded-xl bg-stone-100 p-1 w-fit">
        <button
          onClick={() => setTab("categories")}
          className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${
            tab === "categories"
              ? "bg-white shadow text-stone-900"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          Categories
        </button>
        <button
          onClick={() => setTab("subcategories")}
          className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${
            tab === "subcategories"
              ? "bg-white shadow text-stone-900"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          Subcategories
        </button>
      </div>

      {/* Content */}
      {tab === "categories" ? (
        <ResourcePage cfg={CONFIGS.categories} />
      ) : (
        <ResourcePage cfg={CONFIGS.subcategories} />
      )}
    </div>
  );
}

