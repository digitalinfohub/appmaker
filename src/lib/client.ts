"use client";

import type { AssetRef } from "./types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData)) headers.set("content-type", "application/json");
  const res = await fetch(path, { ...init, headers, credentials: "same-origin" });
  if (!res.ok) {
    let message = res.statusText || "Request failed";
    try {
      const data = await res.json();
      message = data?.error || message;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export async function uploadImage(
  blob: Blob,
  appId: string,
  name: string,
  dims?: { width: number; height: number },
): Promise<AssetRef> {
  const form = new FormData();
  form.append("file", blob, name);
  form.append("appId", appId);
  if (dims) {
    form.append("width", String(Math.round(dims.width)));
    form.append("height", String(Math.round(dims.height)));
  }
  const res = await fetch("/api/upload", { method: "POST", body: form, credentials: "same-origin" });
  if (!res.ok) {
    let message = "Upload failed";
    try {
      message = (await res.json())?.error || message;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status);
  }
  const data = (await res.json()) as { asset: { id: string; name: string; type: string; width?: number; height?: number } };
  return {
    id: data.asset.id,
    name: data.asset.name,
    type: data.asset.type,
    width: data.asset.width,
    height: data.asset.height,
  };
}

/* --------------------------------------------------------------- images */

async function loadBitmap(source: Blob): Promise<ImageBitmap> {
  return createImageBitmap(source);
}

function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png", quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not process that image"))), type, quality);
  });
}

/** Shrinks huge photos so uploads stay fast and bundles stay small. */
export async function optimizedImage(blob: Blob, name: string, maxDim = 2200): Promise<{ blob: Blob; name: string }> {
  if (!blob.type.startsWith("image/") || blob.type === "image/svg+xml" || blob.type === "image/gif") {
    return { blob, name };
  }
  try {
    const bitmap = await loadBitmap(blob);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && blob.size < 1_600_000) {
      return { blob, name };
    }
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { blob, name };
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);
    const type = blob.type === "image/png" ? "image/png" : "image/webp";
    const out = await canvasToBlob(canvas, type, 0.9);
    if (out.size >= blob.size) return { blob, name };
    return {
      blob: out,
      name: name.replace(/\.[a-z0-9]+$/i, type === "image/png" ? ".png" : ".webp"),
    };
  } catch {
    return { blob, name };
  }
}

export type IconBlobs = {
  i512: Blob;
  i192: Blob;
  apple: Blob;
  maskable: Blob;
  original: Blob;
};

/**
 * Renders the app icon set in the browser: square, padded and maskable
 * variants so the installed app looks right on every platform.
 */
export async function makeIconSet(file: Blob, background: string): Promise<IconBlobs> {
  const bitmap = await loadBitmap(file);
  const draw = async (size: number, padding: number, bg: string | null, radius: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser");
    if (radius > 0) {
      const r = size * radius;
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.arcTo(size, 0, size, size, r);
      ctx.arcTo(size, size, 0, size, r);
      ctx.arcTo(0, size, 0, 0, r);
      ctx.arcTo(0, 0, size, 0, r);
      ctx.closePath();
      ctx.clip();
    }
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size, size);
    }
    const inner = size * (1 - padding * 2);
    const ratio = Math.min(inner / bitmap.width, inner / bitmap.height);
    const w = bitmap.width * ratio;
    const h = bitmap.height * ratio;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
    return canvasToBlob(canvas, "image/png");
  };

  const [i512, i192, apple, maskable] = await Promise.all([
    draw(512, 0.1, background, 0.22),
    draw(192, 0.1, background, 0.22),
    draw(180, 0.08, background, 0),
    draw(512, 0.22, background, 0),
  ]);
  return { i512, i192, apple, maskable, original: file };
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(value: string | null | undefined): string {
  if (!value) return "never";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "never";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function toLocalDateTimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

export function slugifyClient(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 46);
}
