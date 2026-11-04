import { useCallback, useEffect, useMemo, useState } from "react";
import { Star, Trash2, Search, Filter, CheckCircle2, Eye, X, Image as ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import { productReviewsApi } from "../api/services";
import { errMsg, formatDate, imgUrl } from "../utils/helpers";
import {
  ConfirmDialog,
  EmptyState,
  PageHeader,
  PageLoader,
  Toggle,
  Badge,
  Modal,
} from "../components/ui";

export default function ProductReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [toDelete, setToDelete] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await productReviewsApi.list({ limit: 1000 });
      const data = res.data?.data || res.data || [];
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(errMsg(err, "Failed to load product reviews"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (ratingFilter !== "all" && r.rating !== Number(ratingFilter)) return false;
      if (activeFilter === "active" && !r.isActive) return false;
      if (activeFilter === "inactive" && r.isActive) return false;
      if (!q.trim()) return true;

      const search = q.toLowerCase();
      const userName = r.user?.fullName?.toLowerCase() || "";
      const userEmail = r.user?.email?.toLowerCase() || "";
      const userPhone = r.user?.mobile?.toLowerCase() || "";
      const productName = r.product?.name?.toLowerCase() || "";
      const productSku = r.product?.sku?.toLowerCase() || "";
      const comment = r.comment?.toLowerCase() || "";
      const title = r.title?.toLowerCase() || "";

      return (
        userName.includes(search) ||
        userEmail.includes(search) ||
        userPhone.includes(search) ||
        productName.includes(search) ||
        productSku.includes(search) ||
        comment.includes(search) ||
        title.includes(search)
      );
    });
  }, [reviews, q, ratingFilter, activeFilter]);

  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) return { total: 0, avg: 0, star5: 0, star4: 0, star3: 0, star2: 0, star1: 0 };
    const sum = reviews.reduce((acc, curr) => acc + (curr.rating || 0), 0);
    const avg = (sum / total).toFixed(1);
    const star5 = reviews.filter((r) => r.rating === 5).length;
    const star4 = reviews.filter((r) => r.rating === 4).length;
    const star3 = reviews.filter((r) => r.rating === 3).length;
    const star2 = reviews.filter((r) => r.rating === 2).length;
    const star1 = reviews.filter((r) => r.rating === 1).length;
    return { total, avg, star5, star4, star3, star2, star1 };
  }, [reviews]);

  const handleToggleStatus = async (review) => {
    const newStatus = !review.isActive;
    try {
      setReviews((prev) =>
        prev.map((r) => (r._id === review._id ? { ...r, isActive: newStatus } : r))
      );
      await productReviewsApi.setStatus(review._id, newStatus);
      toast.success(newStatus ? "Review published on website" : "Review hidden from website");
    } catch (err) {
      toast.error(errMsg(err, "Failed to update review visibility"));
      await fetchReviews();
    }
  };

  const handleDelete = async () => {
    if (!toDelete?._id) return;
    try {
      await productReviewsApi.remove(toDelete._id);
      toast.success("Review deleted successfully");
      setToDelete(null);
      await fetchReviews();
    } catch (err) {
      toast.error(errMsg(err, "Failed to delete review"));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Reviews"
        subtitle="Customer ratings, feedback comments, and photos submitted after receiving booked furniture."
      />

      {/* Summary Scorecards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-stone-500">Total Reviews</p>
          <p className="mt-2 text-2xl font-black text-stone-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-stone-500">Average Rating</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl font-black text-amber-500">{stats.avg}</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-4 w-4 ${
                    s <= Math.round(Number(stats.avg))
                      ? "fill-amber-400 text-amber-400"
                      : "text-stone-300"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-stone-500">5 Star Reviews</p>
          <p className="mt-2 text-2xl font-black text-emerald-600">{stats.star5}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-stone-500">1 - 3 Star Reviews</p>
          <p className="mt-2 text-2xl font-black text-stone-700">
            {stats.star1 + stats.star2 + stats.star3}
          </p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-stone-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by customer, product, SKU, or comment..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-lg border border-stone-200 py-1.5 pl-9 pr-3 text-sm focus:border-brass-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-stone-500">Rating:</label>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="rounded-lg border border-stone-200 py-1.5 pl-2.5 pr-8 text-xs font-medium focus:border-brass-500 focus:outline-none"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars only</option>
                <option value="4">4 Stars only</option>
                <option value="3">3 Stars only</option>
                <option value="2">2 Stars only</option>
                <option value="1">1 Star only</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-stone-500">Status:</label>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="rounded-lg border border-stone-200 py-1.5 pl-2.5 pr-8 text-xs font-medium focus:border-brass-500 focus:outline-none"
              >
                <option value="all">All ({reviews.length})</option>
                <option value="active">Active ({reviews.filter((r) => r.isActive).length})</option>
                <option value="inactive">Hidden ({reviews.filter((r) => !r.isActive).length})</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        {loading ? (
          <PageLoader />
        ) : filteredReviews.length === 0 ? (
          <EmptyState
            title="No product reviews found"
            text={
              q || ratingFilter !== "all" || activeFilter !== "all"
                ? "Try clearing your search or filter options"
                : "Customer reviews for booked products will appear here once submitted"
            }
          />
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredReviews.map((r) => {
              const productImg =
                r.product?.thumbnail ||
                (Array.isArray(r.product?.images) ? r.product?.images[0] : "");

              return (
                <div key={r._id} className="p-5 transition hover:bg-stone-50/50">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: Product & Customer info */}
                    <div className="flex items-start gap-3">
                      {productImg ? (
                        <img
                          src={imgUrl(productImg)}
                          alt={r.product?.name || "Product"}
                          className="h-16 w-16 shrink-0 rounded-lg border border-stone-200 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                      )}

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-stone-900">
                            {r.product?.name || "Unknown Product"}
                          </p>
                          {r.product?.sku && (
                            <span className="font-mono text-xs text-stone-400">
                              SKU: {r.product.sku}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                          <span className="font-semibold text-stone-700">
                            By: {r.user?.fullName || "Customer"}
                          </span>
                          {r.user?.email && <span>• {r.user.email}</span>}
                          {r.user?.mobile && <span>• {r.user.mobile}</span>}
                          {r.isVerifiedPurchase && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                              <CheckCircle2 className="h-3 w-3" /> Verified Buyer
                            </span>
                          )}
                        </div>

                        {/* Stars */}
                        <div className="mt-2 flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= (r.rating || 0)
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-stone-200"
                              }`}
                            />
                          ))}
                          <span className="ml-1 text-xs font-bold text-stone-700">
                            {r.rating}.0
                          </span>
                          <span className="text-xs text-stone-400">
                            • {formatDate(r.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status toggle & delete action */}
                    <div className="flex items-center gap-3 self-end sm:self-start">
                      <div className="flex items-center gap-2">
                        <Toggle
                          checked={Boolean(r.isActive)}
                          onChange={() => handleToggleStatus(r)}
                          label={`Toggle review visibility for ${r.product?.name}`}
                        />
                        <span className="text-xs text-stone-500">
                          {r.isActive ? "Published" : "Hidden"}
                        </span>
                      </div>

                      <button
                        onClick={() => setToDelete(r)}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-700"
                        title="Delete review"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Review Content */}
                  <div className="mt-3 pl-0 sm:pl-[76px]">
                    {r.title && (
                      <p className="font-semibold text-stone-800 text-sm">{r.title}</p>
                    )}
                    <p className="mt-1 text-sm text-stone-600 leading-relaxed whitespace-pre-line">
                      {r.comment}
                    </p>

                    {/* Review Uploaded Images */}
                    {Array.isArray(r.images) && r.images.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {r.images.map((img, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setPreviewImage(imgUrl(img))}
                            className="group relative h-20 w-20 overflow-hidden rounded-lg border border-stone-200 bg-stone-100 focus:outline-none focus:ring-2 focus:ring-brass-500"
                          >
                            <img
                              src={imgUrl(img)}
                              alt={`Review image ${idx + 1}`}
                              className="h-full w-full object-cover transition group-hover:scale-105"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition group-hover:opacity-100">
                              <Eye className="h-5 w-5 text-white" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Customer Review"
        message={`Are you sure you want to delete this review by "${toDelete?.user?.fullName || "User"}" on "${toDelete?.product?.name || "Product"}"?`}
        confirmText="Delete Review"
        danger
      />

      {/* Image Preview Lightbox */}
      <Modal
        open={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        title="Review Photo"
        wide
      >
        <div className="p-4 flex items-center justify-center bg-stone-900 rounded-b-2xl">
          <img
            src={previewImage}
            alt="Customer review uploaded photo"
            className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain"
          />
        </div>
      </Modal>
    </div>
  );
}
