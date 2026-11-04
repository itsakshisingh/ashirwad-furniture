import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, RotateCcw, Eye, Sparkles, Star } from "lucide-react";
import toast from "react-hot-toast";
import { reviewsApi } from "../api/services";
import { errMsg } from "../utils/helpers";
import {
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  PageLoader,
  Spinner,
  Toggle,
  Badge,
} from "../components/ui";

const INITIAL_FORM = {
  value: "",
  label: "",
  description: "",
  clientName: "",
  designation: "",
  rating: 5,
  displayOrder: 1,
  isActive: true,
};

export default function Reviews() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterActive, setFilterActive] = useState("all");
  const [editing, setEditing] = useState(null); // null = closed, {} = new, obj = edit
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [seeding, setSeeding] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await reviewsApi.list({ limit: 1000 });
      const data = res.data?.data || res.data || [];
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(errMsg(err, "Failed to load reviews/stats"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterActive === "active" && !item.isActive) return false;
      if (filterActive === "inactive" && item.isActive) return false;
      if (!q.trim()) return true;
      const search = q.toLowerCase();
      return (
        item.value?.toLowerCase().includes(search) ||
        item.label?.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search) ||
        item.clientName?.toLowerCase().includes(search)
      );
    });
  }, [items, q, filterActive]);

  const activeStats = useMemo(() => {
    return items
      .filter((i) => i.isActive)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [items]);

  const handleOpenAdd = () => {
    const nextOrder = items.length > 0 ? Math.max(...items.map((i) => i.displayOrder || 0)) + 1 : 1;
    setForm({
      ...INITIAL_FORM,
      displayOrder: nextOrder,
    });
    setEditing({});
  };

  const handleOpenEdit = (item) => {
    setForm({
      value: item.value || "",
      label: item.label || "",
      description: item.description || "",
      clientName: item.clientName || "",
      designation: item.designation || "",
      rating: item.rating || 5,
      displayOrder: item.displayOrder !== undefined ? item.displayOrder : 1,
      isActive: item.isActive !== undefined ? item.isActive : true,
    });
    setEditing(item);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.value.trim() || !form.label.trim()) {
      toast.error("Value (e.g. 9,000+) and Label (e.g. institutions served) are required");
      return;
    }

    try {
      setSaving(true);
      const isNew = !editing?._id;
      const payload = {
        value: form.value.trim(),
        label: form.label.trim(),
        description: form.description?.trim() || "",
        clientName: form.clientName?.trim() || "",
        designation: form.designation?.trim() || "",
        rating: Number(form.rating) || 5,
        displayOrder: Number(form.displayOrder) || 0,
        isActive: Boolean(form.isActive),
      };

      if (isNew) {
        await reviewsApi.create(payload);
        toast.success("Stat / review added successfully");
      } else {
        await reviewsApi.update(editing._id, payload);
        toast.success("Stat / review updated successfully");
      }

      setEditing(null);
      await fetchItems();
    } catch (err) {
      toast.error(errMsg(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item) => {
    const newStatus = !item.isActive;
    try {
      // Optimistic update
      setItems((prev) =>
        prev.map((i) => (i._id === item._id ? { ...i, isActive: newStatus } : i))
      );
      await reviewsApi.setStatus(item._id, newStatus);
      toast.success(newStatus ? "Visible on website" : "Hidden from website");
    } catch (err) {
      toast.error(errMsg(err, "Failed to change visibility"));
      await fetchItems();
    }
  };

  const handleDelete = async () => {
    if (!toDelete?._id) return;
    try {
      await reviewsApi.remove(toDelete._id);
      toast.success("Item deleted");
      setToDelete(null);
      await fetchItems();
    } catch (err) {
      toast.error(errMsg(err, "Failed to delete item"));
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm("Are you sure you want to re-seed the default 8 milestone stats?")) {
      return;
    }
    try {
      setSeeding(true);
      await reviewsApi.seed(false);
      toast.success("Default stats restored successfully");
      await fetchItems();
    } catch (err) {
      toast.error(errMsg(err, "Failed to seed defaults"));
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviews & Company Stats"
        subtitle="Manage website counter metrics (e.g. 9,000+ institutions served, 70 lakh+ students) and client reviews."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleResetDefaults}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:opacity-50"
            >
              {seeding ? <Spinner className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
              Reset Defaults
            </button>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 rounded-lg bg-brass-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brass-600"
            >
              <Plus className="h-4 w-4" />
              Add Stat / Review
            </button>
          </div>
        }
      />

      {/* Live website preview section */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brass-600" />
            <h2 className="text-base font-bold text-stone-900">Live Website Preview</h2>
            <Badge tone="green">{activeStats.length} Active</Badge>
          </div>
          <span className="text-xs text-stone-400">As shown on public pages</span>
        </div>

        {activeStats.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-400">
            No active stats to display. Add or enable stats below.
          </p>
        ) : (
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-md md:p-8">
            <div className="grid grid-cols-2 gap-y-8 md:grid-cols-4 md:divide-x md:divide-stone-200">
              {activeStats.map((st, idx) => (
                <div
                  key={st._id || idx}
                  className="flex flex-col justify-start px-3 py-1 sm:px-6"
                >
                  <p className="text-2xl font-black tracking-tight text-[#0b1f3a] sm:text-4xl">
                    {st.value}
                  </p>
                  <p className="mt-1 text-xs font-medium text-stone-500 sm:text-sm">
                    {st.label}
                  </p>
                  {st.description && (
                    <p className="mt-0.5 text-xs text-stone-400">{st.description}</p>
                  )}
                  {st.clientName && (
                    <span className="mt-1 text-[11px] font-semibold text-brass-700">
                      — {st.clientName}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Management table */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
        {/* Filters bar */}
        <div className="flex flex-col gap-3 border-b border-stone-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by value, label, description..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-lg border border-stone-200 py-1.5 pl-9 pr-3 text-sm focus:border-brass-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-stone-500">Filter:</label>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="rounded-lg border border-stone-200 py-1.5 pl-3 pr-8 text-sm focus:border-brass-500 focus:outline-none"
            >
              <option value="all">All ({items.length})</option>
              <option value="active">Active only ({items.filter((i) => i.isActive).length})</option>
              <option value="inactive">Hidden ({items.filter((i) => !i.isActive).length})</option>
            </select>
          </div>
        </div>

        {/* Content list */}
        {loading ? (
          <PageLoader />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="No stats or reviews found"
            text={q ? "Try clearing your search query" : "Get started by adding your first milestone or review"}
            action={
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brass-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brass-600"
              >
                <Plus className="h-4 w-4" /> Add Stat / Review
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-100 bg-stone-50/75 text-xs font-semibold text-stone-500">
                <tr>
                  <th className="px-4 py-3 text-center w-16">Order</th>
                  <th className="px-4 py-3">Value / Counter</th>
                  <th className="px-4 py-3">Label / Title</th>
                  <th className="px-4 py-3">Details / Note</th>
                  <th className="px-4 py-3 text-center">Visible</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredItems.map((item) => (
                  <tr key={item._id} className="hover:bg-stone-50/50">
                    <td className="px-4 py-3.5 text-center font-mono text-xs text-stone-400">
                      {item.displayOrder ?? 0}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-extrabold text-stone-900 text-base">
                        {item.value}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-stone-800">
                      {item.label}
                    </td>
                    <td className="px-4 py-3.5 max-w-xs text-xs text-stone-500 truncate">
                      {item.description || item.clientName || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Toggle
                        checked={Boolean(item.isActive)}
                        onChange={() => handleToggleStatus(item)}
                        label={`Toggle ${item.label}`}
                      />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="rounded-md p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setToDelete(item)}
                          className="rounded-md p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={Boolean(editing)}
        onClose={() => !saving && setEditing(null)}
        title={editing?._id ? "Edit Stat / Review" : "Add Stat / Review"}
        footer={
          <div className="flex items-center justify-end gap-2 border-t border-stone-100 px-6 py-4">
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditing(null)}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="review-form"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-brass-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brass-600 disabled:opacity-50"
            >
              {saving && <Spinner className="h-4 w-4" />}
              {editing?._id ? "Save Changes" : "Create Item"}
            </button>
          </div>
        }
      >
        <form id="review-form" onSubmit={handleSave} className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-600">
                Value / Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 9,000+, 45, 70 lakh+, 2004"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-brass-500 focus:outline-none"
              />
              <span className="mt-1 block text-[11px] text-stone-400">
                The large bold number or metric.
              </span>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-600">
                Display Order
              </label>
              <input
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-brass-500 focus:outline-none"
              />
              <span className="mt-1 block text-[11px] text-stone-400">
                Lower number displays first (1, 2, 3...)
              </span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-600">
              Label / Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. institutions served, school groups, classrooms"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-brass-500 focus:outline-none"
            />
            <span className="mt-1 block text-[11px] text-stone-400">
              Text shown right beneath the number.
            </span>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-600">
              Description / Subtext (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. students have used Picano furniture"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-brass-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-600">
                Client / Author Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Picano or Client Name"
                value={form.clientName}
                onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-brass-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-600">
                Rating (1 - 5 stars)
              </label>
              <select
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-brass-500 focus:outline-none"
              >
                <option value={5}>5 Stars ★★★★★</option>
                <option value={4}>4 Stars ★★★★☆</option>
                <option value={3}>3 Stars ★★★☆☆</option>
                <option value={2}>2 Stars ★★☆☆☆</option>
                <option value={1}>1 Star ★☆☆☆☆</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Toggle
              checked={form.isActive}
              onChange={(checked) => setForm({ ...form, isActive: checked })}
              label="Show on website"
            />
            <span className="text-sm font-medium text-stone-700">
              Visible on website
            </span>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Item"
        message={`Are you sure you want to delete "${toDelete?.value} - ${toDelete?.label}"? This action cannot be undone.`}
        confirmText="Delete"
        danger
      />
    </div>
  );
}

