"use client";

import React, { useEffect, useRef, useState } from "react";
import { ICONS } from "@/lib/icons";
import { optimizedImage, uploadImage } from "@/lib/client";
import { mediaUrl } from "@/lib/local/media";
import type { AssetRef } from "@/lib/types";

export function Ico({ name, size = 16, stroke }: { name: string; size?: number; stroke?: number }) {
  const body = ICONS[name] || ICONS.sparkles;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke ?? 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
  icon?: string;
  block?: boolean;
};

export function Btn({ variant = "default", size = "md", loading, icon, block, children, className, ...rest }: BtnProps) {
  const classes = [
    "btn",
    variant !== "default" ? `btn--${variant}` : "",
    size === "sm" ? "btn--sm" : "",
    block ? "btn--block" : "",
    !children ? "btn--icon" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={classes} {...rest} disabled={rest.disabled || loading}>
      {loading ? <span className="spinner" /> : icon ? <Ico name={icon} size={15} /> : null}
      {children}
    </button>
  );
}

export function Field({
  label,
  help,
  children,
  right,
}: {
  label?: string;
  help?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="field">
      {(label || right) && (
        <div className="field__label">
          <span>{label}</span>
          {right}
        </div>
      )}
      {children}
      {help && <span className="field__help">{help}</span>}
    </div>
  );
}

export function Switch({
  on,
  onChange,
  label,
  description,
}: {
  on: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="switch-row">
      <div className="switch-row__text">
        <span className="switch-row__t">{label}</span>
        {description && <span className="switch-row__d">{description}</span>}
      </div>
      <button type="button" className="switch" data-on={on} onClick={() => onChange(!on)} aria-label={label} aria-pressed={on} />
    </div>
  );
}

export function ColorField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="color-field">
      <input type="color" value={normalizeHex(value)} onChange={(e) => onChange(e.target.value)} aria-label="Pick colour" />
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} />
    </div>
  );
}

function normalizeHex(value: string): string {
  const v = (value || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v;
  if (/^#[0-9a-f]{3}$/i.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return "#6d5efc";
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; icon?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="pill-row">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="chip"
          data-active={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.icon && <Ico name={option.icon} size={12} />} {option.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  title,
  subtitle,
  children,
  footer,
  onClose,
  wide,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? " modal--wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__head">
          <div>
            <div className="modal__title">{title}</div>
            {subtitle && <div className="modal__sub">{subtitle}</div>}
          </div>
          <Btn variant="ghost" onClick={onClose} aria-label="Close">
            <Ico name="menu" size={0} />
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </Btn>
        </div>
        {children}
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ toasts */

type ToastItem = { id: number; message: string; kind: "ok" | "error" };
let toastItems: ToastItem[] = [];
let toastListeners: ((items: ToastItem[]) => void)[] = [];
let toastSeq = 0;

export function toast(message: string, kind: "ok" | "error" = "ok") {
  const item = { id: ++toastSeq, message, kind };
  toastItems = [...toastItems, item];
  toastListeners.forEach((fn) => fn(toastItems));
  setTimeout(() => {
    toastItems = toastItems.filter((t) => t.id !== item.id);
    toastListeners.forEach((fn) => fn(toastItems));
  }, 3600);
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const listener = (next: ToastItem[]) => setItems([...next]);
    toastListeners.push(listener);
    setItems([...toastItems]);
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== listener);
    };
  }, []);
  if (!items.length) return null;
  return (
    <div className="toasts">
      {items.map((item) => (
        <div key={item.id} className={`toast${item.kind === "error" ? " toast--error" : ""}`}>
          {item.message}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- image picker */

export function ImagePicker({
  value,
  onChange,
  appId,
  label,
  help,
  compact,
}: {
  value: AssetRef | null;
  onChange: (asset: AssetRef | null) => void;
  appId: string;
  label?: string;
  help?: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handle = async (file?: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const optimized = await optimizedImage(file, file.name);
      const asset = await uploadImage(optimized.blob, appId, optimized.name);
      onChange(asset);
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Field label={label} help={help}>
      <div
        className="uploader"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handle(e.dataTransfer.files?.[0]);
        }}
        style={dragging ? { borderColor: "var(--accent)", background: "var(--accent-soft)" } : undefined}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
      >
        <div className="uploader__preview" style={compact ? { width: 34, height: 34 } : undefined}>
          {busy ? (
            <span className="spinner" />
          ) : value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(value.id) ?? ""} alt="" />
          ) : (
            <Ico name="image" size={16} />
          )}
        </div>
        <div className="uploader__text">
          <b>{value ? value.name : busy ? "Uploading…" : "Choose image"}</b>
          <span>{value ? "Click to replace" : "PNG, JPG or WEBP · drag & drop"}</span>
        </div>
        {value && (
          <Btn
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
          >
            Remove
          </Btn>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/svg+xml"
        className="sr-only"
        onChange={(e) => handle(e.target.files?.[0])}
      />
    </Field>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty__icon">
        <Ico name={icon} size={22} />
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}
