"use client";

import { useEffect, useState } from "react";

/**
 * Hash routing keeps deep links working on GitHub Pages, which has no server
 * rewrites. Routes look like `#/`, `#/apps/<id>`.
 */
export function normalizeRoute(hash: string): string {
  const raw = (hash || "").replace(/^#/, "");
  if (!raw || raw === "/") return "/";
  const path = raw.split("?")[0].replace(/\/+$/, "");
  return path || "/";
}

export function navigate(to: string): void {
  const path = to.startsWith("/") ? to : `/${to}`;
  const next = `#${path}`;
  if (window.location.hash === next) {
    window.dispatchEvent(new Event("hashchange"));
    return;
  }
  window.location.hash = path;
}

export function useHashRoute(): string {
  const [route, setRoute] = useState<string>(() =>
    typeof window === "undefined" ? "/" : normalizeRoute(window.location.hash),
  );

  useEffect(() => {
    const sync = () => setRoute(normalizeRoute(window.location.hash));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return route;
}
