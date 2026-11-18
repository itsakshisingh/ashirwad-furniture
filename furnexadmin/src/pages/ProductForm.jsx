import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Palette,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { categoriesApi, productsApi, subcategoriesApi } from "../api/services";
import { errMsg, getList, idOf, imgUrl, pickItem, slugify } from "../utils/helpers";
import { Badge, Field, ImageUploader, PageLoader, Spinner } from "../components/ui";

const EMPTY = {
  name: "",
  slug: "",
  sku: "",
  shortDescription: "",
  description: "",
  category: "",
  subcategory: "",
  pricing: { price: "", salePrice: "", currency: "INR", taxPercentage: 0 },
  inventory: {
    stockQuantity: 0,
    lowStockThreshold: 5,
    stockStatus: "in_stock",
    allowBackorder: false,
  },
  specifications: {
    brand: "",
    material: "",
    upholstery: "",
    color: "",
    seatingCapacity: "",
    weight: "",
    weightUnit: "kg",
    assemblyRequired: false,
    warranty: "",
    dimensions: { length: "", width: "", height: "", unit: "cm" },
  },
  colorVariants: [],
  variants: [],
  delivery: {
    freeDelivery: false,
    estimatedDays: "",
    returnable: true,
    returnWindowDays: 7,
  },
  tags: "",
  isFeatured: false,
  isBestSeller: false,
  isActive: true,
  displayOrder: 0,
  seo: { metaTitle: "", metaDescription: "" },
};

const EMPTY_VARIANT = {
  colorName: "",
  colorHex: "#1a1a1a",
  sku: "",
  price: "",
  mrp: "",
  stockStatus: "in_stock",
  stockQuantity: 0,
  description: "",
  isDefault: false,
  isActive: true,
  existingImages: [],
  newFiles: [],
};

const num = (v) => (v === "" || v == null ? null : Number(v));

function buildFormData(p, files, existing) {
  const fd = new FormData();
  [
    "name",
    "slug",
    "sku",
    "shortDescription",
    "description",
    "category",
    "displayOrder",
  ].forEach((k) => fd.append(k, p[k]));
  if (p.subcategory) fd.append("subcategory", p.subcategory);
  ["isFeatured", "isBestSeller", "isActive"].forEach((k) =>
    fd.append(k, String(p[k]))
  );

  const s = p.specifications;
  const json = {
    pricing: {
      ...p.pricing,
      price: num(p.pricing.price),
      salePrice: num(p.pricing.salePrice),
      taxPercentage: num(p.pricing.taxPercentage) ?? 0,
    },
    inventory: {
      ...p.inventory,
      stockQuantity: num(p.inventory.stockQuantity) ?? 0,
      lowStockThreshold: num(p.inventory.lowStockThreshold) ?? 5,
    },
    specifications: {
      ...s,
      seatingCapacity: num(s.seatingCapacity),
      weight: num(s.weight),
      dimensions: {
        ...s.dimensions,
        length: num(s.dimensions.length),
        width: num(s.dimensions.width),
        height: num(s.dimensions.height),
      },
    },
    variants: p.variants
      .filter((v) => v.name && v.name.trim())
      .map((v) => ({
        name: v.name.trim(),
        options: (v.options || "")
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean),
      })),
    delivery: {
      ...p.delivery,
      returnWindowDays: num(p.delivery.returnWindowDays) ?? 0,
    },
    tags: p.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    seo: p.seo,
  };
  Object.entries(json).forEach(([k, v]) => fd.append(k, JSON.stringify(v)));

  // Send main existing images so deletions are respected
  fd.append("existingImages", JSON.stringify(existing));
  // Send main newly uploaded files
  files.forEach((f) => fd.append("images", f));

  // Serialize colorVariants data (without the File objects)
  const colorVariantsData = (p.colorVariants || []).map((v) => ({
    colorName: (v.colorName || "").trim(),
    colorHex: (v.colorHex || "#000000").trim(),
    sku: (v.sku || "").trim(),
    price: num(v.price),
    mrp: num(v.mrp),
    stockStatus: v.stockStatus || "in_stock",
    stockQuantity: num(v.stockQuantity) ?? 0,
    description: (v.description || "").trim(),
    isDefault: !!v.isDefault,
    isActive: v.isActive !== false,
    images: v.existingImages || [],
  }));
  fd.append("colorVariants", JSON.stringify(colorVariantsData));

  // Append variant images for each color
  (p.colorVariants || []).forEach((v, idx) => {
    (v.newFiles || []).forEach((file) => {
      fd.append(`variant_${idx}_images`, file);
    });
  });

  return fd;
}

function fromServer(d) {
  const merge = (base, src) =>
    Object.fromEntries(
      Object.entries(base).map(([k, v]) => [
        k,
        v && typeof v === "object" && !Array.isArray(v)
          ? merge(v, src?.[k] || {})
          : src?.[k] ?? v,
      ])
    );
  const m = merge(EMPTY, d);
  return {
    ...m,
    category: idOf(d.category),
    subcategory: idOf(d.subcategory),
    tags: (d.tags || []).join(", "),
    colorVariants: (d.colorVariants || []).map((v, i) => ({
      colorName: v.colorName || "",
      colorHex: v.colorHex || "#1a1a1a",
      sku: v.sku || "",
      price: v.price != null ? String(v.price) : "",
      mrp: v.mrp != null ? String(v.mrp) : "",
      stockStatus: v.stockStatus || "in_stock",
      stockQuantity: v.stockQuantity ?? 0,
      description: v.description || "",
      isDefault: v.isDefault ?? i === 0,
      isActive: v.isActive !== false,
      existingImages: Array.isArray(v.images) ? v.images : [],
      newFiles: [],
    })),
    variants: (d.variants || []).map((v) => ({
      name: v.name || "",
      options: (v.options || []).join(", "),
    })),
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

// Color Variant Card Component
function VariantCard({
  variant,
  index,
  total,
  onUpdate,
  onRemove,
  onSetDefault,
}) {
  const [open, setOpen] = useState(true);
  const fileInputRef = useRef(null);

  const previewUrls = useMemo(() => {
    return (variant.newFiles || []).map((f) => URL.createObjectURL(f));
  }, [variant.newFiles]);

  const handleAddFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length) {
      onUpdate({
        ...variant,
        newFiles: [...(variant.newFiles || []), ...picked],
      });
    }
    e.target.value = "";
  };

  const handleRemoveExistingImg = (imgSrc) => {
    onUpdate({
      ...variant,
      existingImages: (variant.existingImages || []).filter((s) => s !== imgSrc),
    });
  };

  const handleRemoveNewFile = (fileIdx) => {
    onUpdate({
      ...variant,
      newFiles: (variant.newFiles || []).filter((_, idx) => idx !== fileIdx),
    });
  };

  const totalImages =
    (variant.existingImages?.length || 0) + (variant.newFiles?.length || 0);

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/50 shadow-sm transition hover:border-stone-300">
      {/* Variant Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div
            className="h-7 w-7 rounded-full border border-stone-300 shadow-inner flex items-center justify-center shrink-0"
            style={{ backgroundColor: variant.colorHex || "#000" }}
          >
            {variant.isDefault && <Check className="h-4 w-4 text-white drop-shadow" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-ink-900">
                {variant.colorName || `Color Variant #${index + 1}`}
              </span>
              {variant.isDefault && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  <Star className="h-3 w-3 fill-emerald-600" /> Default (Shown first)
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 font-mono">
              {variant.colorHex} {variant.sku ? `• SKU: ${variant.sku}` : ""} •{" "}
              {totalImages} {totalImages === 1 ? "photo" : "photos"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!variant.isDefault && (
            <button
              type="button"
              onClick={onSetDefault}
              className="text-xs font-medium text-stone-600 hover:text-emerald-700 hover:underline px-2 py-1"
            >
              Make Default
            </button>
          )}

          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="p-1.5 text-stone-500 hover:bg-stone-100 rounded-lg"
            aria-label="Toggle details"
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            aria-label="Delete variant"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Variant Body */}
      {open && (
        <div className="p-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Color Name *" hint="e.g. Dark Black & Grey">
              <input
                className="input"
                required
                placeholder="e.g. Dark Black & Grey"
                value={variant.colorName}
                onChange={(e) => onUpdate({ ...variant, colorName: e.target.value })}
              />
            </Field>

            <Field label="Color Code / Swatch" hint="Hex code for the color dot">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-10 w-12 cursor-pointer rounded border border-stone-300 p-0.5 bg-white"
                  value={variant.colorHex || "#1a1a1a"}
                  onChange={(e) => onUpdate({ ...variant, colorHex: e.target.value })}
                />
                <input
                  className="input font-mono uppercase"
                  placeholder="#1A1A1A"
                  value={variant.colorHex}
                  onChange={(e) => onUpdate({ ...variant, colorHex: e.target.value })}
                />
              </div>
            </Field>

            <Field label="Variant SKU" hint="Optional variant-specific SKU">
              <input
                className="input uppercase"
                placeholder="e.g. CHAIR-BLK-01"
                value={variant.sku}
                onChange={(e) => onUpdate({ ...variant, sku: e.target.value })}
              />
            </Field>

            <Field label="Stock Status">
              <select
                className="input"
                value={variant.stockStatus}
                onChange={(e) => onUpdate({ ...variant, stockStatus: e.target.value })}
              >
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Color Price (₹)" hint="Leave blank to use main product price">
              <input
                type="number"
                min="0"
                className="input"
                placeholder="Optional override"
                value={variant.price}
                onChange={(e) => onUpdate({ ...variant, price: e.target.value })}
              />
            </Field>

            <Field label="Color MRP / Original (₹)" hint="Strikethrough original price like Amazon">
              <input
                type="number"
                min="0"
                className="input"
                placeholder="e.g. 7598"
                value={variant.mrp}
                onChange={(e) => onUpdate({ ...variant, mrp: e.target.value })}
              />
            </Field>

            <Field label="Stock Quantity">
              <input
                type="number"
                min="0"
                className="input"
                value={variant.stockQuantity}
                onChange={(e) => onUpdate({ ...variant, stockQuantity: e.target.value })}
              />
            </Field>
          </div>

          {/* Color Images */}
          <div className="rounded-lg border border-stone-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-600">
                  Photos for this Color ({totalImages})
                </p>
                <p className="text-[11px] text-stone-400">
                  Upload multiple photos of this color variant. First photo will show as the swatch thumbnail.
                </p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-ghost !py-1 !px-2.5 !text-xs"
              >
                <ImagePlus className="h-3.5 w-3.5" /> Add Images
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleAddFiles}
              />
            </div>

            <div className="flex flex-wrap gap-2.5 pt-1">
              {/* Existing Server Images */}
              {(variant.existingImages || []).map((img, i) => (
                <div
                  key={img + i}
                  className="group relative h-20 w-20 overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
                >
                  <img src={imgUrl(img)} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingImg(img)}
                    className="absolute right-1 top-1 rounded-full bg-ink-900/80 p-0.5 text-white hover:bg-red-600"
                    title="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-0.5 left-0.5 rounded bg-ink-900/80 px-1 text-[9px] font-medium text-white">
                      Cover
                    </span>
                  )}
                </div>
              ))}

              {/* Newly Picked Files */}
              {previewUrls.map((url, i) => (
                <div
                  key={url}
                  className="group relative h-20 w-20 overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <span className="absolute bottom-0.5 left-0.5 rounded bg-emerald-600 px-1 text-[9px] font-medium text-white">
                    New
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveNewFile(i)}
                    className="absolute right-1 top-1 rounded-full bg-ink-900/80 p-0.5 text-white hover:bg-red-600"
                    title="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {totalImages === 0 && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-20 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-200 text-xs text-stone-400 hover:border-emerald-600 hover:text-emerald-700"
                >
                  <ImagePlus className="mb-1 h-5 w-5" />
                  <span>Click to add photos for {variant.colorName || "this color"}</span>
                </div>
              )}
            </div>
          </div>

          <Field label="Color Specific Description / Features (Optional)">
            <input
              className="input text-xs"
              placeholder="e.g. Features breathable black mesh with chrome silver heavy-duty base"
              value={variant.description}
              onChange={(e) => onUpdate({ ...variant, description: e.target.value })}
            />
          </Field>
        </div>
      )}
    </div>
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
        setCats(getList(c));
        setSubs(getList(s));
        if (isEdit) {
          const d = pickItem(await productsApi.get(id));
          setP(fromServer(d));
          const existingImgs =
            d.images && d.images.length
              ? d.images
              : d.thumbnail
              ? [d.thumbnail]
              : [];
          setExisting(existingImgs);
        }
      } catch (e) {
        toast.error(errMsg(e));
      } finally {
        setLoading(false);
      }
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
  const bind = (path) => ({
    value: get(path) ?? "",
    onChange: (e) => set(path, e.target.value),
  });

  const check = (path, label) => (
    <label className="flex items-center gap-2 pt-1 text-sm">
      <input
        type="checkbox"
        className="h-4 w-4 accent-emerald-700"
        checked={!!get(path)}
        onChange={(e) => set(path, e.target.checked)}
      />{" "}
      {label}
    </label>
  );

  const subOptions = useMemo(
    () => subs.filter((s) => idOf(s.category) === p.category),
    [subs, p.category]
  );

  // Variant Helpers
  const addColorVariant = () => {
    const isFirst = (p.colorVariants || []).length === 0;
    setP((prev) => ({
      ...prev,
      colorVariants: [
        ...(prev.colorVariants || []),
        { ...EMPTY_VARIANT, isDefault: isFirst },
      ],
    }));
  };

  const updateColorVariant = (index, updated) => {
    setP((prev) => {
      const copy = [...(prev.colorVariants || [])];
      copy[index] = updated;
      return { ...prev, colorVariants: copy };
    });
  };

  const removeColorVariant = (index) => {
    setP((prev) => {
      const filtered = (prev.colorVariants || []).filter((_, i) => i !== index);
      if (filtered.length > 0 && !filtered.some((v) => v.isDefault)) {
        filtered[0].isDefault = true;
      }
      return { ...prev, colorVariants: filtered };
    });
  };

  const setDefaultVariant = (index) => {
    setP((prev) => ({
      ...prev,
      colorVariants: (prev.colorVariants || []).map((v, i) => ({
        ...v,
        isDefault: i === index,
      })),
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!isEdit && files.length === 0 && (p.colorVariants || []).length === 0) {
      return toast.error("Please add at least one product image or color variant.");
    }
    setSaving(true);
    try {
      const fd = buildFormData(p, files, existing);
      await (isEdit ? productsApi.update(id, fd) : productsApi.create(fd));
      toast.success(isEdit ? "Product updated" : "Product added");
      navigate("/products");
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <form onSubmit={submit} className="space-y-6 pb-24">
      <div>
        <Link
          to="/products"
          className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-stone-500 hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to products
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {isEdit ? "Edit product" : "Add product"}
        </h1>
      </div>

      <Section title="Basic details">
        <Field label="Product name *" className="sm:col-span-2">
          <input className="input" required {...bind("name")} />
        </Field>
        <Field label="SKU *">
          <input className="input uppercase" required {...bind("sku")} />
        </Field>
        <Field label="Slug *" hint="Used in the product page URL." className="sm:col-span-2">
          <input
            className="input"
            required
            value={p.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", e.target.value);
            }}
          />
        </Field>
        <Field label="Display order">
          <input type="number" min="0" className="input" {...bind("displayOrder")} />
        </Field>
        <Field label="Category *">
          <select className="input" required {...bind("category")}>
            <option value="">Select…</option>
            {cats.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Subcategory"
          hint={!p.category ? "Choose a category first." : undefined}
        >
          <select className="input" disabled={!p.category} {...bind("subcategory")}>
            <option value="">None</option>
            {subOptions.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Short description" className="sm:col-span-2 lg:col-span-3">
          <input className="input" maxLength={500} {...bind("shortDescription")} />
        </Field>
        <Field label="Full description" className="sm:col-span-2 lg:col-span-3">
          <textarea
            className="input min-h-[120px]"
            maxLength={5000}
            {...bind("description")}
          />
        </Field>
      </Section>

      <Section title="Main Images" hint="Base product pictures. First image is used as the default thumbnail.">
        <div className="sm:col-span-2 lg:col-span-3">
          <ImageUploader
            existing={existing}
            files={files}
            onFiles={setFiles}
            onRemoveExisting={(src) => setExisting(existing.filter((s) => s !== src))}
          />
          {isEdit && (
            <p className="mt-2 text-xs text-stone-500">
              Upload new images only if you want to add or replace them.
            </p>
          )}
        </div>
      </Section>

      {/* AMAZON-STYLE COLOR VARIANTS */}
      <section className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 px-5 py-4 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-emerald-700" />
              <h2 className="text-lg font-bold">Color Variants (Amazon Style)</h2>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Add multiple colors (e.g. Dark Black & Grey, Walnut Brown). Each color can have its own pictures, price, MRP, and stock.
            </p>
          </div>
          <button
            type="button"
            onClick={addColorVariant}
            className="btn-brass !py-1.5 !px-3 !text-xs self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" /> Add Color Variant
          </button>
        </div>

        <div className="p-5 space-y-4">
          {(p.colorVariants || []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center bg-stone-50">
              <Palette className="mx-auto h-8 w-8 text-stone-400 mb-2" />
              <p className="font-semibold text-stone-700">No Color Variants Added</p>
              <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                If this product comes in different colors (like Amazon), click "+ Add Color Variant" to add colors with their own photos and prices.
              </p>
              <button
                type="button"
                onClick={addColorVariant}
                className="btn-ghost !text-xs mt-3"
              >
                <Plus className="h-3.5 w-3.5" /> Add First Color Variant
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {(p.colorVariants || []).map((v, i) => (
                <VariantCard
                  key={i}
                  variant={v}
                  index={i}
                  total={p.colorVariants.length}
                  onUpdate={(up) => updateColorVariant(i, up)}
                  onRemove={() => removeColorVariant(i)}
                  onSetDefault={() => setDefaultVariant(i)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <Section title="Pricing">
        <Field label="Price (₹) *">
          <input
            type="number"
            min="0"
            required
            className="input"
            {...bind("pricing.price")}
          />
        </Field>
        <Field label="Sale price (₹)">
          <input
            type="number"
            min="0"
            className="input"
            {...bind("pricing.salePrice")}
          />
        </Field>
        <Field label="Tax (%)">
          <input
            type="number"
            min="0"
            max="100"
            className="input"
            {...bind("pricing.taxPercentage")}
          />
        </Field>
      </Section>

      <Section title="Stock">
        <Field label="Quantity in stock">
          <input
            type="number"
            min="0"
            className="input"
            {...bind("inventory.stockQuantity")}
          />
        </Field>
        <Field label="Low stock alert at">
          <input
            type="number"
            min="0"
            className="input"
            {...bind("inventory.lowStockThreshold")}
          />
        </Field>
        <Field label="Stock status">
          <select className="input" {...bind("inventory.stockStatus")}>
            <option value="in_stock">In stock</option>
            <option value="low_stock">Low stock</option>
            <option value="out_of_stock">Out of stock</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </Field>
        <div>{check("inventory.allowBackorder", "Allow orders when out of stock")}</div>
      </Section>

      <Section title="Specifications">
        <Field label="Brand">
          <input className="input" {...bind("specifications.brand")} />
        </Field>
        <Field label="Material">
          <input className="input" {...bind("specifications.material")} />
        </Field>
        <Field label="Upholstery">
          <input className="input" {...bind("specifications.upholstery")} />
        </Field>
        <Field label="Color">
          <input className="input" {...bind("specifications.color")} />
        </Field>
        <Field label="Seating capacity">
          <input
            type="number"
            min="0"
            className="input"
            {...bind("specifications.seatingCapacity")}
          />
        </Field>
        <Field label="Warranty">
          <input
            className="input"
            placeholder="e.g. 1 year"
            {...bind("specifications.warranty")}
          />
        </Field>
        <Field label="Length / Width / Height" className="sm:col-span-2">
          <div className="flex gap-2">
            {["length", "width", "height"].map((d) => (
              <input
                key={d}
                type="number"
                min="0"
                placeholder={d}
                className="input"
                {...bind(`specifications.dimensions.${d}`)}
              />
            ))}
            <select
              className="input !w-24"
              {...bind("specifications.dimensions.unit")}
            >
              <option>cm</option>
              <option>inch</option>
              <option>mm</option>
            </select>
          </div>
        </Field>
        <Field label="Weight">
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              className="input"
              {...bind("specifications.weight")}
            />
            <select
              className="input !w-24"
              {...bind("specifications.weightUnit")}
            >
              <option>kg</option>
              <option>g</option>
            </select>
          </div>
        </Field>
        <div>{check("specifications.assemblyRequired", "Assembly required")}</div>
      </Section>

      <Section title="Delivery and returns">
        <Field label="Estimated delivery">
          <input
            className="input"
            placeholder="e.g. 5-7 days"
            {...bind("delivery.estimatedDays")}
          />
        </Field>
        <Field label="Return window (days)">
          <input
            type="number"
            min="0"
            className="input"
            {...bind("delivery.returnWindowDays")}
          />
        </Field>
        <div className="space-y-2">
          {check("delivery.freeDelivery", "Free delivery")}
          {check("delivery.returnable", "Returnable")}
        </div>
      </Section>

      {/* Visibility & SEO */}
      <Section title="Visibility & Settings">
        <Field label="Tags" hint="Comma-separated tags" className="sm:col-span-2">
          <input
            className="input"
            placeholder="e.g. ergonomic, chair, office"
            {...bind("tags")}
          />
        </Field>
        <div className="space-y-2 pt-2">
          {check("isFeatured", "Featured product")}
          {check("isBestSeller", "Best seller badge")}
          {check("isActive", "Active (visible in store)")}
        </div>
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-7xl justify-end gap-2">
          <Link to="/products" className="btn-ghost">
            Cancel
          </Link>
          <button className="btn-primary" disabled={saving}>
            {saving && <Spinner className="h-4 w-4" />}
            {isEdit ? "Save changes" : "Add product"}
          </button>
        </div>
      </div>
    </form>
  );
}
