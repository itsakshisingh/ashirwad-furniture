import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { categoriesApi, productsApi, subcategoriesApi } from "../api/services";
import { errMsg, getList, idOf, pickItem, slugify } from "../utils/helpers";
import { Field, ImageUploader, PageLoader, Spinner } from "../components/ui";

const EMPTY = {
  name: "", slug: "", sku: "", shortDescription: "", description: "", category: "", subcategory: "",
  pricing: { price: "", salePrice: "", currency: "INR", taxPercentage: 0 },
  inventory: { stockQuantity: 0, lowStockThreshold: 5, stockStatus: "in_stock", allowBackorder: false },
  specifications: {
    brand: "", material: "", upholstery: "", color: "", seatingCapacity: "", weight: "", weightUnit: "kg",
    assemblyRequired: false, warranty: "", dimensions: { length: "", width: "", height: "", unit: "cm" },
  },
  variants: [],
  delivery: { freeDelivery: false, estimatedDays: "", returnable: true, returnWindowDays: 7 },
  tags: "", isFeatured: false, isBestSeller: false, isActive: true, displayOrder: 0,
  seo: { metaTitle: "", metaDescription: "" },
};

const num = (v) => (v === "" || v == null ? null : Number(v));

// ⚠️ Backend ko data kis format me chahiye wo yahin badalna hai.
// Abhi: simple fields normal text, nested objects JSON string me, images "images" field me.
function buildFormData(p, files) {
  const fd = new FormData();
  ["name", "slug", "sku", "shortDescription", "description", "category", "displayOrder"].forEach((k) => fd.append(k, p[k]));
  if (p.subcategory) fd.append("subcategory", p.subcategory);
  ["isFeatured", "isBestSeller", "isActive"].forEach((k) => fd.append(k, String(p[k])));

  const s = p.specifications;
  const json = {
    pricing: { ...p.pricing, price: num(p.pricing.price), salePrice: num(p.pricing.salePrice), taxPercentage: num(p.pricing.taxPercentage) ?? 0 },
    inventory: { ...p.inventory, stockQuantity: num(p.inventory.stockQuantity) ?? 0, lowStockThreshold: num(p.inventory.lowStockThreshold) ?? 5 },
    specifications: {
      ...s, seatingCapacity: num(s.seatingCapacity), weight: num(s.weight),
      dimensions: { ...s.dimensions, length: num(s.dimensions.length), width: num(s.dimensions.width), height: num(s.dimensions.height) },
    },
    variants: p.variants.filter((v) => v.name.trim()).map((v) => ({ name: v.name.trim(), options: v.options.split(",").map((o) => o.trim()).filter(Boolean) })),
    delivery: { ...p.delivery, returnWindowDays: num(p.delivery.returnWindowDays) ?? 0 },
    tags: p.tags.split(",").map((t) => t.trim()).filter(Boolean),
    seo: p.seo,
  };
  Object.entries(json).forEach(([k, v]) => fd.append(k, JSON.stringify(v)));
  files.forEach((f) => fd.append("images", f));
  return fd;
}

function fromServer(d) {
  const merge = (base, src) =>
    Object.fromEntries(Object.entries(base).map(([k, v]) => [k, v && typeof v === "object" && !Array.isArray(v) ? merge(v, src?.[k] || {}) : src?.[k] ?? v]));
  const m = merge(EMPTY, d);
  return {
    ...m, category: idOf(d.category), subcategory: idOf(d.subcategory),
    tags: (d.tags || []).join(", "),
    variants: (d.variants || []).map((v) => ({ name: v.name || "", options: (v.options || []).join(", ") })),
  };
}

function Section({ title, hint, children }) {
  return (
    <section className="card">
      <div className="border-b border-stone-200 px-5 py-3">
        <h2 className="font-bold">{title}</h2>
        {hint && <p className="text-xs text-stone-500">{hint}</p>}
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [p, setP] = useState(EMPTY);
  const [files, setFiles] = useState([]);
  const [existing, setExisting] = useState([]);
  const [cats, setCats] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(isEdit);

  useEffect(() => {
    (async () => {
      try {
        const [c, s] = await Promise.all([categoriesApi.list(), subcategoriesApi.list()]);
        setCats(getList(c)); setSubs(getList(s));
        if (isEdit) {
          const d = pickItem(await productsApi.get(id));
          setP(fromServer(d)); setExisting(d.images || []);
        }
      } catch (e) { toast.error(errMsg(e)); }
      finally { setLoading(false); }
    })();
  }, [id, isEdit]);

  // path = "pricing.price" jaisa; immutable update
  const set = (path, value) =>
    setP((prev) => {
      const next = structuredClone(prev);
      const keys = path.split(".");
      let o = next;
      keys.slice(0, -1).forEach((k) => (o = o[k]));
      o[keys.at(-1)] = value;
      if (path === "name" && !slugTouched) next.slug = slugify(value);
      if (path === "category") next.subcategory = "";
      return next;
    });
  const get = (path) => path.split(".").reduce((o, k) => o?.[k], p);
  const bind = (path) => ({ value: get(path) ?? "", onChange: (e) => set(path, e.target.value) });
  const check = (path, label) => (
    <label className="flex items-center gap-2 pt-1 text-sm">
      <input type="checkbox" className="h-4 w-4 accent-emerald-700" checked={!!get(path)} onChange={(e) => set(path, e.target.checked)} /> {label}
    </label>
  );

  const subOptions = useMemo(() => subs.filter((s) => idOf(s.category) === p.category), [subs, p.category]);

  const submit = async (e) => {
    e.preventDefault();
    if (!isEdit && files.length === 0) return toast.error("Please add at least one product image.");
    setSaving(true);
    try {
      const fd = buildFormData(p, files);
      await (isEdit ? productsApi.update(id, fd) : productsApi.create(fd));
      toast.success(isEdit ? "Product updated" : "Product added");
      navigate("/products");
    } catch (err) { toast.error(errMsg(err)); }
    finally { setSaving(false); }
  };

  if (loading) return <PageLoader />;

  return (
    <form onSubmit={submit} className="space-y-6 pb-24">
      <div>
        <Link to="/products" className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-stone-500 hover:text-ink-900"><ArrowLeft className="h-4 w-4" /> Back to products</Link>
        <h1 className="text-2xl font-extrabold tracking-tight">{isEdit ? "Edit product" : "Add product"}</h1>
      </div>

      <Section title="Basic details">
        <Field label="Product name *" className="sm:col-span-2"><input className="input" required {...bind("name")} /></Field>
        <Field label="SKU *"><input className="input uppercase" required {...bind("sku")} /></Field>
        <Field label="Slug *" hint="Used in the product page URL." className="sm:col-span-2">
          <input className="input" required value={p.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} />
        </Field>
        <Field label="Display order"><input type="number" min="0" className="input" {...bind("displayOrder")} /></Field>
        <Field label="Category *">
          <select className="input" required {...bind("category")}>
            <option value="">Select…</option>
            {cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Subcategory" hint={!p.category ? "Choose a category first." : undefined}>
          <select className="input" disabled={!p.category} {...bind("subcategory")}>
            <option value="">None</option>
            {subOptions.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Short description" className="sm:col-span-2 lg:col-span-3"><input className="input" maxLength={500} {...bind("shortDescription")} /></Field>
        <Field label="Full description" className="sm:col-span-2 lg:col-span-3"><textarea className="input min-h-[120px]" maxLength={5000} {...bind("description")} /></Field>
      </Section>

      <Section title="Images" hint="The first image is used as the main picture.">
        <div className="sm:col-span-2 lg:col-span-3">
          <ImageUploader existing={existing} files={files} onFiles={setFiles} />
          {isEdit && <p className="mt-2 text-xs text-stone-500">Upload new images only if you want to change them.</p>}
        </div>
      </Section>

      <Section title="Pricing">
        <Field label="Price (₹) *"><input type="number" min="0" required className="input" {...bind("pricing.price")} /></Field>
        <Field label="Sale price (₹)"><input type="number" min="0" className="input" {...bind("pricing.salePrice")} /></Field>
        <Field label="Tax (%)"><input type="number" min="0" max="100" className="input" {...bind("pricing.taxPercentage")} /></Field>
      </Section>

      <Section title="Stock">
        <Field label="Quantity in stock"><input type="number" min="0" className="input" {...bind("inventory.stockQuantity")} /></Field>
        <Field label="Low stock alert at"><input type="number" min="0" className="input" {...bind("inventory.lowStockThreshold")} /></Field>
        <Field label="Stock status">
          <select className="input" {...bind("inventory.stockStatus")}>
            <option value="in_stock">In stock</option><option value="low_stock">Low stock</option>
            <option value="out_of_stock">Out of stock</option><option value="discontinued">Discontinued</option>
          </select>
        </Field>
        <div>{check("inventory.allowBackorder", "Allow orders when out of stock")}</div>
      </Section>

      <Section title="Specifications">
        <Field label="Brand"><input className="input" {...bind("specifications.brand")} /></Field>
        <Field label="Material"><input className="input" {...bind("specifications.material")} /></Field>
        <Field label="Upholstery"><input className="input" {...bind("specifications.upholstery")} /></Field>
        <Field label="Color"><input className="input" {...bind("specifications.color")} /></Field>
        <Field label="Seating capacity"><input type="number" min="0" className="input" {...bind("specifications.seatingCapacity")} /></Field>
        <Field label="Warranty"><input className="input" placeholder="e.g. 1 year" {...bind("specifications.warranty")} /></Field>
        <Field label="Length / Width / Height" className="sm:col-span-2">
          <div className="flex gap-2">
            {["length", "width", "height"].map((d) => <input key={d} type="number" min="0" placeholder={d} className="input" {...bind(`specifications.dimensions.${d}`)} />)}
            <select className="input !w-24" {...bind("specifications.dimensions.unit")}><option>cm</option><option>inch</option><option>mm</option></select>
          </div>
        </Field>
        <Field label="Weight">
          <div className="flex gap-2">
            <input type="number" min="0" className="input" {...bind("specifications.weight")} />
            <select className="input !w-24" {...bind("specifications.weightUnit")}><option>kg</option><option>g</option></select>
          </div>
        </Field>
        <div>{check("specifications.assemblyRequired", "Assembly required")}</div>
      </Section>

      <section className="card">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3">
          <div><h2 className="font-bold">Variants</h2><p className="text-xs text-stone-500">Example: Color → Grey, Blue, Beige</p></div>
          <button type="button" className="btn-ghost" onClick={() => set("variants", [...p.variants, { name: "", options: "" }])}><Plus className="h-4 w-4" /> Add variant</button>
        </div>
        <div className="space-y-3 p-5">
          {p.variants.length === 0 && <p className="text-sm text-stone-500">No variants. Add one if the product comes in different colors or sizes.</p>}
          {p.variants.map((v, i) => (
            <div key={i} className="flex flex-col gap-2 sm:flex-row">
              <input className="input sm:w-48" placeholder="Name (e.g. Color)" value={v.name} onChange={(e) => set(`variants.${i}.name`, e.target.value)} />
              <input className="input flex-1" placeholder="Options, separated by commas" value={v.options} onChange={(e) => set(`variants.${i}.options`, e.target.value)} />
              <button type="button" className="btn-ghost !text-red-600" onClick={() => set("variants", p.variants.filter((_, j) => j !== i))} aria-label="Remove variant"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </section>

      <Section title="Delivery and returns">
        <Field label="Estimated delivery"><input className="input" placeholder="e.g. 5-7 days" {...bind("delivery.estimatedDays")} /></Field>
        <Field label="Return window (days)"><input type="number" min="0" className="input" {...bind("delivery.returnWindowDays")} /></Field>
        <div className="space-y-2">{check("delivery.freeDelivery", "Free delivery")}{check("delivery.returnable", "Returnable")}</div>
      </Section>

      

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-7xl justify-end gap-2">
          <Link to="/products" className="btn-ghost">Cancel</Link>
          <button className="btn-primary" disabled={saving}>{saving && <Spinner className="h-4 w-4" />}{isEdit ? "Save changes" : "Add product"}</button>
        </div>
      </div>
    </form>
  );
}
