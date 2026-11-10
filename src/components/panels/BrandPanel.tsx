"use client";

import { useRef, useState } from "react";
import { makeIconSet, uploadImage } from "@/lib/client";
import { ColorField, Field, Ico, ImagePicker, Switch, toast } from "../ui";
import type { PanelProps } from "./types";

export default function BrandPanel({ appId, config, update }: PanelProps) {
  const iconInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleIcon = async (file?: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const blobs = await makeIconSet(file, config.branding.iconBackground);
      const [i512, i192, apple, maskable] = await Promise.all([
        uploadImage(blobs.i512, appId, "icon-512.png", { width: 512, height: 512 }),
        uploadImage(blobs.i192, appId, "icon-192.png", { width: 192, height: 192 }),
        uploadImage(blobs.apple, appId, "apple-touch-icon.png", { width: 180, height: 180 }),
        uploadImage(blobs.maskable, appId, "icon-maskable-512.png", { width: 512, height: 512 }),
      ]);
      update((c) => ({
        ...c,
        branding: { ...c.branding, icon: i512, iconSet: { i512, i192, apple, maskable } },
      }));
      toast("Icon set generated for every platform");
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setBusy(false);
      if (iconInput.current) iconInput.current.value = "";
    }
  };

  const icon = config.branding.iconSet?.i192 ?? config.branding.icon;

  return (
    <div className="panel">
      <div className="panel__inner">
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">App icon</div>
              <div className="card__sub">
                Used on the home screen, install prompt, splash screen and notifications. Upload one square image and App
                Maker generates every size it needs.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: 22,
                background: config.branding.iconBackground,
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
                flex: "none",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)",
                cursor: "pointer",
              }}
              onClick={() => iconInput.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && iconInput.current?.click()}
            >
              {busy ? (
                <span className="spinner" />
              ) : icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/media/${icon.id}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 30, fontWeight: 750, color: "#fff" }}>{config.name.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="btn-group">
                <button className="btn" onClick={() => iconInput.current?.click()} disabled={busy}>
                  <Ico name="image" size={14} /> {config.branding.icon ? "Replace icon" : "Upload icon"}
                </button>
                {config.branding.icon && (
                  <button
                    className="btn btn--ghost"
                    onClick={() =>
                      update((c) => ({ ...c, branding: { ...c.branding, icon: null, iconSet: null } }))
                    }
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="help" style={{ marginTop: 8 }}>
                Square PNG or JPG, at least 512×512. Generated sizes: 512, 192, 180 (iOS) and a maskable variant with safe
                padding.
              </p>
            </div>
          </div>

          <input
            ref={iconInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => handleIcon(e.target.files?.[0])}
          />

          <div style={{ marginTop: 16 }}>
            <Field label="Icon background" help="Shown behind transparent icons and in the generated maskable icon.">
              <ColorField
                value={config.branding.iconBackground}
                onChange={(value) => update((c) => ({ ...c, branding: { ...c.branding, iconBackground: value } }))}
              />
            </Field>
          </div>
        </div>

        <div className="card">
          <div className="card__title">Favicon</div>
          <div className="card__sub">The tiny icon shown in browser tabs when the app is opened on a computer.</div>
          <div style={{ marginTop: 14 }}>
            <ImagePicker
              compact
              appId={appId}
              value={config.branding.favicon}
              onChange={(asset) => update((c) => ({ ...c, branding: { ...c.branding, favicon: asset } }))}
              help="Defaults to your app icon. A 64×64 or larger square image works best."
            />
          </div>
        </div>

        <div className="card">
          <div className="card__title">Splash screen</div>
          <div className="card__sub">
            Shown while the app starts. The colour fills the screen; the optional logo sits in the middle.
          </div>
          <div style={{ marginTop: 14 }}>
            <Field label="Splash background">
              <ColorField
                value={config.branding.splashColor}
                onChange={(value) => update((c) => ({ ...c, branding: { ...c.branding, splashColor: value } }))}
              />
            </Field>
            <ImagePicker
              compact
              appId={appId}
              value={config.branding.splashLogo}
              onChange={(asset) => update((c) => ({ ...c, branding: { ...c.branding, splashLogo: asset } }))}
              label="Splash logo"
              help="Optional. Use a transparent PNG of your logo or wordmark."
            />
          </div>
        </div>

        <div className="card">
          <div className="card__title">App background</div>
          <div className="card__sub">
            A wallpaper image behind every page. Keep the opacity low so text stays readable.
          </div>
          <div style={{ marginTop: 14 }}>
            <ImagePicker
              appId={appId}
              value={config.theme.wallpaper}
              onChange={(asset) => update((c) => ({ ...c, theme: { ...c.theme, wallpaper: asset } }))}
              help="Tip: a dark, low-contrast photo works best."
            />
            <Field label={`Opacity — ${config.theme.wallpaperOpacity}%`}>
              <input
                type="range"
                min={0}
                max={100}
                step={2}
                value={config.theme.wallpaperOpacity}
                onChange={(e) =>
                  update((c) => ({ ...c, theme: { ...c.theme, wallpaperOpacity: Number(e.target.value) } }))
                }
              />
            </Field>
          </div>
        </div>

        <div className="card">
          <div className="card__title">Install behaviour</div>
          <div style={{ marginTop: 8 }}>
            <Switch
              on={config.pwa.installPrompt}
              onChange={(on) => update((c) => ({ ...c, pwa: { ...c.pwa, installPrompt: on } }))}
              label="Show an install button"
              description="Adds a bookmark button to the app bar that triggers the native install prompt."
            />
            <Switch
              on={config.pwa.offline}
              onChange={(on) => update((c) => ({ ...c, pwa: { ...c.pwa, offline: on } }))}
              label="Work offline"
              description="Registers a service worker that caches the app so it opens without a connection."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
