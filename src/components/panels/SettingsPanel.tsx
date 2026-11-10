"use client";

import { useState } from "react";
import { ICON_NAMES } from "@/lib/icons";
import { ColorField, Field, Ico, Segmented, Switch, toast } from "../ui";
import type { PanelProps } from "./types";

const FONTS = [
  { value: "sans", label: "Sans" },
  { value: "serif", label: "Serif" },
  { value: "rounded", label: "Rounded" },
  { value: "display", label: "Display" },
  { value: "mono", label: "Mono" },
] as const;

export default function SettingsPanel({ config, update }: PanelProps) {
  const [openPage, setOpenPage] = useState<string | null>(null);

  return (
    <div className="panel">
      <div className="panel__inner">
        <div className="card">
          <div className="card__title">App details</div>
          <div className="card__sub">Shown on the install prompt, home screen and notification tray.</div>
          <div style={{ marginTop: 14 }}>
            <div className="field-row">
              <Field label="App name">
                <input
                  className="input"
                  value={config.name}
                  onChange={(e) => update((c) => ({ ...c, name: e.target.value.slice(0, 60) }))}
                />
              </Field>
              <Field label="Short name" help="Home screen label — keep it under 12 characters.">
                <input
                  className="input"
                  value={config.shortName}
                  onChange={(e) => update((c) => ({ ...c, shortName: e.target.value.slice(0, 14) }))}
                />
              </Field>
            </div>
            <Field label="Description" help="Used by the install prompt and the desktop landing page.">
              <textarea
                className="textarea"
                value={config.description}
                onChange={(e) => update((c) => ({ ...c, description: e.target.value.slice(0, 220) }))}
              />
            </Field>
          </div>
        </div>

        <div className="card">
          <div className="card__title">Colours &amp; type</div>
          <div className="card__sub">One theme drives every block, the app bar and the tab bar.</div>
          <div style={{ marginTop: 14 }}>
            <div className="field-row">
              <Field label="Primary">
                <ColorField
                  value={config.theme.primary}
                  onChange={(value) => update((c) => ({ ...c, theme: { ...c.theme, primary: value } }))}
                />
              </Field>
              <Field label="Accent">
                <ColorField
                  value={config.theme.accent}
                  onChange={(value) => update((c) => ({ ...c, theme: { ...c.theme, accent: value } }))}
                />
              </Field>
            </div>
            <div className="field-row">
              <Field label="Background">
                <ColorField
                  value={config.theme.background}
                  onChange={(value) => update((c) => ({ ...c, theme: { ...c.theme, background: value } }))}
                />
              </Field>
              <Field label="Surface (cards)">
                <ColorField
                  value={config.theme.surface}
                  onChange={(value) => update((c) => ({ ...c, theme: { ...c.theme, surface: value } }))}
                />
              </Field>
            </div>
            <div className="field-row">
              <Field label="Text">
                <ColorField
                  value={config.theme.text}
                  onChange={(value) => update((c) => ({ ...c, theme: { ...c.theme, text: value } }))}
                />
              </Field>
              <Field label="Muted text">
                <ColorField
                  value={config.theme.muted}
                  onChange={(value) => update((c) => ({ ...c, theme: { ...c.theme, muted: value } }))}
                />
              </Field>
            </div>
            <div className="field-row">
              <Field label="Font">
                <select
                  className="select"
                  value={config.theme.font}
                  onChange={(e) =>
                    update((c) => ({ ...c, theme: { ...c.theme, font: e.target.value as typeof c.theme.font } }))
                  }
                >
                  {FONTS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`Corner radius — ${config.theme.radius}px`}>
                <input
                  type="range"
                  min={0}
                  max={40}
                  step={1}
                  value={config.theme.radius}
                  onChange={(e) =>
                    update((c) => ({ ...c, theme: { ...c.theme, radius: Number(e.target.value) } }))
                  }
                />
              </Field>
            </div>
            <Switch
              on={config.theme.dark}
              onChange={(on) => update((c) => ({ ...c, theme: { ...c.theme, dark: on } }))}
              label="Dark colour scheme"
              description="Tells the browser how to render form controls and the status bar."
            />
          </div>
        </div>

        <div className="card">
          <div className="card__title">Pages</div>
          <div className="card__sub">Pages become tabs in the app. Up to five show in the bottom bar.</div>
          <div style={{ marginTop: 10 }}>
            {config.pages.map((page) => (
              <div key={page.id}>
                <div className="page-row">
                  <div className="page-row__icon">
                    <Ico name={page.icon} size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input
                      className="input"
                      style={{ padding: "5px 8px", fontSize: 12.5 }}
                      value={page.name}
                      onChange={(e) =>
                        update((c) => ({
                          ...c,
                          pages: c.pages.map((p) =>
                            p.id === page.id ? { ...p, name: e.target.value.slice(0, 40) } : p,
                          ),
                        }))
                      }
                    />
                  </div>
                  <span className="badge">{page.blocks.length} blocks</span>
                  <button className="mini-btn" onClick={() => setOpenPage(openPage === page.id ? null : page.id)}>
                    <Ico name="grid" size={13} />
                  </button>
                </div>
                {openPage === page.id && (
                  <div style={{ padding: "4px 0 14px" }}>
                    <div className="field-row">
                      <Field label="Tab icon">
                        <select
                          className="select"
                          value={page.icon}
                          onChange={(e) =>
                            update((c) => ({
                              ...c,
                              pages: c.pages.map((p) => (p.id === page.id ? { ...p, icon: e.target.value } : p)),
                            }))
                          }
                        >
                          {ICON_NAMES.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Address">
                        <input className="input" value={`#/${page.slug}`} readOnly />
                      </Field>
                    </div>
                    <Switch
                      on={page.showInNav}
                      onChange={(on) =>
                        update((c) => ({
                          ...c,
                          pages: c.pages.map((p) => (p.id === page.id ? { ...p, showInNav: on } : p)),
                        }))
                      }
                      label="Show in the bottom tab bar"
                      description="Hidden pages still exist and can be linked to from buttons."
                    />
                    <div className="btn-group" style={{ marginTop: 10 }}>
                      <button
                        className="btn btn--sm"
                        disabled={config.homePageId === page.id}
                        onClick={() => update((c) => ({ ...c, homePageId: page.id }))}
                      >
                        {config.homePageId === page.id ? "This is the home page" : "Make home page"}
                      </button>
                      <button
                        className="btn btn--sm btn--danger"
                        disabled={config.pages.length <= 1}
                        onClick={() => {
                          if (config.pages.length <= 1) return;
                          update((c) => {
                            const pages = c.pages.filter((p) => p.id !== page.id);
                            return { ...c, pages, homePageId: c.homePageId === page.id ? pages[0].id : c.homePageId };
                          });
                          toast("Page deleted");
                        }}
                      >
                        Delete page
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card__title">Install &amp; display</div>
          <div style={{ marginTop: 6 }}>
            <Field label="Display mode">
              <Segmented
                value={config.pwa.display}
                onChange={(value) => update((c) => ({ ...c, pwa: { ...c.pwa, display: value } }))}
                options={[
                  { value: "standalone", label: "Standalone" },
                  { value: "fullscreen", label: "Full screen" },
                  { value: "minimal-ui", label: "Minimal UI" },
                  { value: "browser", label: "Browser" },
                ]}
              />
            </Field>
            <Field label="Orientation">
              <Segmented
                value={config.pwa.orientation}
                onChange={(value) => update((c) => ({ ...c, pwa: { ...c.pwa, orientation: value } }))}
                options={[
                  { value: "portrait", label: "Portrait" },
                  { value: "landscape", label: "Landscape" },
                  { value: "any", label: "Either" },
                ]}
              />
            </Field>
            <Field label="Status bar colour">
              <ColorField
                value={config.pwa.themeColor}
                onChange={(value) => update((c) => ({ ...c, pwa: { ...c.pwa, themeColor: value } }))}
              />
            </Field>
            <Field label="Desktop behaviour" help="What someone sees when they open the app on a laptop.">
              <Segmented
                value={config.pwa.desktopMode}
                onChange={(value) => update((c) => ({ ...c, pwa: { ...c.pwa, desktopMode: value } }))}
                options={[
                  { value: "qr-first", label: "QR to install on phone" },
                  { value: "app-first", label: "Open the app" },
                ]}
              />
            </Field>
          </div>
        </div>

        <div className="card">
          <div className="card__title">Notifications</div>
          <div style={{ marginTop: 6 }}>
            <Switch
              on={config.pwa.pushEnabled}
              onChange={(on) => update((c) => ({ ...c, pwa: { ...c.pwa, pushEnabled: on } }))}
              label="Allow push notifications"
              description="Shows a bell button in the app bar. Requires a push server — see the Notifications panel."
            />
            <Field
              label="Form submissions email"
              help="Forms open the visitor's mail app and send here, so you still receive enquiries without a server."
            >
              <input
                className="input"
                type="email"
                placeholder="hello@yourbusiness.com"
                value={config.pwa.contactEmail}
                onChange={(e) => update((c) => ({ ...c, pwa: { ...c.pwa, contactEmail: e.target.value.slice(0, 120) } }))}
              />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}
