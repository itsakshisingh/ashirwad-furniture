import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link2,
  Unlink,
  Quote,
  Undo2,
  Redo2,
  Code,
  Eye,
  RemoveFormatting,
} from "lucide-react";

/**
 * Clean & normalize pasted HTML from Word, Google Docs, or Websites
 * Preserves headings, paragraphs, lists, bold, italic, links, etc.
 * Cleans out proprietary Mso/Google junk styles.
 */
function cleanPastedHtml(htmlString) {
  if (!htmlString || typeof htmlString !== "string") return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");

  // Remove scripts, styles, meta, xml, comments
  const removeDisallowed = (root) => {
    const junkSelectors = "script, style, meta, link, noscript, xml, title, svg, object, embed";
    root.querySelectorAll(junkSelectors).forEach((el) => el.remove());
  };
  removeDisallowed(doc.body);

  // Recursively sanitize nodes
  const sanitizeNode = (node) => {
    if (node.nodeType === Node.COMMENT_NODE) {
      node.remove();
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName.toLowerCase();

    // Check if paragraph is disguised as a heading via font-size or font-weight
    if (tag === "p" || tag === "div") {
      const style = node.getAttribute("style") || "";
      const isBold = /font-weight:\s*(bold|[7-9]00)/i.test(style) || node.querySelector("b, strong");
      const sizeMatch = style.match(/font-size:\s*([\d.]+)(px|pt)/i);
      if (sizeMatch && isBold) {
        const sizeVal = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[2].toLowerCase();
        const px = unit === "pt" ? sizeVal * 1.33 : sizeVal;
        if (px >= 24) {
          const h2 = document.createElement("h2");
          h2.innerHTML = node.innerHTML;
          node.replaceWith(h2);
          sanitizeNode(h2);
          return;
        } else if (px >= 18) {
          const h3 = document.createElement("h3");
          h3.innerHTML = node.innerHTML;
          node.replaceWith(h3);
          sanitizeNode(h3);
          return;
        }
      }
    }

    // Keep allowed attributes
    const allowedAttrs = tag === "a" ? ["href", "target", "title"] : [];
    Array.from(node.attributes).forEach((attr) => {
      if (!allowedAttrs.includes(attr.name.toLowerCase())) {
        node.removeAttribute(attr.name);
      }
    });

    if (tag === "a") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }

    // Recursively process children
    Array.from(node.childNodes).forEach(sanitizeNode);
  };

  Array.from(doc.body.childNodes).forEach(sanitizeNode);

  return doc.body.innerHTML.trim();
}

/**
 * Convert plain text with multiple line breaks into semantic <p> tags
 */
function plainTextToHtml(text) {
  if (!text) return "";
  const paragraphs = text
    .split(/\r?\n\r?\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length <= 1) {
    return text.replace(/\r?\n/g, "<br/>");
  }

  return paragraphs
    .map((p) => {
      // Check if line looks like a title/heading (short, not ending with punctuation)
      if (p.length < 80 && !/[.!?,;:]$/.test(p) && !p.includes("\n")) {
        return `<h2>${escapeHtml(p)}</h2>`;
      }
      return `<p>${escapeHtml(p).replace(/\r?\n/g, "<br/>")}</p>`;
    })
    .join("");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Write or paste your blog content here (headings, paragraphs, lists, bold text will stay formatted)...",
  minHeight = "320px",
}) {
  const editorRef = useRef(null);
  const [viewMode, setViewMode] = useState("visual"); // "visual" | "html"
  const [htmlSource, setHtmlSource] = useState(value || "");
  const isInternalUpdate = useRef(false);

  // Sync external value to visual editor
  useEffect(() => {
    setHtmlSource(value || "");
    if (editorRef.current && !isInternalUpdate.current) {
      if (editorRef.current.innerHTML !== (value || "")) {
        editorRef.current.innerHTML = value || "";
      }
    }
    isInternalUpdate.current = false;
  }, [value]);

  const emitChange = (newHtml) => {
    isInternalUpdate.current = true;
    setHtmlSource(newHtml);
    if (onChange) onChange(newHtml);
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    emitChange(html === "<p><br></p>" || html === "<br>" ? "" : html);
  };

  const executeCmd = (cmd, val = null) => {
    if (viewMode !== "visual") return;
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(cmd, false, val);
    handleInput();
  };

  const handleFormatBlock = (tag) => {
    if (viewMode !== "visual") return;
    if (editorRef.current) editorRef.current.focus();
    if (!tag || tag === "p") {
      document.execCommand("formatBlock", false, "<p>");
    } else {
      document.execCommand("formatBlock", false, `<${tag}>`);
    }
    handleInput();
  };

  const handleFontSize = (size) => {
    if (viewMode !== "visual") return;
    if (!size) return;
    executeCmd("fontSize", size);
  };

  const handleInsertLink = () => {
    if (viewMode !== "visual") return;
    const url = window.prompt("Enter URL link (e.g. https://ashirwadfurnex.com):");
    if (url) {
      executeCmd("createLink", url);
    }
  };

  // Smart Paste Handler
  const handlePaste = (e) => {
    e.preventDefault();
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;

    const htmlData = clipboardData.getData("text/html");
    const plainText = clipboardData.getData("text/plain");

    let contentToInsert = "";

    if (htmlData && htmlData.trim()) {
      contentToInsert = cleanPastedHtml(htmlData);
    }

    if (!contentToInsert && plainText) {
      contentToInsert = plainTextToHtml(plainText);
    }

    if (contentToInsert) {
      // Insert cleaned HTML into current selection
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();

        const template = document.createElement("template");
        template.innerHTML = contentToInsert;
        const fragment = template.content;
        const lastNode = fragment.lastChild;
        range.insertNode(fragment);

        if (lastNode) {
          const newRange = document.createRange();
          newRange.setStartAfter(lastNode);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      } else {
        document.execCommand("insertHTML", false, contentToInsert);
      }
      handleInput();
    }
  };

  // Toggle between WYSIWYG & Raw HTML
  const toggleViewMode = (mode) => {
    if (mode === viewMode) return;
    if (mode === "html") {
      const currentHtml = editorRef.current ? editorRef.current.innerHTML : value || "";
      setHtmlSource(currentHtml);
      setViewMode("html");
    } else {
      setViewMode("visual");
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = htmlSource;
          editorRef.current.focus();
        }
      }, 20);
    }
  };

  const handleHtmlSourceChange = (e) => {
    const newHtml = e.target.value;
    setHtmlSource(newHtml);
    emitChange(newHtml);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-stone-300 bg-white shadow-sm focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition">
      {/* Top Header Bar with Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-stone-100/90 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
            {viewMode === "visual" ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Visual Editor (WYSIWYG)
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                HTML Source Code Editor
              </>
            )}
          </span>
          <span className="text-[11px] text-stone-500 hidden sm:inline">
            {viewMode === "visual"
              ? "• Text visual format me dekhein aur edit karein"
              : "• Raw HTML tags direct view & edit karein"}
          </span>
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-stone-300 shadow-sm">
          <button
            type="button"
            onClick={() => toggleViewMode("visual")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition ${
              viewMode === "visual"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
            title="Switch to Visual WYSIWYG Mode"
          >
            <Eye className="h-3.5 w-3.5" /> Visual
          </button>
          <button
            type="button"
            onClick={() => toggleViewMode("html")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition ${
              viewMode === "html"
                ? "bg-stone-800 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
            title="Switch to Raw HTML Code View"
          >
            <Code className="h-3.5 w-3.5" /> HTML Code
          </button>
        </div>
      </div>

      {/* Editor Formatting Toolbar (Active in Visual Mode) */}
      {viewMode === "visual" ? (
        <div className="flex flex-wrap items-center gap-1 border-b border-stone-200 bg-stone-50 px-2.5 py-2 text-stone-700">
          {/* Headings & Blocks Dropdown */}
          <select
            aria-label="Format Block"
            onChange={(e) => {
              handleFormatBlock(e.target.value);
              e.target.value = "";
            }}
            defaultValue=""
            className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer shadow-sm outline-none focus:border-emerald-500"
          >
            <option value="" disabled>
              Heading / Style
            </option>
            <option value="p">¶ Paragraph (Normal Text)</option>
            <option value="h1">H1 - Main Heading</option>
            <option value="h2">H2 - Section Heading</option>
            <option value="h3">H3 - Sub Heading</option>
            <option value="h4">H4 - Small Heading</option>
            <option value="blockquote">❝ Quote Block</option>
          </select>

          {/* Font Size Dropdown */}
          <select
            aria-label="Font Size"
            onChange={(e) => {
              handleFontSize(e.target.value);
              e.target.value = "";
            }}
            defaultValue=""
            className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer shadow-sm outline-none focus:border-emerald-500"
          >
            <option value="" disabled>
              Font Size
            </option>
            <option value="2">Small (12px)</option>
            <option value="3">Normal (14px)</option>
            <option value="4">Medium (16px)</option>
            <option value="5">Large (18px)</option>
            <option value="6">Extra Large (24px)</option>
          </select>

          <div className="h-4 w-[1px] bg-stone-300 mx-1" />

          {/* Text Styles */}
          <button
            type="button"
            onClick={() => executeCmd("bold")}
            title="Bold (Ctrl+B)"
            className="rounded p-1.5 hover:bg-stone-200 text-stone-700 transition"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCmd("italic")}
            title="Italic (Ctrl+I)"
            className="rounded p-1.5 hover:bg-stone-200 text-stone-700 transition"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCmd("underline")}
            title="Underline (Ctrl+U)"
            className="rounded p-1.5 hover:bg-stone-200 text-stone-700 transition"
          >
            <Underline className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCmd("strikeThrough")}
            title="Strikethrough"
            className="rounded p-1.5 hover:bg-stone-200 text-stone-700 transition"
          >
            <Strikethrough className="h-4 w-4" />
          </button>

          <div className="h-4 w-[1px] bg-stone-300 mx-1" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => executeCmd("insertUnorderedList")}
            title="Bullet List"
            className="rounded p-1.5 hover:bg-stone-200 text-stone-700 transition"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCmd("insertOrderedList")}
            title="Numbered List"
            className="rounded p-1.5 hover:bg-stone-200 text-stone-700 transition"
          >
            <ListOrdered className="h-4 w-4" />
          </button>

          <div className="h-4 w-[1px] bg-stone-300 mx-1" />

          {/* Alignments */}
          <button
            type="button"
            onClick={() => executeCmd("justifyLeft")}
            title="Align Left"
            className="rounded p-1.5 hover:bg-stone-200 text-stone-700 transition"
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCmd("justifyCenter")}
            title="Align Center"
            className="rounded p-1.5 hover:bg-stone-200 text-stone-700 transition"
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCmd("justifyRight")}
            title="Align Right"
            className="rounded p-1.5 hover:bg-stone-200 text-stone-700 transition"
          >
            <AlignRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCmd("justifyFull")}
            title="Justify Text"
            className="rounded p-1.5 hover:bg-stone-200 text-stone-700 transition"
          >
            <AlignJustify className="h-4 w-4" />
          </button>

          <div className="h-4 w-[1px] bg-stone-300 mx-1" />

          {/* Link & Quote */}
          <button
            type="button"
            onClick={handleInsertLink}
            title="Insert Link"
            className="rounded p-1.5 hover:bg-stone-200 text-stone-700 transition"
          >
            <Link2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCmd("unlink")}
            title="Remove Link"
            className="rounded p-1.5 hover:bg-stone-200 text-stone-700 transition"
          >
            <Unlink className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleFormatBlock("blockquote")}
            title="Quote Block"
            className="rounded p-1.5 hover:bg-stone-200 text-stone-700 transition"
          >
            <Quote className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCmd("removeFormat")}
            title="Clear Formatting"
            className="rounded p-1.5 hover:bg-stone-200 text-stone-700 transition"
          >
            <RemoveFormatting className="h-4 w-4" />
          </button>

          <div className="h-4 w-[1px] bg-stone-300 mx-1" />

          {/* Undo / Redo */}
          <button
            type="button"
            onClick={() => executeCmd("undo")}
            title="Undo"
            className="rounded p-1.5 hover:bg-stone-200 text-stone-700 transition"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCmd("redo")}
            title="Redo"
            className="rounded p-1.5 hover:bg-stone-200 text-stone-700 transition"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-800 px-3 py-1.5 text-xs text-stone-300">
          <span className="font-mono text-emerald-400">
            &lt;&gt; HTML Source Code (Directly Editable)
          </span>
          <span className="text-[11px] text-stone-400">
            Changes auto-sync to Visual Editor
          </span>
        </div>
      )}

      {/* Editor Content Area */}
      {viewMode === "visual" ? (
        <div className="relative bg-white">
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onPaste={handlePaste}
            style={{ minHeight }}
            data-placeholder={placeholder}
            className="rich-editor-content w-full p-5 text-stone-900 outline-none leading-relaxed overflow-y-auto"
          />
        </div>
      ) : (
        /* High-contrast, crystal-clear code editor */
        <textarea
          rows={14}
          value={htmlSource}
          onChange={handleHtmlSourceChange}
          placeholder="<p>HTML content here...</p>"
          style={{ minHeight }}
          spellCheck={false}
          className="w-full p-4 font-mono text-sm leading-relaxed bg-slate-900 text-emerald-300 placeholder-slate-500 selection:bg-emerald-600 selection:text-white outline-none resize-y border-0"
        />
      )}

      {/* Helper Footer */}
      <div className="border-t border-stone-200 bg-stone-50/80 px-3.5 py-2 flex flex-wrap items-center justify-between text-[11px] text-stone-600">
        <span className="flex items-center gap-1.5">
          <span>💡</span>
          <span>
            <strong>Tip:</strong> Word, Google Docs ya website se copy-paste karein — headings, bold text, aur paragraphs automatic format honge.
          </span>
        </span>
        <span className="font-semibold text-stone-500">
          {viewMode === "visual" ? "Mode: Visual (WYSIWYG)" : "Mode: HTML Code"}
        </span>
      </div>

      {/* Inline styles for the rich visual content editor */}
      <style>{`
        .rich-editor-content:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        .rich-editor-content h1 {
          font-size: 1.85rem;
          font-weight: 800;
          color: #111827;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          line-height: 1.25;
        }
        .rich-editor-content h2 {
          font-size: 1.45rem;
          font-weight: 700;
          color: #1f2937;
          margin-top: 1.15rem;
          margin-bottom: 0.5rem;
          line-height: 1.3;
        }
        .rich-editor-content h3 {
          font-size: 1.2rem;
          font-weight: 600;
          color: #374151;
          margin-top: 1rem;
          margin-bottom: 0.4rem;
          line-height: 1.35;
        }
        .rich-editor-content h4 {
          font-size: 1.05rem;
          font-weight: 600;
          color: #4b5563;
          margin-top: 0.85rem;
          margin-bottom: 0.35rem;
        }
        .rich-editor-content p {
          font-size: 0.95rem;
          color: #374151;
          margin-bottom: 0.85rem;
          line-height: 1.65;
        }
        .rich-editor-content ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 0.85rem;
        }
        .rich-editor-content ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 0.85rem;
        }
        .rich-editor-content li {
          margin-bottom: 0.35rem;
        }
        .rich-editor-content blockquote {
          border-left: 4px solid #6366f1;
          padding: 0.5rem 1rem;
          font-style: italic;
          background-color: #f8fafc;
          color: #475569;
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
          border-radius: 0 0.375rem 0.375rem 0;
        }
        .rich-editor-content a {
          color: #4f46e5;
          text-decoration: underline;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
