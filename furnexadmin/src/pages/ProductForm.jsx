import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Layers,
  Palette,
  Plus,
  Sliders,
  Star,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { categoriesApi, productsApi, subcategoriesApi } from "../api/services";
import { errMsg, getList, idOf, imgUrl, pickItem, slugify } from "../utils/helpers";
import { Field, PageLoader, Spinner } from "../components/ui";

const EMPTY_VARIANT = {
  colorName: "Standard",
  colorHex: "#1a1a1a",
  sku: "",
  price: "",
  mrp: "",
  taxPercentage: 0,
  stockQuantity: 10,
  lowStockThreshold: 5,
  stockStatus: "in_stock",
  allowBackorder: false,
  specifications: {
    brand: "",
    material: "",
    upholstery: "",
    seatingCapacity: "",
    weight: "",
    weightUnit: "kg",
    assemblyRequired: false,
    warranty: "",
    dimensions: { length: "", width: "", height: "", unit: "cm" },
  },
  description: "",
  isDefault: true,
  isActive: true,
  existingImages: [],
  newFiles: [],
};

const EMPTY = {
  name: "",
  slug: "",
  sku: "",
  shortDescription: "",
  description: "",
  category: "",
  subcategory: "",
  colorVariants: [{ ...EMPTY_VARIANT }],
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

const num = (v) => (v === "" || v == null ? null : Number(v));

function buildFormData(p) {
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

  const json = {
    delivery: {
      ...p.delivery,
      returnWindowDays: num(p.delivery.returnWindowDays) ?? 0,
    },
    tags: (p.tags || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    seo: p.seo,
  };
  Object.entries(json).forEach(([k, v]) => fd.append(k, JSON.stringify(v)));

  // Serialize variants containing all details (pricing, stock, specs, images)
  const variantsData = (p.colorVariants || []).map((v) => {
    const s = v.specifications || {};
    return {
      colorName: (v.colorName || "").trim(),
      colorHex: (v.colorHex || "#000000").trim(),
      sku: (v.sku || "").trim(),
      price: num(v.price) ?? 0,
      mrp: num(v.mrp),
      taxPercentage: num(v.taxPercentage) ?? 0,
      stockQuantity: num(v.stockQuantity) ?? 0,
      lowStockThreshold: num(v.lowStockThreshold) ?? 5,
      stockStatus: v.stockStatus || "in_stock",
      allowBackorder: !!v.allowBackorder,
      specifications: {
        brand: (s.brand || "").trim(),
        material: (s.material || "").trim(),
        upholstery: (s.upholstery || "").trim(),
        warranty: (s.warranty || "").trim(),
        assemblyRequired: !!s.assemblyRequired,
        seatingCapacity: num(s.seatingCapacity),
        weight: num(s.weight),
        weightUnit: s.weightUnit || "kg",
        dimensions: {
          length: num(s.dimensions?.length),
          width: num(s.dimensions?.width),
          height: num(s.dimensions?.height),
          unit: s.dimensions?.unit || "cm",
        },
      },
      description: (v.description || "").trim(),
      isDefault: !!v.isDefault,
      isActive: v.isActive !== false,
      images: v.existingImages || [],
    };
  });

  fd.append("variants", JSON.stringify(variantsData));
  fd.append("colorVariants", JSON.stringify(variantsData));

  // Append variant images for each variant
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

  const sourceVariants =
    Array.isArray(d.variants) && d.variants.length > 0 && d.variants[0].colorName !== undefined
      ? d.variants
      : Array.isArray(d.colorVariants) && d.colorVariants.length > 0
      ? d.colorVariants
      : [];

  const mappedVariants =
    sourceVariants.length > 0
      ? sourceVariants.map((v, i) => {
          const s = v.specifications || d.specifications || {};
          const dims = s.dimensions || {};
          return {
            colorName: v.colorName || (v.name ? v.name : `Variant #${i + 1}`),
            colorHex: v.colorHex || "#1a1a1a",
            sku: v.sku || "",
            price:
              v.price != null
                ? String(v.price)
                : v.pricing?.price != null
                ? String(v.pricing.price)
                : d.pricing?.price != null
                ? String(d.pricing.price)
                : "",
            mrp:
              v.mrp != null
                ? String(v.mrp)
                : v.pricing?.salePrice != null
                ? String(v.pricing.salePrice)
                : "",
            taxPercentage:
              v.pricing?.taxPercentage ?? d.pricing?.taxPercentage ?? 0,
            stockQuantity:
              v.stockQuantity ??
              v.inventory?.stockQuantity ??
              d.inventory?.stockQuantity ??
              0,
            lowStockThreshold:
              v.inventory?.lowStockThreshold ??
              d.inventory?.lowStockThreshold ??
              5,
            stockStatus:
              v.stockStatus ||
              v.inventory?.stockStatus ||
              d.inventory?.stockStatus ||
              "in_stock",
            allowBackorder:
              v.allowBackorder ??
              v.inventory?.allowBackorder ??
              d.inventory?.allowBackorder ??
              false,
            specifications: {
              brand: s.brand || "",
              material: s.material || "",
              upholstery: s.upholstery || "",
              seatingCapacity: s.seatingCapacity != null ? String(s.seatingCapacity) : "",
              weight: s.weight != null ? String(s.weight) : "",
              weightUnit: s.weightUnit || "kg",
              assemblyRequired: !!s.assemblyRequired,
              warranty: s.warranty || "",
              dimensions: {
                length: dims.length != null ? String(dims.length) : "",
                width: dims.width != null ? String(dims.width) : "",
                height: dims.height != null ? String(dims.height) : "",
                unit: dims.unit || "cm",
              },
            },
            description: v.description || "",
            isDefault: v.isDefault ?? i === 0,
            isActive: v.isActive !== false,
            existingImages: Array.isArray(v.images) && v.images.length
              ? v.images
              : i === 0 && Array.isArray(d.images)
              ? d.images
              : [],
            newFiles: [],
          };
        })
      : [
          {
            ...EMPTY_VARIANT,
            price: d.pricing?.price != null ? String(d.pricing.price) : "",
            mrp: d.pricing?.salePrice != null ? String(d.pricing.salePrice) : "",
            stockQuantity: d.inventory?.stockQuantity ?? 10,
            existingImages: Array.isArray(d.images) ? d.images : [],
            specifications: {
              brand: d.specifications?.brand || "",
              material: d.specifications?.material || "",
              upholstery: d.specifications?.upholstery || "",
              seatingCapacity: d.specifications?.seatingCapacity != null ? String(d.specifications.seatingCapacity) : "",
              weight: d.specifications?.weight != null ? String(d.specifications.weight) : "",
              weightUnit: d.specifications?.weightUnit || "kg",
              assemblyRequired: !!d.specifications?.assemblyRequired,
              warranty: d.specifications?.warranty || "",
              dimensions: {
                length: d.specifications?.dimensions?.length != null ? String(d.specifications.dimensions.length) : "",
                width: d.specifications?.dimensions?.width != null ? String(d.specifications.dimensions.width) : "",
                height: d.specifications?.dimensions?.height != null ? String(d.specifications.dimensions.height) : "",
                unit: d.specifications?.dimensions?.unit || "cm",
              },
            },
          },
        ];

  return {
    ...m,
    category: idOf(d.category),
    subcategory: idOf(d.subcategory),
    tags: (d.tags || []).join(", "),
    colorVariants: mappedVariants,
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

// Complete Variant Card Component containing all details
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

  const setSpec = (key, val) => {
    onUpdate({
      ...variant,
      specifications: {
        ...(variant.specifications || {}),
        [key]: val,
      },
    });
  };

  const setDim = (dimKey, val) => {
    onUpdate({
      ...variant,
      specifications: {
        ...(variant.specifications || {}),
        dimensions: {
          ...((variant.specifications || {}).dimensions || {}),
          [dimKey]: val,
        },
      },
    });
  };

  const totalImages =
    (variant.existingImages?.length || 0) + (variant.newFiles?.length || 0);

  const specs = variant.specifications || {};
  const dims = specs.dimensions || {};

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden transition">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-full border border-stone-300 shadow-inner flex items-center justify-center shrink-0 cursor-pointer"
            style={{ backgroundColor: variant.colorHex || "#1a1a1a" }}
            title={`Color: ${variant.colorHex}`}
          >
            {variant.isDefault && <Check className="h-4 w-4 text-white drop-shadow" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-ink-900 text-base">
                {variant.colorName || `Variant #${index + 1}`}
              </span>
              {variant.isDefault && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  <Star className="h-3 w-3 fill-emerald-600" /> Default Variant
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 font-mono mt-0.5">
              Price: ₹{variant.price || 0} {variant.mrp ? `(MRP: ₹${variant.mrp})` : ""} •{" "}
              {variant.stockQuantity || 0} in stock • {totalImages} {totalImages === 1 ? "photo" : "photos"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!variant.isDefault && (
            <button
              type="button"
              onClick={onSetDefault}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline px-2.5 py-1"
            >
              Set as Default
            </button>
          )}

          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="p-1.5 text-stone-500 hover:bg-stone-200 rounded-lg transition"
            aria-label="Toggle details"
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {total > 1 && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              aria-label="Delete variant"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="p-5 space-y-6">
          {/* Sub-Section 1: Color, SKU & Multiple Photos */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Palette className="h-4 w-4 text-brass-600" />
              <h3 className="text-sm font-bold text-ink-900 uppercase tracking-wider">
                1. Color & Photos
              </h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-4">
              <Field label="Color / Style Name *" hint="e.g. Dark Black & Grey">
                <input
                  className="input"
                  required
                  placeholder="e.g. Dark Black & Grey"
                  value={variant.colorName}
                  onChange={(e) => onUpdate({ ...variant, colorName: e.target.value })}
                />
              </Field>

              <Field label="Color Swatch & Code" hint="Pick color for dots on website">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="h-10 w-12 cursor-pointer rounded border border-stone-300 p-0.5 bg-white shrink-0"
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

              <Field label="Variant SKU" hint="SKU specific to this variant">
                <input
                  className="input uppercase"
                  placeholder="e.g. CHR-BLK-01"
                  value={variant.sku}
                  onChange={(e) => onUpdate({ ...variant, sku: e.target.value })}
                />
              </Field>
            </div>

            {/* Photos Uploader */}
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-stone-700">
                    Multiple Photos for this Variant ({totalImages})
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Upload photos of this color. First photo will show as the swatch thumbnail.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-brass !py-1 !px-3 !text-xs"
                >
                  <ImagePlus className="h-3.5 w-3.5" /> + Upload Photos
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

              <div className="flex flex-wrap gap-3">
                {/* Existing Images */}
                {(variant.existingImages || []).map((img, i) => (
                  <div
                    key={img + i}
                    className="group relative h-24 w-24 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm"
                  >
                    <img src={imgUrl(img)} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingImg(img)}
                      className="absolute right-1 top-1 rounded-full bg-ink-900/80 p-1 text-white hover:bg-red-600 transition"
                      title="Remove image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 rounded bg-ink-900/90 px-1.5 text-[9px] font-semibold text-white">
                        Cover
                      </span>
                    )}
                  </div>
                ))}

                {/* New Picked Images */}
                {previewUrls.map((url, i) => (
                  <div
                    key={url}
                    className="group relative h-24 w-24 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm"
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <span className="absolute bottom-1 left-1 rounded bg-emerald-600 px-1.5 text-[9px] font-semibold text-white">
                      New
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveNewFile(i)}
                      className="absolute right-1 top-1 rounded-full bg-ink-900/80 p-1 text-white hover:bg-red-600 transition"
                      title="Remove image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {totalImages === 0 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-300 text-xs text-stone-500 hover:border-emerald-600 hover:text-emerald-700 bg-white"
                  >
                    <ImagePlus className="mb-1.5 h-6 w-6 text-stone-400" />
                    <span>Click to add photos for {variant.colorName || "this variant"}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <hr className="border-stone-200" />

          {/* Sub-Section 2: Pricing & Stock */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-4 w-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-ink-900 uppercase tracking-wider">
                2. Pricing & Stock for this Variant
              </h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-3">
              <Field label="Price (₹) *" hint="Selling price for this variant">
                <input
                  type="number"
                  min="0"
                  required
                  className="input font-semibold"
                  placeholder="e.g. 3799"
                  value={variant.price}
                  onChange={(e) => onUpdate({ ...variant, price: e.target.value })}
                />
              </Field>

              <Field label="MRP / Original Price (₹)" hint="Amazon strikethrough price">
                <input
                  type="number"
                  min="0"
                  className="input"
                  placeholder="e.g. 7598"
                  value={variant.mrp}
                  onChange={(e) => onUpdate({ ...variant, mrp: e.target.value })}
                />
              </Field>

              <Field label="Tax (%)">
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input"
                  value={variant.taxPercentage ?? 0}
                  onChange={(e) => onUpdate({ ...variant, taxPercentage: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Quantity in Stock">
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={variant.stockQuantity}
                  onChange={(e) => onUpdate({ ...variant, stockQuantity: e.target.value })}
                />
              </Field>

              <Field label="Low Stock Alert At">
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={variant.lowStockThreshold ?? 5}
                  onChange={(e) => onUpdate({ ...variant, lowStockThreshold: e.target.value })}
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
                  <option value="discontinued">Discontinued</option>
                </select>
              </Field>
            </div>

            <label className="flex items-center gap-2 pt-2 text-xs text-stone-600">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-700"
                checked={!!variant.allowBackorder}
                onChange={(e) => onUpdate({ ...variant, allowBackorder: e.target.checked })}
              />{" "}
              Allow orders when out of stock
            </label>
          </div>

          <hr className="border-stone-200" />

          {/* Sub-Section 3: Variant Specifications */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sliders className="h-4 w-4 text-stone-700" />
              <h3 className="text-sm font-bold text-ink-900 uppercase tracking-wider">
                3. Specifications for this Variant
              </h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-3">
              <Field label="Brand">
                <input
                  className="input"
                  placeholder="e.g. Furnex"
                  value={specs.brand || ""}
                  onChange={(e) => setSpec("brand", e.target.value)}
                />
              </Field>

              <Field label="Material">
                <input
                  className="input"
                  placeholder="e.g. High Grade Nylon / Metal"
                  value={specs.material || ""}
                  onChange={(e) => setSpec("material", e.target.value)}
                />
              </Field>

              <Field label="Upholstery">
                <input
                  className="input"
                  placeholder="e.g. Breathable Mesh"
                  value={specs.upholstery || ""}
                  onChange={(e) => setSpec("upholstery", e.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-3">
              <Field label="Seating Capacity">
                <input
                  type="number"
                  min="0"
                  className="input"
                  placeholder="e.g. 1"
                  value={specs.seatingCapacity || ""}
                  onChange={(e) => setSpec("seatingCapacity", e.target.value)}
                />
              </Field>

              <Field label="Warranty">
                <input
                  className="input"
                  placeholder="e.g. 2 Years"
                  value={specs.warranty || ""}
                  onChange={(e) => setSpec("warranty", e.target.value)}
                />
              </Field>

              <Field label="Weight">
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Weight"
                    className="input"
                    value={specs.weight || ""}
                    onChange={(e) => setSpec("weight", e.target.value)}
                  />
                  <select
                    className="input !w-24 shrink-0"
                    value={specs.weightUnit || "kg"}
                    onChange={(e) => setSpec("weightUnit", e.target.value)}
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                  </select>
                </div>
              </Field>
            </div>

            <Field label="Dimensions (Length / Width / Height)" className="mb-3">
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Length"
                  className="input"
                  value={dims.length || ""}
                  onChange={(e) => setDim("length", e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Width"
                  className="input"
                  value={dims.width || ""}
                  onChange={(e) => setDim("width", e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Height"
                  className="input"
                  value={dims.height || ""}
                  onChange={(e) => setDim("height", e.target.value)}
                />
                <select
                  className="input !w-24 shrink-0"
                  value={dims.unit || "cm"}
                  onChange={(e) => setDim("unit", e.target.value)}
                >
                  <option value="cm">cm</option>
                  <option value="inch">inch</option>
                  <option value="mm">mm</option>
                </select>
              </div>
            </Field>

            <div className="flex items-center gap-2 pt-1 text-xs">
              <label className="flex items-center gap-2 text-stone-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-emerald-700"
                  checked={!!specs.assemblyRequired}
                  onChange={(e) => setSpec("assemblyRequired", e.target.checked)}
                />{" "}
                Assembly required
              </label>
            </div>
          </div>

          <Field label="Variant Notes / Specific Features (Optional)">
            <input
              className="input text-xs"
              placeholder="e.g. Includes chrome base and 2D adjustable armrests"
              value={variant.description || ""}
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
        }
      } catch (e) {
        toast.error(errMsg(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

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
  const addVariant = () => {
    const isFirst = (p.colorVariants || []).length === 0;
    setP((prev) => ({
      ...prev,
      colorVariants: [
        ...(prev.colorVariants || []),
        {
          ...EMPTY_VARIANT,
          colorName: `Color #${(prev.colorVariants || []).length + 1}`,
          isDefault: isFirst,
        },
      ],
    }));
  };

  const updateVariant = (index, updated) => {
    setP((prev) => {
      const copy = [...(prev.colorVariants || [])];
      copy[index] = updated;
      return { ...prev, colorVariants: copy };
    });
  };

  const removeVariant = (index) => {
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
    const variants = p.colorVariants || [];
    if (variants.length === 0) {
      return toast.error("Please add at least one product variant.");
    }
    const missingPrice = variants.some((v) => !v.price && v.price !== 0);
    if (missingPrice) {
      return toast.error("Please provide a price for each variant.");
    }

    setSaving(true);
    try {
      const fd = buildFormData(p);
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

      {/* 1. BASIC DETAILS */}
      <Section title="Basic Details">
        <Field label="Product Name *" className="sm:col-span-2">
          <input className="input" required {...bind("name")} />
        </Field>
        <Field label="Base SKU *">
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
            className="input min-h-[110px]"
            maxLength={5000}
            {...bind("description")}
          />
        </Field>
      </Section>

      {/* 2. PRODUCT VARIANTS (CONTAINING ALL DETAILS) */}
      <section className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 px-5 py-4 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-700" />
              <h2 className="text-lg font-bold">Product Variants & Colors</h2>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Har variant ke andar uski saari details (Multiple Photos, Price, MRP, Stock, aur Dimensions/Specifications) aayengi.
            </p>
          </div>
          <button
            type="button"
            onClick={addVariant}
            className="btn-brass !py-1.5 !px-3 !text-xs self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" /> + Add Another Variant
          </button>
        </div>

        <div className="p-5 space-y-5">
          {(p.colorVariants || []).map((v, i) => (
            <VariantCard
              key={i}
              variant={v}
              index={i}
              total={(p.colorVariants || []).length}
              onUpdate={(up) => updateVariant(i, up)}
              onRemove={() => removeVariant(i)}
              onSetDefault={() => setDefaultVariant(i)}
            />
          ))}
        </div>
      </section>

      {/* 3. DELIVERY & RETURNS */}
      <Section title="Delivery and Returns">
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

      {/* 4. VISIBILITY & SETTINGS */}
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

      {/* Floating Save Bar */}
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
