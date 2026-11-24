import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  AlertTriangle,
  Upload,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
  Calendar,
  Clock,
} from "lucide-react";
import { blogsApi } from "../api/services";
import { imgUrl } from "../utils/helpers";
import RichTextEditor from "../components/RichTextEditor";

export default function BlogForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [existingCategories, setExistingCategories] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    metaTitle: "",
    metaDescription: "",
    category: "AI & ML",
    description: "",
    author: "Admin",
    keywords: "",
    isFeatured: false,
    status: "published",
    scheduledAt: "",
    featuredImage: null,
    faqs: [],
  });

  const [imagePreview, setImagePreview] = useState("");

  // Categories suggestions
  useEffect(() => {
    blogsApi
      .getCategories()
      .then((res) => {
        if (res.data?.data && Array.isArray(res.data.data)) {
          setExistingCategories(res.data.data);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch blog if editing
  useEffect(() => {
    if (isEdit) {
      setFetching(true);
      blogsApi
        .get(id)
        .then((res) => {
          const blog = res.data?.data;
          if (blog) {
            setFormData({
              title: blog.title || "",
              slug: blog.slug || "",
              metaTitle: blog.metaTitle || "",
              metaDescription: blog.metaDescription || "",
              category: blog.category || "AI & ML",
              description: blog.description || "",
              author: blog.author || "Admin",
              keywords: Array.isArray(blog.keywords) ? blog.keywords.join(", ") : (blog.keywords || ""),
              isFeatured: Boolean(blog.isFeatured),
              status: blog.status || "published",
              scheduledAt: blog.scheduledAt ? new Date(blog.scheduledAt).toISOString().slice(0, 16) : "",
              featuredImage: null,
              faqs: Array.isArray(blog.faqs) ? blog.faqs : [],
            });
            if (blog.featuredImage) {
              setImagePreview(imgUrl(blog.featuredImage));
            }
          }
        })
        .catch((err) => {
          console.error("Error fetching blog", err);
          alert("Failed to load blog data.");
        })
        .finally(() => setFetching(false));
    }
  }, [id, isEdit]);

  // Handle Slug auto-generation
  const generateSlug = (val) => {
    return val
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleTitleChange = (e) => {
    const titleVal = e.target.value;
    setFormData((prev) => ({
      ...prev,
      title: titleVal,
      slug: !isEdit && (!prev.slug || prev.slug === generateSlug(prev.title)) ? generateSlug(titleVal) : prev.slug,
    }));
  };

  // Image Upload
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, featuredImage: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // FAQs
  const addFaq = () => {
    setFormData((prev) => ({
      ...prev,
      faqs: [...prev.faqs, { question: "", answer: "" }],
    }));
  };

  const updateFaq = (index, field, value) => {
    setFormData((prev) => {
      const nextFaqs = [...prev.faqs];
      nextFaqs[index] = { ...nextFaqs[index], [field]: value };
      return { ...prev, faqs: nextFaqs };
    });
  };

  const removeFaq = (index) => {
    setFormData((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index),
    }));
  };

  // SEO Suggestions
  const suggestions = useMemo(() => {
    const list = [];
    if (!formData.title.trim()) list.push("Blog title is required for Schema generation");
    if (!formData.slug.trim()) list.push("URL Slug is missing; temporary preview URL is being used");
    if (!formData.featuredImage && !imagePreview) list.push("Featured cover image is missing (required by Google for Article rich results)");
    if (!formData.metaDescription.trim()) list.push("Meta description is missing (required for Article Schema description)");
    if (!formData.category.trim()) list.push("Category is recommended for breadcrumb indexing");
    return list;
  }, [formData, imagePreview]);

  // Schema.org JSON-LD Generation
  const siteUrl = "https://ashirwadfurnex.com";
  const currentIso = new Date().toISOString();

  const jsonLdData = useMemo(() => {
    const postSlug = formData.slug.trim() || "post-preview";
    const postUrl = `${siteUrl}/blogs/${postSlug}`;
    const coverUrl = imagePreview && imagePreview.startsWith("http")
      ? imagePreview
      : `${siteUrl}/images/default-blog.png`;

    const schemaGraph = [
      {
        "@type": "BlogPosting",
        "@id": `${postUrl}#article`,
        isPartOf: {
          "@type": "WebPage",
          "@id": postUrl,
        },
        headline: formData.title.trim() || "Untitled Blog Post",
        description: formData.metaDescription.trim() || formData.title.trim() || "",
        url: postUrl,
        image: coverUrl,
        datePublished: currentIso,
        dateModified: currentIso,
        author: {
          "@type": "Person",
          name: formData.author.trim() || "Admin",
        },
        publisher: {
          "@type": "Organization",
          name: "Ashirwad Furnex",
          url: siteUrl,
          logo: {
            "@type": "ImageObject",
            url: `${siteUrl}/logo.png`,
          },
        },
      },
    ];

    if (formData.faqs && formData.faqs.length > 0 && formData.faqs[0].question.trim()) {
      schemaGraph.push({
        "@type": "FAQPage",
        mainEntity: formData.faqs
          .filter((f) => f.question.trim() && f.answer.trim())
          .map((f) => ({
            "@type": "Question",
            name: f.question.trim(),
            acceptedAnswer: {
              "@type": "Answer",
              text: f.answer.trim(),
            },
          })),
      });
    }

    return {
      "@context": "https://schema.org",
      "@graph": schemaGraph,
    };
  }, [formData, siteUrl, imagePreview, currentIso]);

  const jsonLdString = useMemo(() => {
    return JSON.stringify(jsonLdData, null, 2);
  }, [jsonLdData]);

  const handleCopyJsonLd = () => {
    navigator.clipboard.writeText(jsonLdString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return alert("Please enter a title");
    if (!formData.slug.trim()) return alert("Please enter a slug");
    if (!formData.description.trim()) return alert("Please enter the blog description/content");

    try {
      setLoading(true);
      const fd = new FormData();
      fd.append("title", formData.title.trim());
      fd.append("slug", formData.slug.trim());
      fd.append("metaTitle", formData.metaTitle.trim());
      fd.append("metaDescription", formData.metaDescription.trim());
      fd.append("category", formData.category.trim());
      fd.append("description", formData.description);
      fd.append("author", formData.author.trim());
      fd.append("isFeatured", String(formData.isFeatured));
      fd.append("status", formData.status);
      if (formData.status === "scheduled") {
        if (!formData.scheduledAt) {
          setLoading(false);
          return alert("Please select a schedule date and time.");
        }
        fd.append("scheduledAt", new Date(formData.scheduledAt).toISOString());
      }

      // Keywords array
      const kwArray = formData.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      fd.append("keywords", JSON.stringify(kwArray));

      // FAQs array
      const cleanFaqs = formData.faqs.filter((f) => f.question.trim() && f.answer.trim());
      fd.append("faqs", JSON.stringify(cleanFaqs));

      // Image
      if (formData.featuredImage) {
        fd.append("featuredImage", formData.featuredImage);
      }

      if (isEdit) {
        await blogsApi.update(id, fd);
        alert("Blog updated successfully!");
      } else {
        await blogsApi.create(fd);
        alert("Blog created successfully!");
      }

      navigate("/blogs");
    } catch (err) {
      console.error("Save error", err);
      alert(err.response?.data?.message || "Failed to save blog");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/blogs"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? "Edit Blog" : "Create New Blog"}
            </h1>
            <p className="text-xs text-gray-500">
              Manage SEO, rich content, FAQs and real-time Google Schema preview
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/blogs")}
          className="text-gray-400 hover:text-gray-600 text-xl font-bold px-2 py-1"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT COLUMN: FORM INPUTS (7 Columns) */}
          <div className="space-y-5 lg:col-span-7">
            {/* Title */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={handleTitleChange}
                placeholder="e.g. Top 10 Benefits of Installing Solar Panels in Your Home"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">
                Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="e.g. my-blog-post"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                URL-friendly version of the title (lowercase, hyphens instead of spaces)
              </p>
            </div>

            {/* Meta Title */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">Meta Title</label>
              <input
                type="text"
                value={formData.metaTitle}
                onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                placeholder="SEO title (optional)"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Meta Description */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">Meta Description</label>
              <textarea
                rows={3}
                value={formData.metaDescription}
                onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                placeholder="SEO description (optional)"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  list="blog-categories"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Select or enter category (e.g. Solar Energy, Furniture, Office)"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <datalist id="blog-categories">
                  {existingCategories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                  <option value="Solar Energy" />
                  <option value="Furniture Care" />
                  <option value="Office Design" />
                  <option value="Interior Trends" />
                  <option value="School Furniture" />
                </datalist>
              </div>
            </div>

            {/* Description (Visual WYSIWYG Rich Text Editor) */}
            <div>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1">
                <label className="block text-sm font-semibold text-gray-800">
                  Description / Blog Content <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-stone-500 font-medium">
                  Word / Docs se direct formatted copy-paste supported
                </span>
              </div>
              <RichTextEditor
                value={formData.description}
                onChange={(html) => setFormData((prev) => ({ ...prev, description: html }))}
                placeholder="Write or paste your blog content here (headings, paragraphs, lists, bold text will stay formatted)..."
                minHeight="320px"
              />
            </div>

            {/* Author */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">
                Author <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="Admin"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Keywords */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">Keyword</label>
              <input
                type="text"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                placeholder="e.g. javascript, nodejs, express, solar power"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">Comma-separated tags</p>
            </div>

            {/* Featured Blog Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isFeatured"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isFeatured" className="text-sm font-medium text-gray-700 cursor-pointer">
                Featured Blog
              </label>
            </div>

            {/* Status */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="published">✅ Publish Now (Live)</option>
                <option value="scheduled">⏰ Schedule for Later (Date &amp; Time)</option>
                <option value="draft">📝 Save as Draft</option>
                <option value="archived">📦 Archived</option>
              </select>
            </div>

            {/* Schedule Date & Time Picker */}
            {formData.status === "scheduled" && (
              <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4 transition">
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-purple-900">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  Schedule Publish Date &amp; Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  className="w-full rounded-lg border border-purple-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-800 shadow-sm focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
                <p className="mt-1.5 flex items-center gap-1 text-xs text-purple-700">
                  <Clock className="h-3.5 w-3.5" />
                  Is date aur time par blog automatically website par public ho jayega.
                </p>
              </div>
            )}

            {/* Featured Image */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">
                Featured Image <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col gap-3">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
                  onChange={handleImageChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-gray-100 file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-gray-700 hover:file:bg-gray-200"
                />
                <p className="text-xs text-gray-500">
                  Allowed: JPEG, JPG, PNG, GIF, WEBP, AVIF (Max 5MB) - Stored securely in MongoDB
                </p>

                {imagePreview && (
                  <div className="relative mt-2 h-44 w-full max-w-md overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    <img
                      src={imagePreview}
                      alt="Featured Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Frequently Asked Questions (FAQs) Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold text-xs">
                    ?
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Frequently Asked Questions (FAQs)
                    </h3>
                    <p className="text-xs text-gray-500">Add Q&A pairs for this blog post</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addFaq}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Add FAQ
                </button>
              </div>

              {formData.faqs.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-xs text-gray-500">
                  No FAQs added yet. Click &apos;+ Add FAQ&apos; to add questions and answers.
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  {formData.faqs.map((faq, index) => (
                    <div
                      key={index}
                      className="relative rounded-lg border border-gray-200 bg-gray-50/60 p-3.5 transition"
                    >
                      <button
                        type="button"
                        onClick={() => removeFaq(index)}
                        className="absolute right-3 top-3 text-red-500 hover:text-red-700"
                        title="Delete FAQ"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <div className="space-y-2.5 pr-6">
                        <div>
                          <label className="text-xs font-semibold text-gray-700">Question</label>
                          <input
                            type="text"
                            value={faq.question}
                            onChange={(e) => updateFaq(index, "question", e.target.value)}
                            placeholder="e.g. What are the main benefits of solar panels?"
                            className="mt-1 w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-700">Answer</label>
                          <textarea
                            rows={2}
                            value={faq.answer}
                            onChange={(e) => updateFaq(index, "answer", e.target.value)}
                            placeholder="e.g. Solar panels reduce electricity bills, provide clean energy..."
                            className="mt-1 w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: GOOGLE SCHEMA & SEO LIVE PREVIEW (5 Columns) */}
          <div className="lg:col-span-5">
            <div className="sticky top-6 rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-indigo-600" />
                  <h2 className="text-sm font-bold text-gray-900">
                    Google Schema &amp; SEO Live Preview
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {suggestions.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                      ⚠️ {suggestions.length} Suggestions
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    {showPreview ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5 mr-0.5" /> Hide
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5 mr-0.5" /> Show
                      </>
                    )}
                  </button>
                </div>
              </div>

              {showPreview && (
                <div className="space-y-4">
                  {/* Suggestions for Rich Snippet Eligibility */}
                  {suggestions.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1.5">
                        <Sparkles className="h-4 w-4 text-amber-600" />
                        <span>Suggestions for Rich Snippet Eligibility:</span>
                      </div>
                      <ul className="list-disc space-y-1 pl-5 text-[11px] text-amber-800 leading-snug">
                        {suggestions.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Schema Code Box Header */}
                  <div className="flex items-center justify-between rounded-t-lg bg-gray-100 px-3 py-2 text-xs font-mono text-gray-600 border border-b-0 border-gray-300">
                    <span>&lt;script type=&quot;application/ld+json&quot;&gt;</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyJsonLd}
                        className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] font-sans font-medium text-gray-700 shadow-xs border border-gray-200 hover:bg-gray-50 transition"
                      >
                        {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                        {copied ? "Copied!" : "Copy JSON-LD"}
                      </button>
                      <a
                        href="https://search.google.com/test/rich-results"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded bg-indigo-600 px-2 py-1 text-[11px] font-sans font-medium text-white shadow-xs hover:bg-indigo-700 transition"
                      >
                        <ExternalLink className="h-3 w-3" /> Test in Google
                      </a>
                    </div>
                  </div>

                  {/* Schema Code Content */}
                  <div className="relative rounded-b-lg border border-gray-300 bg-white p-3 font-mono text-[11px] leading-relaxed text-indigo-900 overflow-x-auto max-h-[500px] shadow-inner">
                    <pre className="whitespace-pre-wrap break-all text-xs">
                      <code>{jsonLdString}</code>
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex items-center justify-end gap-3 border-t pt-5">
          <button
            type="button"
            onClick={() => navigate("/blogs")}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {isEdit ? "Save Changes" : "Create Blog"}
          </button>
        </div>
      </form>
    </div>
  );
}
