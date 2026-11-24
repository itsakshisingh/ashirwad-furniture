import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Star,
  ExternalLink,
  BookOpen,
  Filter,
} from "lucide-react";
import { blogsApi } from "../api/services";
import { imgUrl } from "../utils/helpers";

export default function Blogs() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadBlogs = async () => {
    try {
      setLoading(true);
      const res = await blogsApi.list();
      setBlogs(res.data?.data || []);
    } catch (err) {
      console.error("Error loading blogs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await blogsApi.remove(id);
      setBlogs((prev) => prev.filter((b) => b._id !== id));
    } catch (err) {
      console.error("Failed to delete blog", err);
      alert("Failed to delete blog.");
    }
  };

  const handleToggleFeatured = async (id) => {
    try {
      const res = await blogsApi.toggleFeatured(id);
      const updated = res.data?.data;
      if (updated) {
        setBlogs((prev) =>
          prev.map((b) => (b._id === id ? { ...b, isFeatured: updated.isFeatured } : b))
        );
      }
    } catch (err) {
      console.error("Failed to toggle featured status", err);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await blogsApi.updateStatus(id, newStatus);
      const updated = res.data?.data;
      if (updated) {
        setBlogs((prev) =>
          prev.map((b) => (b._id === id ? { ...b, status: updated.status } : b))
        );
      }
    } catch (err) {
      console.error("Failed to update blog status", err);
    }
  };

  // Categories list for filter
  const categories = Array.from(new Set(blogs.map((b) => b.category).filter(Boolean)));

  // Filtered blogs
  const filteredBlogs = blogs.filter((blog) => {
    const matchesSearch =
      blog.title.toLowerCase().includes(search.toLowerCase()) ||
      blog.slug.toLowerCase().includes(search.toLowerCase()) ||
      (blog.category && blog.category.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = categoryFilter === "all" || blog.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || blog.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Blog Management</h1>
          <p className="text-sm text-ink-500">
            Publish articles, manage SEO meta data, and boost organic search visibility.
          </p>
        </div>
        <Link
          to="/blogs/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brass-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brass-600 transition"
        >
          <Plus className="h-4 w-4" /> Add Blog
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, slug, or category..."
            className="w-full rounded-xl border border-ink-100 bg-sand-50/50 py-2 pl-10 pr-4 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brass-500 focus:outline-none focus:ring-1 focus:ring-brass-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-ink-100 bg-sand-50/50 px-3 py-2 text-sm text-ink-700 focus:border-brass-500 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-ink-100 bg-sand-50/50 px-3 py-2 text-sm text-ink-700 focus:border-brass-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Blogs List */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brass-500 border-t-transparent"></div>
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-12 w-12 text-ink-300 mb-3" />
            <p className="text-base font-semibold text-ink-700">No blogs found</p>
            <p className="text-xs text-ink-400 mt-1">
              {search || categoryFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your search filters"
                : "Get started by publishing your first blog post"}
            </p>
            <Link
              to="/blogs/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brass-500 px-3.5 py-2 text-xs font-semibold text-white shadow hover:bg-brass-600 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Create Blog
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink-700">
              <thead className="border-b border-ink-100 bg-sand-50/50 text-xs uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-6 py-4">Blog Article</th>
                  <th className="px-4 py-4">Category</th>
                  <th className="px-4 py-4">Author</th>
                  <th className="px-4 py-4 text-center">Featured</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4 text-center">Views</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filteredBlogs.map((blog) => (
                  <tr key={blog._id} className="hover:bg-sand-50/40 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-18 shrink-0 overflow-hidden rounded-lg bg-sand-100 border border-ink-100">
                          {blog.featuredImage ? (
                            <img
                              src={imgUrl(blog.featuredImage)}
                              alt={blog.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-ink-400">
                              No img
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 max-w-sm">
                          <p className="font-semibold text-ink-900 truncate" title={blog.title}>
                            {blog.title}
                          </p>
                          <p className="text-xs text-ink-400 font-mono truncate" title={blog.slug}>
                            /{blog.slug}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                        {blog.category || "General"}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-xs font-medium text-ink-600">
                      {blog.author || "Admin"}
                    </td>

                    <td className="px-4 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(blog._id)}
                        title={blog.isFeatured ? "Featured" : "Not featured"}
                        className={`rounded-full p-1.5 transition ${
                          blog.isFeatured
                            ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
                            : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        }`}
                      >
                        <Star className={`h-4 w-4 ${blog.isFeatured ? "fill-amber-500" : ""}`} />
                      </button>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <select
                          value={blog.status}
                          onChange={(e) => handleStatusChange(blog._id, e.target.value)}
                          className={`rounded-lg border px-2 py-1 text-xs font-semibold uppercase tracking-wider focus:outline-none ${
                            blog.status === "published"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : blog.status === "scheduled"
                              ? "border-purple-200 bg-purple-50 text-purple-700 font-bold"
                              : blog.status === "draft"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-gray-200 bg-gray-50 text-gray-700"
                          }`}
                        >
                          <option value="published">Published</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="draft">Draft</option>
                          <option value="archived">Archived</option>
                        </select>
                        {blog.status === "scheduled" && blog.scheduledAt && (
                          <span className="text-[10px] text-purple-700 font-semibold" title={new Date(blog.scheduledAt).toLocaleString()}>
                            ⏰ {new Date(blog.scheduledAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-center text-xs font-medium text-ink-600">
                      <div className="inline-flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5 text-ink-400" />
                        <span>{blog.views || 0}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {blog.slug && (
                          <a
                            href={`https://www.ashirwadfurnex.com/blogs/${blog.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-1.5 text-ink-400 hover:bg-sand-100 hover:text-ink-700 transition"
                            title="View Live Blog"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        <Link
                          to={`/blogs/${blog._id}/edit`}
                          className="rounded-lg p-1.5 text-ink-400 hover:bg-sand-100 hover:text-ink-700 transition"
                          title="Edit Blog"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(blog._id, blog.title)}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 transition"
                          title="Delete Blog"
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
    </div>
  );
}
