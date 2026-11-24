import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Video,
  Play,
  Search,
  Star,
  Eye,
  ExternalLink,
  Palette,
  Check,
  Layers,
  Truck,
  ShieldCheck,
  Ruler,
  Package,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { categoriesApi, productsApi } from "../api/services";
import { errMsg, formatPrice, getList, idOf, imgUrl, isVideoMedia } from "../utils/helpers";
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  Modal,
  PageHeader,
  PageLoader,
  Pagination,
  Toggle,
} from "../components/ui";

const PER_PAGE = 10;
const STOCK = {
  in_stock: ["green", "In stock"],
  low_stock: ["amber", "Low stock"],
  out_of_stock: ["red", "Out of stock"],
  discontinued: ["gray", "Discontinued"],
};

// Rich Product Detail Viewer Modal
function ProductViewModal({ product, onClose }) {
  const [selectedVarIdx, setSelectedVarIdx] = useState(0);
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);

  const variants = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.variants) && product.variants.length > 0) return product.variants;
    if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0) return product.colorVariants;
    return [];
  }, [product]);

  // Set default variant if available
  useEffect(() => {
    if (variants.length > 0) {
      const defIdx = variants.findIndex((v) => v.isDefault);
      setSelectedVarIdx(defIdx >= 0 ? defIdx : 0);
      setSelectedImgIdx(0);
    }
  }, [variants]);

  if (!product) return null;

  const currentVar = variants[selectedVarIdx] || null;

  // Images for the active view
  const displayImages =
    currentVar && currentVar.images && currentVar.images.length > 0
      ? currentVar.images
      : Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : product.thumbnail
      ? [product.thumbnail]
      : [];

  const mainImg = displayImages[selectedImgIdx] || displayImages[0] || "";

  // Effective pricing & stock
  const price = currentVar?.price ?? product.pricing?.price;
  const mrp = currentVar?.mrp ?? product.pricing?.salePrice;
  const stockQty = currentVar?.stockQuantity ?? product.inventory?.stockQuantity ?? 0;
  const stockStatus = currentVar?.stockStatus ?? product.inventory?.stockStatus ?? "in_stock";
  const [stockTone, stockLabel] = STOCK[stockStatus] || STOCK.in_stock;

  // Specifications
  const specs = currentVar?.specifications || product.specifications || {};
  const dims = specs.dimensions || {};

  const discount =
    mrp && price && mrp > price
      ? Math.round(((mrp - price) / mrp) * 100)
      : null;

  return (
    <Modal
      open={!!product}
      onClose={onClose}
      title={product.name}
      wide={true}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <a
            href={`https://www.ashirwadfurnex.com/products/${product.slug || product._id}`}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost !text-xs inline-flex items-center gap-1.5 text-stone-600 hover:text-ink-900"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View on Live Website
          </a>

          <div className="flex gap-2">
            <button className="btn-ghost" onClick={onClose}>
              Close
            </button>
            <Link
              to={`/products/${product._id}/edit`}
              className="btn-primary inline-flex items-center gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit Product
            </Link>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Meta Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-md">
              SKU: {product.sku || "—"}
            </span>
            <Badge tone="gray">{product.category?.name || "Uncategorized"}</Badge>
            {product.subcategory?.name && (
              <Badge tone="blue">{product.subcategory.name}</Badge>
            )}
            {product.isFeatured && (
              <Badge tone="amber">
                <Star className="mr-1 h-3 w-3 fill-amber-500" /> Featured
              </Badge>
            )}
            {product.isBestSeller && <Badge tone="purple">Best Seller</Badge>}
          </div>

          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              product.isActive ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"
            }`}
          >
            {product.isActive ? "● Visible in Store" : "○ Hidden"}
          </span>
        </div>

        {/* Main Grid: Left Gallery + Right Details */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Gallery View */}
          <div>
            <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-900 shadow-inner flex items-center justify-center">
              {mainImg ? (
                isVideoMedia(mainImg) ? (
                  <video
                    src={imgUrl(mainImg)}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <img
                    src={imgUrl(mainImg)}
                    alt=""
                    className="h-full w-full object-cover transition duration-200"
                  />
                )
              ) : (
                <p className="text-xs text-stone-400">No media available</p>
              )}
            </div>

            {/* Thumbnails */}
            {displayImages.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {displayImages.map((src, i) => {
                  const isVid = isVideoMedia(src);
                  return (
                    <button
                      key={src + i}
                      type="button"
                      onClick={() => setSelectedImgIdx(i)}
                      className={`relative h-14 w-14 overflow-hidden rounded-lg border-2 transition ${
                        selectedImgIdx === i
                          ? "border-emerald-600 ring-2 ring-emerald-500/20"
                          : "border-stone-200 hover:border-stone-400"
                      }`}
                    >
                      {isVid ? (
                        <div className="h-full w-full bg-stone-900 flex items-center justify-center text-white">
                          <Play className="h-4 w-4 fill-white text-white" />
                        </div>
                      ) : (
                        <img src={imgUrl(src)} alt="" className="h-full w-full object-cover" />
                      )}
                      {isVid && (
                        <span className="absolute bottom-0.5 right-0.5 rounded bg-red-600 px-1 text-[8px] font-bold text-white">
                          VID
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pricing, Variants & Info */}
          <div className="space-y-4">
            {/* Price Box */}
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl font-extrabold text-ink-900">
                  {formatPrice(price)}
                </span>
                {mrp && mrp > price && (
                  <>
                    <span className="text-sm text-stone-400 line-through">
                      {formatPrice(mrp)}
                    </span>
                    {discount && (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-700">
                        {discount}% OFF
                      </span>
                    )}
                  </>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Badge tone={stockTone}>{stockLabel}</Badge>
                <span className="text-xs text-stone-500">({stockQty} in stock)</span>
              </div>
            </div>

            {/* Color Variants Selector (Amazon Style) */}
            {variants.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                  Color / Style Variants ({variants.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v, i) => {
                    const isSelected = selectedVarIdx === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setSelectedVarIdx(i);
                          setSelectedImgIdx(0);
                        }}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                          isSelected
                            ? "border-emerald-700 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-700"
                            : "border-stone-200 bg-white hover:bg-stone-50 text-stone-700"
                        }`}
                      >
                        <span
                          className="h-4 w-4 rounded-full border border-stone-300 shrink-0"
                          style={{ backgroundColor: v.colorHex || "#1a1a1a" }}
                        />
                        <span>{v.colorName || `Color #${i + 1}`}</span>
                        {v.isDefault && (
                          <span className="text-[10px] font-bold text-emerald-700">★</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Short Description */}
            {product.shortDescription && (
              <p className="text-xs text-stone-600 leading-relaxed border-l-2 border-brass-500 pl-3">
                {product.shortDescription}
              </p>
            )}

            {/* Current Variant Specific Specs Grid */}
            <div className="rounded-lg border border-stone-200 bg-white p-3.5 space-y-2 text-xs">
              <p className="font-bold text-stone-700 uppercase tracking-wider text-[11px]">
                Specifications {currentVar?.colorName ? `(${currentVar.colorName})` : ""}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-stone-600">
                <div>
                  <span className="text-stone-400">Brand:</span> {specs.brand || "—"}
                </div>
                <div>
                  <span className="text-stone-400">Material:</span> {specs.material || "—"}
                </div>
                <div>
                  <span className="text-stone-400">Upholstery:</span> {specs.upholstery || "—"}
                </div>
                <div>
                  <span className="text-stone-400">Seating:</span>{" "}
                  {specs.seatingCapacity ? `${specs.seatingCapacity} Persons` : "—"}
                </div>
                <div>
                  <span className="text-stone-400">Dimensions:</span>{" "}
                  {dims.length
                    ? `${dims.length}×${dims.width}×${dims.height} ${dims.unit || "cm"}`
                    : "—"}
                </div>
                <div>
                  <span className="text-stone-400">Weight:</span>{" "}
                  {specs.weight ? `${specs.weight} ${specs.weightUnit || "kg"}` : "—"}
                </div>
                <div>
                  <span className="text-stone-400">Assembly:</span>{" "}
                  {specs.assemblyRequired ? "Required" : "Pre-assembled"}
                </div>
                <div>
                  <span className="text-stone-400">Warranty:</span> {specs.warranty || "—"}
                </div>
              </div>
            </div>

            {/* Delivery Info */}
            <div className="flex items-center gap-4 text-xs text-stone-500 pt-1">
              <div className="flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-emerald-600" />
                <span>
                  {product.delivery?.freeDelivery ? "Free Delivery" : "Standard Delivery"}{" "}
                  {product.delivery?.estimatedDays ? `(${product.delivery.estimatedDays})` : ""}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>
                  {product.delivery?.returnable
                    ? `${product.delivery.returnWindowDays || 7} Days Returnable`
                    : "Non-returnable"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Full Description */}
        {product.description && (
          <div className="border-t border-stone-200 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
              Full Description
            </h4>
            <div className="rounded-lg bg-stone-50 p-4 text-xs text-stone-700 whitespace-pre-wrap leading-relaxed">
              {product.description}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function Products() {
  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([productsApi.list(), categoriesApi.list()]);
      setRows(getList(p));
      setCats(getList(c));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (p) =>
          (!cat || idOf(p.category) === cat) &&
          `${p.name} ${p.sku}`.toLowerCase().includes(q.toLowerCase())
      ),
    [rows, q, cat]
  );

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const toggle = async (p, val) => {
    setRows((rs) => rs.map((r) => (r._id === p._id ? { ...r, isActive: val } : r)));
    try {
      await productsApi.setStatus(p._id, val);
      toast.success(val ? "Now visible" : "Now hidden");
    } catch (e) {
      toast.error(errMsg(e));
      load();
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await productsApi.remove(deleting._id);
      toast.success("Product deleted");
      setDeleting(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const addBtn = (
    <Link to="/products/new" className="btn-primary">
      <Plus className="h-4 w-4" /> Add product
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Everything in your catalogue."
        action={addBtn}
      />
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-stone-200 p-4 sm:flex-row">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              className="input pl-9"
              placeholder="Search by name or SKU"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="input sm:w-56"
            value={cat}
            onChange={(e) => {
              setCat(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {cats.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <PageLoader />
        ) : visible.length === 0 ? (
          <EmptyState
            title={q || cat ? "No products found" : "No products yet"}
            text={
              q || cat
                ? "Try a different search or category."
                : "Add your first product to start selling."
            }
            action={!q && !cat && addBtn}
          />
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
                  const rawImg =
                    p.thumbnail ||
                    (Array.isArray(p.images) ? p.images[0] : p.images) ||
                    (Array.isArray(p.image) ? p.image[0] : p.image);
                  const resolvedImg = rawImg ? imgUrl(rawImg) : "";
                  const variantCount =
                    p.variants?.length || p.colorVariants?.length || 0;

                  return (
                    <tr key={p._id} className="hover:bg-stone-50/60 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setViewing(p)}
                            className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-stone-100 flex items-center justify-center text-stone-400 border border-stone-200 hover:opacity-80 transition"
                            title="Click to view details"
                          >
                            {resolvedImg ? (
                              isVideoMedia(rawImg) ? (
                                <div className="h-full w-full bg-stone-900 flex items-center justify-center text-white relative">
                                  <Play className="h-4 w-4 fill-white text-white" />
                                  <span className="absolute bottom-0.5 right-0.5 rounded bg-red-600 px-0.5 text-[8px] font-bold text-white leading-none">
                                    VID
                                  </span>
                                </div>
                              ) : (
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
                              )
                            ) : null}
                            <span
                              className="text-[10px] font-medium text-stone-400 select-none"
                              style={{ display: resolvedImg ? "none" : "flex" }}
                            >
                              No img
                            </span>
                          </button>

                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setViewing(p)}
                              className="text-left font-semibold text-ink-900 hover:text-emerald-700 truncate block max-w-xs transition"
                              title="Click to view details"
                            >
                              <span className="flex items-center gap-1 truncate">
                                {p.name}
                                {p.isFeatured && (
                                  <Star className="h-3.5 w-3.5 fill-brass-500 text-brass-500 shrink-0" />
                                )}
                              </span>
                            </button>
                            <p className="text-xs text-stone-500 flex items-center gap-2">
                              <span>{p.sku}</span>
                              {variantCount > 0 && (
                                <span className="rounded bg-stone-100 px-1.5 py-0.2 text-[10px] font-medium text-stone-600">
                                  {variantCount} {variantCount === 1 ? "variant" : "variants"}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="hidden px-4 py-3 text-stone-600 lg:table-cell">
                        {p.category?.name || "—"}
                      </td>

                      <td className="px-4 py-3">
                        {p.pricing?.salePrice ? (
                          <>
                            <span className="font-semibold">
                              {formatPrice(p.pricing.salePrice)}
                            </span>{" "}
                            <span className="text-xs text-stone-400 line-through">
                              {formatPrice(p.pricing.price)}
                            </span>
                          </>
                        ) : (
                          <span className="font-semibold">
                            {formatPrice(p.pricing?.price)}
                          </span>
                        )}
                      </td>

                      <td className="hidden px-4 py-3 md:table-cell">
                        <Badge tone={tone}>{label}</Badge>{" "}
                        <span className="text-xs text-stone-500">
                          {p.inventory?.stockQuantity}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <Toggle
                          checked={!!p.isActive}
                          onChange={(v) => toggle(p, v)}
                          label="Visible on website"
                        />
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewing(p)}
                            className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 hover:text-emerald-700 transition"
                            title="View Product Details"
                            aria-label="View Product Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <Link
                            to={`/products/${p._id}/edit`}
                            className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 hover:text-ink-900 transition"
                            title="Edit"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>

                          <button
                            type="button"
                            className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
                            onClick={() => setDeleting(p)}
                            title="Delete"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* Product Detail Viewer Modal */}
      {viewing && (
        <ProductViewModal product={viewing} onClose={() => setViewing(null)} />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        busy={busy}
        title="Delete product?"
        text={`"${deleting?.name}" will be removed permanently. This cannot be undone.`}
      />
    </>
  );
}
