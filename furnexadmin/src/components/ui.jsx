import { useEffect, useRef } from "react";
import { X, Loader2, ImagePlus, Inbox, ChevronLeft, ChevronRight } from "lucide-react";
import { imgUrl } from "../utils/helpers";

export const Spinner = ({ className = "h-5 w-5" }) => <Loader2 className={`animate-spin ${className}`} />;

export const PageLoader = () => (
  <div className="flex h-64 items-center justify-center text-stone-500"><Spinner className="h-7 w-7" /></div>
);

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="flex flex-col items-center px-4 py-14 text-center">
      <Inbox className="mb-3 h-10 w-10 text-stone-300" />
      <p className="font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-stone-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const TONES = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  gray: "bg-stone-100 text-stone-600 ring-stone-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  purple: "bg-violet-50 text-violet-700 ring-violet-200",
};
export const Badge = ({ tone = "gray", children }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONES[tone]}`}>{children}</span>
);

export function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 focus-visible:ring-offset-2 disabled:opacity-50 ${checked ? "bg-emerald-600" : "bg-stone-300"}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/50" onClick={onClose} />
      <div className={`relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl ${wide ? "sm:max-w-3xl" : "sm:max-w-xl"}`}>
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-stone-200 px-5 py-3 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, text, confirmText = "Delete", busy }) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-danger" onClick={onConfirm} disabled={busy}>{busy && <Spinner className="h-4 w-4" />}{confirmText}</button>
      </>}>
      <p className="text-sm text-stone-600">{text}</p>
    </Modal>
  );
}

export function Field({ label, hint, children, className = "" }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-stone-200 px-4 py-3 text-sm">
      <span className="text-stone-500">Page {page} of {pages}</span>
      <div className="flex gap-2">
        <button className="btn-ghost !px-2.5" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
        <button className="btn-ghost !px-2.5" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

// existing = server paths, files = new File objects (parent state)
export function ImageUploader({ existing = [], files = [], onFiles, onRemoveExisting, multiple = true, max = 10 }) {
  const ref = useRef();
  const previews = files.map((f) => URL.createObjectURL(f));
  const total = existing.length + files.length;

  const add = (e) => {
    const picked = Array.from(e.target.files || []);
    onFiles(multiple ? [...files, ...picked].slice(0, max - existing.length) : picked.slice(0, 1));
    e.target.value = "";
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {existing.map((src, i) => (
          <Thumb key={src + i} src={imgUrl(src)} onRemove={onRemoveExisting ? () => onRemoveExisting(src) : null} />
        ))}
        {previews.map((src, i) => (
          <Thumb key={src} src={src} isNew onRemove={() => onFiles(files.filter((_, j) => j !== i))} />
        ))}
        {(multiple ? total < max : true) && (
          <button type="button" onClick={() => ref.current.click()}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-stone-300 text-xs text-stone-500 transition hover:border-brass-500 hover:text-brass-600">
            <ImagePlus className="h-5 w-5" /> Add image
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple={multiple} className="hidden" onChange={add} />
    </div>
  );
}

function Thumb({ src, onRemove, isNew }) {
  return (
    <div className="group relative h-24 w-24 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
      <img src={src} alt="" className="h-full w-full object-cover" />
      {isNew && <span className="absolute bottom-1 left-1 rounded bg-brass-500 px-1.5 text-[10px] font-semibold text-white">New</span>}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remove image"
          className="absolute right-1 top-1 rounded-full bg-ink-900/70 p-1 text-white hover:bg-red-600"><X className="h-3 w-3" /></button>
      )}
    </div>
  );
}
