import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  ExternalLink,
  Upload,
  Eye,
  Film,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { galleryApi } from "../api/services";
import { errMsg, formatDate, formatFileSize, getList, imgUrl } from "../utils/helpers";
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  PageLoader,
  Pagination,
  Spinner,
  Toggle,
} from "../components/ui";

const PER_PAGE = 12;

const MEDIA_TYPES = [
  { key: "all", label: "All Media", icon: Sparkles },
  { key: "image", label: "Photos", icon: ImageIcon },
  { key: "video", label: "Videos", icon: VideoIcon },
  { key: "pdf", label: "PDFs", icon: FileText },
];

const CATEGORY_SUGGESTIONS = [
  "Showroom",
  "Factory",
  "Products",
  "Exhibition",
  "Certificates",
  "Catalogues",
  "Client Sites",
];

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "Showroom",
  mediaType: "image",
  displayOrder: 0,
  isActive: true,
};

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);

  // Form State
  const [editing, setEditing] = useState(null); // null = closed, {} = new, obj = edit
  const [form, setForm] = useState(EMPTY_FORM);
  const [primaryFile, setPrimaryFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  // Preview lightbox modal
  const [viewingItem, setViewingItem] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, catRes] = await Promise.all([
        galleryApi.list({ limit: 1000 }),
        galleryApi.getCategories().catch(() => ({ data: { data: [] } })),
      ]);
      const list = getList(res);
      setItems(list);

      const fetchedCats = catRes.data?.data || [];
      const distinctCats = Array.from(
        new Set([...CATEGORY_SUGGESTIONS, ...fetchedCats, ...list.map((i) => i.category).filter(Boolean)])
      );
      setCategories(distinctCats);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Client side filtering
  const filtered = useMemo(() => {
    return items.filter((item) => {
      // Type filter
      if (selectedType !== "all" && item.mediaType !== selectedType) {
        return false;
      }
      // Category filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const inTitle = (item.title || "").toLowerCase().includes(q);
        const inDesc = (item.description || "").toLowerCase().includes(q);
        const inCat = (item.category || "").toLowerCase().includes(q);
        const inFileName = (item.fileName || "").toLowerCase().includes(q);
        return inTitle || inDesc || inCat || inFileName;
      }
      return true;
    });
  }, [items, selectedType, selectedCategory, search]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Open Form
  const openForm = (item = null) => {
    if (item) {
      setEditing(item);
      setForm({
        title: item.title || "",
        description: item.description || "",
        category: item.category || "General",
        mediaType: item.mediaType || "image",
        displayOrder: item.displayOrder ?? 0,
        isActive: item.isActive ?? true,
      });
      setPreviewUrl(item.fileUrl ? imgUrl(item.fileUrl) : null);
    } else {
      setEditing({});
      setForm(EMPTY_FORM);
      setPreviewUrl(null);
    }
    setPrimaryFile(null);
    setThumbnailFile(null);
  };

  const closeForm = () => {
    setEditing(null);
    setPrimaryFile(null);
    setThumbnailFile(null);
    setPreviewUrl(null);
  };

  // Handle Primary File Selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPrimaryFile(file);

    // Auto-detect mediaType
    let detected = "image";
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (file.type.startsWith("video/") || [".mp4", ".webm", ".mkv", ".mov", ".avi"].includes(ext)) {
      detected = "video";
    } else if (file.type === "application/pdf" || ext === ".pdf") {
      detected = "pdf";
    }
    setForm((prev) => ({
      ...prev,
      mediaType: detected,
      title: prev.title ? prev.title : file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " "),
    }));

    if (detected === "image" || detected === "video") {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  // Submit Save
  const handleSave = async (e) => {
    e.preventDefault();
    const isNew = !editing._id;

    if (isNew && !primaryFile) {
      return toast.error("Please choose a file to upload (Photo, Video, or PDF).");
    }

    if (!form.title.trim()) {
      return toast.error("Title is required.");
    }

    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("description", form.description.trim());
    fd.append("category", form.category.trim());
    fd.append("mediaType", form.mediaType);
    fd.append("displayOrder", String(form.displayOrder || 0));
    fd.append("isActive", String(form.isActive));

    if (primaryFile) {
      fd.append("file", primaryFile);
    }
    if (thumbnailFile) {
      fd.append("thumbnail", thumbnailFile);
    }

    setSaving(true);
    try {
      if (isNew) {
        await galleryApi.create(fd);
        toast.success("Gallery item added successfully!");
      } else {
        await galleryApi.update(editing._id, fd);
        toast.success("Gallery item updated successfully!");
      }
      closeForm();
      loadData();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  // Toggle Active
  const handleToggle = async (item, val) => {
    setItems((prev) => prev.map((i) => (i._id === item._id ? { ...i, isActive: val } : i)));
    try {
      await galleryApi.setStatus(item._id, val);
      toast.success(val ? "Visible on website" : "Hidden from website");
    } catch (err) {
      toast.error(errMsg(err));
      loadData();
    }
  };

  // Delete Item
  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await galleryApi.remove(deleting._id);
      toast.success("Gallery item deleted!");
      setDeleting(null);
      loadData();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const getMediaBadge = (type) => {
    switch (type) {
      case "video":
        return <Badge tone="blue">Video</Badge>;
      case "pdf":
        return <Badge tone="red">PDF Doc</Badge>;
      case "image":
      default:
        return <Badge tone="green">Photo</Badge>;
    }
  };

  return (
    <>
      <PageHeader
        title="Gallery"
        subtitle="Upload and organize showroom photos, factory videos, and PDF brochures."
        action={
          <button className="btn-primary" onClick={() => openForm()}>
            <Plus className="h-4 w-4" /> Add media
          </button>
        }
      />

      {/* Filters and Search Bar */}
      <div className="card mb-6 overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-stone-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Media Type Tabs */}
          <div className="flex flex-wrap gap-1 rounded-xl bg-stone-100 p-1">
            {MEDIA_TYPES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedType(key);
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  selectedType === key
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-1 flex-col gap-2 sm:max-w-md sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <input
                className="input pl-9"
                placeholder="Search title, category..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              className="input sm:w-44"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Gallery Content */}
        {loading ? (
          <PageLoader />
        ) : visible.length === 0 ? (
          <EmptyState
            title={search || selectedType !== "all" || selectedCategory !== "all" ? "No matching media found" : "Gallery is empty"}
            text={
              search || selectedType !== "all"
                ? "Try changing your search keywords or filter."
                : "Add your first photos, videos, or PDF catalogues to showcase them on your website."
            }
            action={
              !search && selectedType === "all" && (
                <button className="btn-primary" onClick={() => openForm()}>
                  <Plus className="h-4 w-4" /> Add media
                </button>
              )
            }
          />
        ) : (
          <div className="p-4 sm:p-6">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((item) => {
                const isImg = item.mediaType === "image";
                const isVid = item.mediaType === "video";
                const isPdf = item.mediaType === "pdf";
                const fileFullUrl = imgUrl(item.fileUrl);
                const thumbFullUrl = item.thumbnailUrl ? imgUrl(item.thumbnailUrl) : fileFullUrl;

                return (
                  <div
                    key={item._id}
                    className="group flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md"
                  >
                    {/* Media Thumbnail Container */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100 flex items-center justify-center">
                      {isImg && (
                        <img
                          src={fileFullUrl}
                          alt={item.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            if (e.currentTarget.nextElementSibling) {
                              e.currentTarget.nextElementSibling.style.display = "flex";
                            }
                          }}
                        />
                      )}

                      {isVid && (
                        <div className="relative h-full w-full bg-stone-900 flex items-center justify-center">
                          {item.thumbnailUrl ? (
                            <img src={thumbFullUrl} alt="" className="h-full w-full object-cover opacity-75" />
                          ) : (
                            <video src={fileFullUrl} className="h-full w-full object-cover opacity-80" />
                          )}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur transition group-hover:scale-110 group-hover:bg-brass-500">
                              <Film className="h-6 w-6" />
                            </span>
                          </div>
                        </div>
                      )}

                      {isPdf && (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-red-50/50 p-4 text-center">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 shadow-sm transition group-hover:scale-110">
                            <FileText className="h-8 w-8" />
                          </div>
                          <p className="mt-2 text-xs font-bold text-red-800 uppercase tracking-wider">PDF Document</p>
                          <p className="text-[11px] text-stone-500">{formatFileSize(item.fileSize)}</p>
                        </div>
                      )}

                      {/* Fallback box */}
                      <div
                        className="hidden h-full w-full flex-col items-center justify-center text-stone-400"
                        style={{ display: "none" }}
                      >
                        <ImageIcon className="h-8 w-8" />
                        <span className="text-xs">No preview</span>
                      </div>

                      {/* Top Overlay Badge & Actions */}
                      <div className="absolute left-2.5 top-2.5">
                        {getMediaBadge(item.mediaType)}
                      </div>

                      <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5 opacity-90 transition group-hover:opacity-100">
                        <button
                          onClick={() => setViewingItem(item)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-stone-700 shadow-sm backdrop-blur hover:bg-white hover:text-ink-900"
                          title="Quick preview"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <a
                          href={fileFullUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-stone-700 shadow-sm backdrop-blur hover:bg-white hover:text-ink-900"
                          title="Open original file in new tab"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* Card Details */}
                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="inline-block rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
                            {item.category || "General"}
                          </span>
                          <span className="text-[11px] text-stone-400">Order: {item.displayOrder}</span>
                        </div>
                        <h3 className="line-clamp-1 font-bold text-stone-900" title={item.title}>
                          {item.title}
                        </h3>
                        {item.description ? (
                          <p className="mt-1 line-clamp-2 text-xs text-stone-500">{item.description}</p>
                        ) : (
                          <p className="mt-1 text-xs italic text-stone-400">No description</p>
                        )}
                      </div>

                      {/* Bottom Footer with Toggle & Actions */}
                      <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
                        <div className="flex items-center gap-2">
                          <Toggle
                            checked={!!item.isActive}
                            onChange={(val) => handleToggle(item, val)}
                            label="Show on website"
                          />
                          <span className="text-xs text-stone-500">
                            {item.isActive ? "Visible" : "Hidden"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openForm(item)}
                            className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-100 hover:text-ink-900"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleting(item)}
                            className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Pagination page={page} pages={pages} onChange={setPage} />
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={!!editing}
        onClose={closeForm}
        wide
        title={editing?._id ? "Edit gallery media" : "Add media to gallery"}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={closeForm}>
              Cancel
            </button>
            <button
              form="gallery-form"
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving && <Spinner className="h-4 w-4" />}
              {editing?._id ? "Save changes" : "Upload media"}
            </button>
          </>
        }
      >
        <form id="gallery-form" onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
          {/* File Picker with Live Preview */}
          <div className="sm:col-span-2">
            <Field
              label={editing?._id ? "Media File (Photo, Video, or PDF)" : "Media File (Photo, Video, or PDF) *"}
              hint="Allowed: JPG, PNG, WebP, GIF, MP4, WebM, MKV, MOV, and PDF (Max 100MB)."
            >
              <div className="mt-1 space-y-3">
                {/* Existing or New Preview */}
                {(previewUrl || primaryFile || editing?.fileUrl) && (
                  <div className="relative overflow-hidden rounded-xl border border-stone-200 bg-stone-50 p-3">
                    <div className="flex flex-col items-center gap-3 sm:flex-row">
                      {form.mediaType === "image" && (previewUrl || editing?.fileUrl) && (
                        <img
                          src={previewUrl || imgUrl(editing.fileUrl)}
                          alt="Preview"
                          className="h-28 w-44 rounded-lg object-cover shadow-sm"
                        />
                      )}
                      {form.mediaType === "video" && (
                        <div className="h-28 w-44 overflow-hidden rounded-lg bg-black">
                          <video
                            src={previewUrl || imgUrl(editing?.fileUrl)}
                            controls
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      {form.mediaType === "pdf" && (
                        <div className="flex h-28 w-44 flex-col items-center justify-center rounded-lg bg-red-100 text-red-600">
                          <FileText className="h-10 w-10" />
                          <span className="mt-1 text-xs font-bold uppercase">PDF Document</span>
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {getMediaBadge(form.mediaType)}
                          <span className="text-xs text-stone-500">
                            {primaryFile
                              ? formatFileSize(primaryFile.size)
                              : editing?.fileSize
                              ? formatFileSize(editing.fileSize)
                              : ""}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm font-semibold text-stone-800">
                          {primaryFile ? primaryFile.name : editing?.fileName || form.title || "Uploaded file"}
                        </p>
                        <p className="text-xs text-stone-500">
                          {primaryFile
                            ? "New file selected — ready to upload"
                            : "Current file — choose a new file below to replace it"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* File input trigger */}
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-stone-50/70 p-5 text-center transition hover:border-brass-500 hover:bg-brass-50/30">
                  <Upload className="mb-2 h-7 w-7 text-stone-400 group-hover:text-brass-500" />
                  <span className="text-sm font-bold text-stone-700">
                    {primaryFile || editing?._id ? "Change or replace file" : "Click to select a Photo, Video, or PDF"}
                  </span>
                  <span className="mt-0.5 text-xs text-stone-500">
                    Supports Photos (.jpg, .png, .webp, .gif), Videos (.mp4, .mov, .mkv), and Documents (.pdf)
                  </span>
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/*,video/*,application/pdf"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </Field>
          </div>

          {/* Media Type Selector */}
          <Field label="Media Type *" hint="Auto-detected from file, or choose manually.">
            <select
              className="input"
              value={form.mediaType}
              onChange={(e) => setForm({ ...form, mediaType: e.target.value })}
              required
            >
              <option value="image">Photo / Image</option>
              <option value="video">Video</option>
              <option value="pdf">PDF Document / Catalogue</option>
            </select>
          </Field>

          {/* Category */}
          <Field label="Category *" hint="Group e.g. Showroom, Factory, Catalogue">
            <div className="space-y-1.5">
              <input
                className="input"
                list="category-suggestions"
                required
                placeholder="e.g. Showroom, Factory, Catalogues"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
              <datalist id="category-suggestions">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </Field>

          {/* Title */}
          <Field label="Title *" className="sm:col-span-2">
            <input
              className="input"
              required
              placeholder="e.g. Modern Office Desk Showcase 2026"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>

          {/* Description */}
          <Field label="Description" className="sm:col-span-2">
            <textarea
              className="input min-h-[75px]"
              placeholder="Brief details about this photo, video, or document..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>

          {/* Optional Video/PDF Thumbnail Image */}
          {(form.mediaType === "video" || form.mediaType === "pdf") && (
            <Field
              label="Custom Poster Thumbnail (Optional)"
              hint="Optional image to display before playing video or on PDF card."
              className="sm:col-span-2"
            >
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="input file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-2.5 file:py-1 file:text-xs file:font-semibold hover:file:bg-stone-200"
                  onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                />
                {editing?.thumbnailUrl && !thumbnailFile && (
                  <img
                    src={imgUrl(editing.thumbnailUrl)}
                    alt=""
                    className="h-9 w-14 shrink-0 rounded object-cover border"
                  />
                )}
              </div>
            </Field>
          )}

          {/* Display Order */}
          <Field label="Display Order" hint="Lower numbers show first (e.g. 1, 2, 3)">
            <input
              className="input"
              type="number"
              min="0"
              value={form.displayOrder}
              onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) || 0 })}
            />
          </Field>

          {/* Visible Checkbox */}
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-stone-700">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-700"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Show immediately on website
            </label>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        busy={saving}
        title="Delete gallery media?"
        text={`"${deleting?.title}" will be deleted permanently. The uploaded file will also be removed from the server.`}
      />

      {/* Quick View Lightbox Modal */}
      {viewingItem && (
        <Modal
          open={!!viewingItem}
          onClose={() => setViewingItem(null)}
          title={viewingItem.title}
          footer={
            <div className="flex w-full items-center justify-between">
              <span className="text-xs text-stone-500">
                {viewingItem.category} • {formatDate(viewingItem.createdAt)} • {formatFileSize(viewingItem.fileSize)}
              </span>
              <a
                href={imgUrl(viewingItem.fileUrl)}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
              >
                <ExternalLink className="h-4 w-4" /> Open file
              </a>
            </div>
          }
        >
          <div className="flex flex-col items-center justify-center p-2">
            {viewingItem.mediaType === "image" && (
              <img
                src={imgUrl(viewingItem.fileUrl)}
                alt={viewingItem.title}
                className="max-h-[60vh] w-auto rounded-lg object-contain shadow"
              />
            )}
            {viewingItem.mediaType === "video" && (
              <video
                src={imgUrl(viewingItem.fileUrl)}
                controls
                autoPlay
                className="max-h-[60vh] w-full rounded-lg bg-black"
              />
            )}
            {viewingItem.mediaType === "pdf" && (
              <div className="w-full space-y-4 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                  <FileText className="h-12 w-12" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-800">{viewingItem.fileName || viewingItem.title}</h4>
                  <p className="text-xs text-stone-500 mt-1">{formatFileSize(viewingItem.fileSize)}</p>
                </div>
                <iframe
                  src={imgUrl(viewingItem.fileUrl)}
                  title={viewingItem.title}
                  className="h-80 w-full rounded-lg border border-stone-200"
                />
              </div>
            )}
            {viewingItem.description && (
              <p className="mt-4 text-sm text-stone-600 w-full text-left">{viewingItem.description}</p>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
