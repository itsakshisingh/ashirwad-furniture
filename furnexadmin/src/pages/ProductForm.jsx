import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Video,
  Play,
  Layers,
  Palette,
  Plus,
  Sliders,
  Star,
  Tag,
  Trash2,
  X,
  Sparkles,
  Info,
  Package,
  Truck,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { categoriesApi, productsApi, subcategoriesApi } from "../api/services";
import { errMsg, formatPrice, getList, idOf, imgUrl, isVideoMedia, pickItem, slugify } from "../utils/helpers";
import { Badge, Field, PageLoader, Spinner } from "../components/ui";

const COLOR_PRESETS = [
  { name: "Matte Black", hex: "#1a1a1a" },
  { name: "Pure White", hex: "#ffffff" },
  { name: "Dark Walnut", hex: "#3e2723" },
  { name: "Natural Teak", hex: "#8d6e63" },
  { name: "Charcoal Grey", hex: "#455a64" },
  { name: "Royal Blue", hex: "#1565c0" },
  { name: "Cream Beige", hex: "#d7ccc8" },
  { name: "Forest Green", hex: "#2e7d32" },
];

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
    brand: "Furnex",
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
              brand: s.brand || "Furnex",
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
              brand: d.specifications?.brand || "Furnex",
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

function Section({ title, hint, icon: Icon, children }) {
  return (
    <section className="card shadow-sm border border-stone-200 overflow-hidden">
      <div className="border-b border-stone-200 bg-stone-50/80 px-6 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-emerald-700" />}
            <h2 className="font-bold text-ink-900 text-base">{title}</h2>
          </div>
          {hint && <p className="text-xs text-stone-500 mt-0.5">{hint}</p>}
        </div>
      </div>
      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

// Modern Clean Variant Card with Sub-Tabs
function VariantCard({
  variant,
  index,
  total,
  onUpdate,
  onRemove,
  onSetDefault,
}) {
  const [activeTab, setActiveTab] = useState("photos"); // "photos" | "pricing" | "specs"
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const previewItems = useMemo(() => {
    return (variant.newFiles || []).map((f) => ({
      url: URL.createObjectURL(f),
      isVideo: f.type ? f.type.startsWith("video/") : isVideoMedia(f.name),
      name: f.name,
    }));
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

  const existingVidsCount = (variant.existingImages || []).filter((s) => isVideoMedia(s)).length;
  const newVidsCount = (variant.newFiles || []).filter((f) => (f.type ? f.type.startsWith("video/") : isVideoMedia(f.name))).length;
  const totalVideos = existingVidsCount + newVidsCount;
  const totalImages =
    (variant.existingImages?.length || 0) + (variant.newFiles?.length || 0);
  const totalPhotos = Math.max(0, totalImages - totalVideos);

  const specs = variant.specifications || {};
  const dims = specs.dimensions || {};

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden transition-all duration-200">
      {/* Variant Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-stone-50/90 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-full border-2 border-white shadow flex items-center justify-center shrink-0"
            style={{ backgroundColor: variant.colorHex || "#1a1a1a" }}
            title={`Color code: ${variant.colorHex}`}
          >
            {variant.isDefault && <Check className="h-4 w-4 text-white drop-shadow-md" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-ink-900 text-base">
                {variant.colorName || `Variant #${index + 1}`}
              </span>
              {variant.isDefault ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                  <Star className="h-3 w-3 fill-emerald-600" /> Default Variant
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onSetDefault}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline px-2 py-0.5 bg-emerald-50 rounded"
                >
                  Set as Default
                </button>
              )}
            </div>
            <p className="text-xs text-stone-500 font-mono mt-0.5">
              Price: ₹{variant.price || 0} {variant.mrp ? `• MRP: ₹${variant.mrp}` : ""} •{" "}
              {variant.stockQuantity || 0} in stock • {totalPhotos} {totalPhotos === 1 ? "photo" : "photos"}
              {totalVideos > 0 && (
                <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-purple-100 text-purple-800 px-1.5 py-0.2 text-[10px] font-bold">
                  <Video className="h-2.5 w-2.5" /> {totalVideos} {totalVideos === 1 ? "video" : "videos"}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {total > 1 && (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition"
              title="Delete this variant"
            >
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex border-b border-stone-200 bg-stone-100/60 px-5 gap-2 pt-2">
        <button
          type="button"
          onClick={() => setActiveTab("photos")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-lg transition border-t-2 ${
            activeTab === "photos"
              ? "bg-white text-emerald-800 border-emerald-600 shadow-sm"
              : "text-stone-500 hover:text-stone-800 border-transparent hover:bg-stone-200/50"
          }`}
        >
          <Palette className="h-3.5 w-3.5" /> Color, Photos & Video ({totalImages})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pricing")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-lg transition border-t-2 ${
            activeTab === "pricing"
              ? "bg-white text-emerald-800 border-emerald-600 shadow-sm"
              : "text-stone-500 hover:text-stone-800 border-transparent hover:bg-stone-200/50"
          }`}
        >
          <Tag className="h-3.5 w-3.5" /> Pricing & Stock (₹{variant.price || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("specs")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-lg transition border-t-2 ${
            activeTab === "specs"
              ? "bg-white text-emerald-800 border-emerald-600 shadow-sm"
              : "text-stone-500 hover:text-stone-800 border-transparent hover:bg-stone-200/50"
          }`}
        >
          <Sliders className="h-3.5 w-3.5" /> Dimensions & Specs
        </button>
      </div>

      {/* Tab 1: Color & Photos */}
      {activeTab === "photos" && (
        <div className="p-6 space-y-5 animate-fadeIn">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Color / Style Name *" hint="e.g. Dark Black & Grey">
              <input
                className="input font-semibold"
                required
                placeholder="e.g. Dark Black & Grey"
                value={variant.colorName}
                onChange={(e) => onUpdate({ ...variant, colorName: e.target.value })}
              />
            </Field>

            <Field label="Color Swatch & Hex" hint="Visual color shown on website">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-10 w-12 cursor-pointer rounded border border-stone-300 p-0.5 bg-white shrink-0 shadow-sm"
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

            <Field label="Variant SKU" hint="Optional variant code">
              <input
                className="input uppercase font-mono"
                placeholder="e.g. CHR-BLK-01"
                value={variant.sku}
                onChange={(e) => onUpdate({ ...variant, sku: e.target.value })}
              />
            </Field>
          </div>

          {/* Quick Color Presets */}
          <div>
            <p className="text-[11px] font-semibold text-stone-500 mb-2">
              Quick Color Presets (Click to apply):
            </p>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((cp) => (
                <button
                  key={cp.name}
                  type="button"
                  onClick={() =>
                    onUpdate({
                      ...variant,
                      colorName: cp.name,
                      colorHex: cp.hex,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-100 hover:border-stone-400 transition"
                >
                  <span
                    className="h-3 w-3 rounded-full border border-stone-300 shrink-0"
                    style={{ backgroundColor: cp.hex }}
                  />
                  <span>{cp.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Photos & Videos Box */}
          <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
                  <ImagePlus className="h-4 w-4 text-brass-600" /> Media for {variant.colorName || "this variant"} ({totalPhotos} Photos{totalVideos > 0 ? `, ${totalVideos} Videos` : ""})
                </p>
                <p className="text-xs text-stone-500 mt-0.5">
                  Photos (JPG, PNG, WebP) aur Videos (MP4, WebM, MOV) upload karein. First photo swatch thumbnail rahegi.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="btn-brass !py-1.5 !px-3.5 !text-xs inline-flex items-center gap-1.5 shadow-sm"
                >
                  <ImagePlus className="h-3.5 w-3.5" /> + Add Photos
                </button>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300 bg-purple-50 px-3.5 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 hover:border-purple-400 transition shadow-sm"
                >
                  <Video className="h-3.5 w-3.5 text-purple-600" /> + Add Video
                </button>
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleAddFiles}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska,video/*"
                multiple
                className="hidden"
                onChange={handleAddFiles}
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              {/* Existing Server Media */}
              {(variant.existingImages || []).map((img, i) => {
                const isVid = isVideoMedia(img);
                return (
                  <div
                    key={img + i}
                    className="group relative h-28 w-28 overflow-hidden rounded-xl border border-stone-200 bg-black shadow-sm transition hover:shadow-md"
                  >
                    {isVid ? (
                      <video
                        src={imgUrl(img)}
                        className="h-full w-full object-cover"
                        controls
                        muted
                        playsInline
                      />
                    ) : (
                      <img src={imgUrl(img)} alt="" className="h-full w-full object-cover" />
                    )}

                    {isVid && (
                      <span className="absolute top-1 left-1 z-10 rounded bg-red-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white flex items-center gap-0.5 shadow">
                        <Video className="h-2.5 w-2.5" /> Video
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveExistingImg(img)}
                      className="absolute right-1 top-1 z-10 rounded-full bg-ink-900/80 p-1 text-white hover:bg-red-600 transition shadow"
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {i === 0 && !isVid && (
                      <span className="absolute bottom-1 left-1 z-10 rounded bg-ink-900/90 px-1.5 text-[10px] font-bold text-white shadow">
                        Cover
                      </span>
                    )}
                  </div>
                );
              })}

              {/* New Selected Files */}
              {previewItems.map((item, i) => (
                <div
                  key={item.url}
                  className="group relative h-28 w-28 overflow-hidden rounded-xl border-2 border-emerald-500 bg-black shadow-sm transition hover:shadow-md"
                >
                  {item.isVideo ? (
                    <video
                      src={item.url}
                      className="h-full w-full object-cover"
                      controls
                      muted
                      playsInline
                    />
                  ) : (
                    <img src={item.url} alt="" className="h-full w-full object-cover" />
                  )}

                  {item.isVideo ? (
                    <span className="absolute top-1 left-1 z-10 rounded bg-red-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white flex items-center gap-0.5 shadow">
                      <Video className="h-2.5 w-2.5" /> Video
                    </span>
                  ) : (
                    <span className="absolute bottom-1 left-1 z-10 rounded bg-emerald-600 px-1.5 text-[10px] font-bold text-white shadow">
                      New
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveNewFile(i)}
                    className="absolute right-1 top-1 z-10 rounded-full bg-ink-900/80 p-1 text-white hover:bg-red-600 transition shadow"
                    title="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {/* Quick Append Buttons when media exists */}
              {totalImages > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="flex h-28 w-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-white text-stone-500 hover:border-brass-600 hover:text-brass-700 transition"
                    title="Add more photos"
                  >
                    <ImagePlus className="h-5 w-5 mb-1 text-stone-400" />
                    <span className="text-[10px] font-bold">+ Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="flex h-28 w-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-purple-300 bg-purple-50/50 text-purple-600 hover:border-purple-600 hover:text-purple-800 transition"
                    title="Add video"
                  >
                    <Video className="h-5 w-5 mb-1 text-purple-500" />
                    <span className="text-[10px] font-bold">+ Video</span>
                  </button>
                </>
              )}

              {totalImages === 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  <div
                    onClick={() => photoInputRef.current?.click()}
                    className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 p-4 text-xs text-stone-600 hover:border-emerald-600 hover:bg-emerald-50/40 hover:text-emerald-700 bg-white transition group"
                  >
                    <ImagePlus className="mb-1.5 h-6 w-6 text-stone-400 group-hover:text-emerald-600 transition" />
                    <span className="font-bold text-ink-900 group-hover:text-emerald-700">+ Add Photos (Images)</span>
                    <span className="text-[11px] text-stone-400 mt-0.5">JPG, PNG, WebP (Multiple allowed)</span>
                  </div>

                  <div
                    onClick={() => videoInputRef.current?.click()}
                    className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-purple-300 p-4 text-xs text-purple-700 hover:border-purple-600 hover:bg-purple-50/50 bg-white transition group"
                  >
                    <Video className="mb-1.5 h-6 w-6 text-purple-500 group-hover:text-purple-700 group-hover:scale-110 transition" />
                    <span className="font-bold text-purple-900 group-hover:text-purple-700">+ Add Product Video</span>
                    <span className="text-[11px] text-purple-500 mt-0.5">MP4, WebM, MOV (Up to 100MB)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Pricing & Stock */}
      {activeTab === "pricing" && (
        <div className="p-6 space-y-5 animate-fadeIn">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Selling Price (₹) *" hint="Final price user pays">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-2.5 text-stone-400 font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  required
                  className="input pl-8 font-bold text-ink-900 text-base"
                  placeholder="e.g. 3799"
                  value={variant.price}
                  onChange={(e) => onUpdate({ ...variant, price: e.target.value })}
                />
              </div>
            </Field>

            <Field label="MRP / List Price (₹)" hint="Amazon strikethrough price">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-2.5 text-stone-400 font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  className="input pl-8"
                  placeholder="e.g. 7598"
                  value={variant.mrp}
                  onChange={(e) => onUpdate({ ...variant, mrp: e.target.value })}
                />
              </div>
            </Field>

            <Field label="Tax Percentage (%)">
              <input
                type="number"
                min="0"
                max="100"
                className="input"
                placeholder="e.g. 18"
                value={variant.taxPercentage ?? 0}
                onChange={(e) => onUpdate({ ...variant, taxPercentage: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Quantity in Stock" hint="Available inventory">
              <input
                type="number"
                min="0"
                className="input"
                value={variant.stockQuantity}
                onChange={(e) => onUpdate({ ...variant, stockQuantity: e.target.value })}
              />
            </Field>

            <Field label="Low Stock Alert At" hint="Notify when stock is below">
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
                <option value="in_stock">In Stock (Available)</option>
                <option value="low_stock">Low Stock (Limited)</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </Field>
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-700 rounded"
                checked={!!variant.allowBackorder}
                onChange={(e) => onUpdate({ ...variant, allowBackorder: e.target.checked })}
              />{" "}
              Allow customers to order when out of stock (Backorder)
            </label>
          </div>
        </div>
      )}

      {/* Tab 3: Dimensions & Specs */}
      {activeTab === "specs" && (
        <div className="p-6 space-y-5 animate-fadeIn">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Brand">
              <input
                className="input"
                placeholder="e.g. Furnex"
                value={specs.brand || "Furnex"}
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
                placeholder="e.g. Breathable Mesh / Leatherette"
                value={specs.upholstery || ""}
                onChange={(e) => setSpec("upholstery", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                placeholder="e.g. 2 Years Manufacturer Warranty"
                value={specs.warranty || ""}
                onChange={(e) => setSpec("warranty", e.target.value)}
              />
            </Field>

            <Field label="Weight">
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 14"
                  className="input"
                  value={specs.weight || ""}
                  onChange={(e) => setSpec("weight", e.target.value)}
                />
                <select
                  className="input !w-24 shrink-0 font-medium"
                  value={specs.weightUnit || "kg"}
                  onChange={(e) => setSpec("weightUnit", e.target.value)}
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                </select>
              </div>
            </Field>
          </div>

          <Field label="Dimensions (Length / Width / Height)">
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
                className="input !w-24 shrink-0 font-medium"
                value={dims.unit || "cm"}
                onChange={(e) => setDim("unit", e.target.value)}
              >
                <option value="cm">cm</option>
                <option value="inch">inch</option>
                <option value="mm">mm</option>
              </select>
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2 pt-1">
            <label className="flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-700 rounded"
                checked={!!specs.assemblyRequired}
                onChange={(e) => setSpec("assemblyRequired", e.target.checked)}
              />{" "}
              Assembly Required by Customer
            </label>
          </div>

          <Field label="Specific Features / Notes for this Variant (Optional)">
            <input
              className="input text-xs"
              placeholder="e.g. 2D adjustable armrests, heavy duty chrome wheelbase"
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
    <label className="flex items-center gap-2 pt-1 text-sm font-medium text-stone-700 cursor-pointer">
      <input
        type="checkbox"
        className="h-4 w-4 accent-emerald-700 rounded"
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
    const nextCount = (p.colorVariants || []).length + 1;
    setP((prev) => ({
      ...prev,
      colorVariants: [
        ...(prev.colorVariants || []),
        {
          ...EMPTY_VARIANT,
          colorName: `Color #${nextCount}`,
          colorHex: COLOR_PRESETS[nextCount % COLOR_PRESETS.length]?.hex || "#1a1a1a",
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
    <form onSubmit={submit} className="space-y-6 pb-28">
      {/* Page Title */}
      <div>
        <Link
          to="/products"
          className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 hover:text-ink-900 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to products
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
          {isEdit ? "Edit Product" : "Add New Product"}
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Enter product details and manage variants (colors, photos, pricing, and specs).
        </p>
      </div>

      {/* 1. BASIC DETAILS */}
      <Section
        title="Basic Details"
        hint="General product identification and categories"
        icon={Package}
      >
        <Field label="Product Name *" className="sm:col-span-2">
          <input className="input font-semibold" required {...bind("name")} placeholder="e.g. Ergonomic Office Mesh Chair" />
        </Field>
        <Field label="Base SKU *">
          <input className="input uppercase font-mono" required {...bind("sku")} placeholder="e.g. FURN-CH-01" />
        </Field>
        <Field label="Slug *" hint="URL path for this product" className="sm:col-span-2">
          <input
            className="input font-mono text-xs"
            required
            value={p.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", e.target.value);
            }}
          />
        </Field>
        <Field label="Display Order" hint="Lower numbers appear first">
          <input type="number" min="0" className="input" {...bind("displayOrder")} />
        </Field>
        <Field label="Category *">
          <select className="input font-medium" required {...bind("category")}>
            <option value="">Select Category…</option>
            {cats.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Subcategory"
          hint={!p.category ? "Choose a category first" : undefined}
        >
          <select className="input font-medium" disabled={!p.category} {...bind("subcategory")}>
            <option value="">None / All</option>
            {subOptions.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Short Description" hint="Shown in search previews" className="sm:col-span-2 lg:col-span-3">
          <input className="input" maxLength={500} {...bind("shortDescription")} placeholder="e.g. Premium ergonomic chair with breathable mesh and lumbar support" />
        </Field>
        <Field label="Full Description" hint="Detailed overview of the product" className="sm:col-span-2 lg:col-span-3">
          <textarea
            className="input min-h-[120px] leading-relaxed"
            maxLength={5000}
            {...bind("description")}
            placeholder="Write full product overview, features, and styling tips..."
          />
        </Field>
      </Section>

      {/* 2. PRODUCT VARIANTS (CONTAINING ALL DETAILS) */}
      <section className="card shadow-sm border border-stone-200 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 bg-stone-50/90 px-6 py-4 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-700" />
              <h2 className="text-base font-bold text-ink-900">
                Product Variants & Colors (Amazon Style)
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Har variant ke andar uski saari photos, pricing, stock, aur specs manage karein.
            </p>
          </div>

          <button
            type="button"
            onClick={addVariant}
            className="btn-brass !py-1.5 !px-3.5 !text-xs self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" /> Add Another Variant
          </button>
        </div>

        <div className="p-6 space-y-6 bg-stone-50/40">
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
      <Section
        title="Delivery & Returns"
        hint="Shipping timeframe and return guarantees"
        icon={Truck}
      >
        <Field label="Estimated Delivery">
          <input
            className="input"
            placeholder="e.g. 5-7 business days"
            {...bind("delivery.estimatedDays")}
          />
        </Field>
        <Field label="Return Window (Days)">
          <input
            type="number"
            min="0"
            className="input"
            {...bind("delivery.returnWindowDays")}
          />
        </Field>
        <div className="space-y-2 pt-2">
          {check("delivery.freeDelivery", "Free Delivery available")}
          {check("delivery.returnable", "Product is Returnable")}
        </div>
      </Section>

      {/* 4. VISIBILITY & SETTINGS */}
      <Section
        title="Store Visibility & Badges"
        hint="Control product badges and catalog search tags"
        icon={Sparkles}
      >
        <Field label="Search Tags" hint="Comma-separated keywords" className="sm:col-span-2">
          <input
            className="input"
            placeholder="e.g. ergonomic, mesh chair, lumbar, office furniture"
            {...bind("tags")}
          />
        </Field>
        <div className="space-y-2 pt-2">
          {check("isFeatured", "Featured Product (Highlights on Homepage)")}
          {check("isBestSeller", "Best Seller Badge")}
          {check("isActive", "Active (Visible in Store)")}
        </div>
      </Section>

      {/* Floating Save Footer */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 px-6 py-4 backdrop-blur shadow-lg lg:left-64">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <p className="text-xs text-stone-500 hidden sm:block">
            {(p.colorVariants || []).length} {(p.colorVariants || []).length === 1 ? "variant" : "variants"} configured
          </p>
          <div className="flex justify-end gap-2.5 w-full sm:w-auto">
            <Link to="/products" className="btn-ghost">
              Cancel
            </Link>
            <button className="btn-primary" disabled={saving}>
              {saving && <Spinner className="h-4 w-4" />}
              {isEdit ? "Save Changes" : "Create Product"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
