"use client";

import { useCallback, useEffect, useState } from "react";
import { api, formatDate, relativeTime } from "@/lib/client";
import { endSession } from "@/lib/local/auth";
import { navigate } from "@/lib/local/router";
import { qrSvg } from "@/lib/qr";
import { Btn, EmptyState, Ico, Modal, Toaster, toast } from "./ui";

type AppSummary = {
  id: string;
  slug: string;
  name: string;
  status: "draft" | "published";
  version: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  pages: number;
  blocks: number;
  icon: string | null;
  primary: string;
  subscribers: number;
  submissions: number;
  scheduled: number;
  description: string;
  publicUrl: string;
};

type Totals = {
  apps: number;
  published: number;
  subscribers: number;
  submissions: number;
  scheduled: number;
};

const TEMPLATES = [
  { id: "blank", name: "Start from scratch", tagline: "A clean home page and nothing else", swatch: ["#7c6cff", "#22d3ee"] },
  { id: "cafe", name: "Café & bakery", tagline: "Menu, hours, loyalty, push updates", swatch: ["#c8763f", "#f4c26b"] },
  { id: "fitness", name: "Fitness studio", tagline: "Classes, timetable, memberships", swatch: ["#22c55e", "#a3e635"] },
  { id: "salon", name: "Salon & spa", tagline: "Treatments, gallery, booking form", swatch: ["#e879b9", "#f0c9a8"] },
  { id: "service", name: "Local service", tagline: "Quotes, service list, reviews", swatch: ["#3b82f6", "#38bdf8"] },
];

export default function Dashboard() {
  const [apps, setApps] = useState<AppSummary[] | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [template, setTemplate] = useState("cafe");
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<AppSummary | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AppSummary | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ apps: AppSummary[]; totals: Totals }>("/api/apps");
      setApps(data.apps);
      setTotals(data.totals);
    } catch (error) {
      toast((error as Error).message, "error");
      setApps([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const close = () => setMenuFor(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const create = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const data = await api.post<{ app: { id: string } }>("/api/apps", { name: newName.trim(), template });
      navigate(`/apps/${data.app.id}`);
    } catch (error) {
      toast((error as Error).message, "error");
      setBusy(false);
    }
  };

  const duplicate = async (app: AppSummary) => {
    setBusy(true);
    try {
      const data = await api.post<{ app: { id: string } }>(`/api/apps/${app.id}/duplicate`);
      toast("App duplicated");
      await load();
      navigate(`/apps/${data.app.id}`);
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (app: AppSummary) => {
    setBusy(true);
    try {
      await api.del(`/api/apps/${app.id}`);
      toast("App deleted");
      setConfirmDelete(null);
      await load();
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    endSession();
    navigate("/");
    window.dispatchEvent(new Event("am-auth"));
  };

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark">
            <Ico name="sparkles" size={16} />
          </span>
          App Maker
          <span className="brand__tag">Studio</span>
        </div>
        <div className="spacer" />
        <Btn variant="ghost" size="sm" onClick={logout} icon="user">
          Lock studio
        </Btn>
        <Btn variant="primary" icon="sparkles" onClick={() => setCreating(true)}>
          New app
        </Btn>
      </header>

      <main className="page">
        <div className="hero-row">
          <div>
            <h1 className="hero-title">Your app studio</h1>
            <p className="hero-sub">
              Design a PWA, install it on any phone, and publish it to your own GitHub Pages site. Every app lives in its own
              folder under <code style={{ color: "var(--muted)" }}>apps/&lt;name&gt;/</code> — ready to install or export.
            </p>
          </div>
        </div>

        <div className="stats">
          <div className="stat">
            <div className="stat__v">{totals?.apps ?? "—"}</div>
            <div className="stat__l">Apps in studio</div>
          </div>
          <div className="stat">
            <div className="stat__v">{totals?.published ?? "—"}</div>
            <div className="stat__l">Published</div>
          </div>
          <div className="stat">
            <div className="stat__v">{totals?.subscribers ?? "—"}</div>
            <div className="stat__l">Push subscribers</div>
          </div>
          <div className="stat">
            <div className="stat__v">{totals?.scheduled ?? "—"}</div>
            <div className="stat__l">Scheduled sends</div>
          </div>
        </div>

        {apps === null ? (
          <div className="card" style={{ display: "grid", placeItems: "center", height: 180 }}>
            <span className="spinner" />
          </div>
        ) : apps.length === 0 ? (
          <EmptyState
            icon="sparkles"
            title="Build your first app"
            body="Pick a starter, make it yours, then publish it to a folder and share the QR code. Push notifications and offline support are built in."
            action={
              <Btn variant="primary" icon="sparkles" onClick={() => setCreating(true)}>
                Create an app
              </Btn>
            }
          />
        ) : (
          <div className="apps-grid">
            {apps.map((app) => (
              <div className="app-card" key={app.id}>
                <div className="app-card__top">
                  <div className="app-card__icon" style={{ background: app.primary }}>
                    {app.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={app.icon} alt="" />
                    ) : (
                      app.name.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="app-card__name">
                      <span>{app.name}</span>
                      <span className={`badge ${app.status === "published" ? "badge--live" : "badge--draft"}`}>
                        <span className="dot" />
                        {app.status === "published" ? "Live" : "Draft"}
                      </span>
                    </div>
                    <div className="app-card__url">apps/{app.slug}/</div>
                  </div>
                  <div style={{ position: "relative" }}>
                    <button
                      className="btn btn--icon"
                      aria-label="More actions"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuFor(menuFor === app.id ? null : app.id);
                      }}
                    >
                      <Ico name="menu" size={16} />
                    </button>
                    {menuFor === app.id && (
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 34,
                          zIndex: 20,
                          background: "var(--panel2)",
                          border: "1px solid var(--line2)",
                          borderRadius: 10,
                          padding: 5,
                          minWidth: 168,
                          boxShadow: "var(--shadow)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button className="btn btn--ghost btn--block" style={{ justifyContent: "flex-start" }} onClick={() => duplicate(app)}>
                          <Ico name="grid" size={14} /> Duplicate
                        </button>
                        <button
                          className="btn btn--ghost btn--block"
                          style={{ justifyContent: "flex-start" }}
                          onClick={() => {
                            setMenuFor(null);
                            setConfirmDelete(app);
                          }}
                        >
                          <Ico name="tag" size={14} /> Delete app
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="app-card__meta">
                  <span>
                    <b>{app.pages}</b> pages
                  </span>
                  <span>
                    <b>{app.blocks}</b> blocks
                  </span>
                  <span>
                    <b>{app.subscribers}</b> subscribers
                  </span>
                </div>
                <div className="app-card__meta">
                  <span>Updated {relativeTime(app.updatedAt)}</span>
                  {app.status === "published" && <span>Live since {formatDate(app.publishedAt)}</span>}
                </div>

                <div className="app-card__actions">
                  <a className="btn btn--primary btn--sm" href={`#/apps/${app.id}`}>
                    <Ico name="book" size={14} /> Edit app
                  </a>
                  {app.status === "published" ? (
                    <>
                      <a className="btn btn--sm" href={app.publicUrl} target="_blank" rel="noopener">
                        <Ico name="pin" size={14} /> Open
                      </a>
                      <Btn size="sm" variant="ghost" onClick={() => setQr(app)} icon="grid">
                        QR
                      </Btn>
                    </>
                  ) : (
                    <Btn size="sm" variant="ghost" onClick={() => setQr(app)} icon="grid">
                      QR
                    </Btn>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {creating && (
        <Modal
          title="Create an app"
          subtitle="Start from a template you can shape in minutes. You can change every page later."
          onClose={() => setCreating(false)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setCreating(false)}>
                Cancel
              </Btn>
              <Btn variant="primary" loading={busy} disabled={!newName.trim()} onClick={create}>
                Create app
              </Btn>
            </>
          }
        >
          <div className="field">
            <label className="field__label">Business or app name</label>
            <input
              className="input"
              autoFocus
              placeholder="e.g. Harbour Coffee"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
            <span className="field__help">
              This becomes the app name and its folder: apps/{newName ? newName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : "your-app"}/
            </span>
          </div>
          <div className="field">
            <label className="field__label">Template</label>
            <div className="template-grid">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  className="template"
                  data-active={template === tpl.id}
                  onClick={() => setTemplate(tpl.id)}
                >
                  <span
                    className="template__sw"
                    style={{ background: `linear-gradient(140deg, ${tpl.swatch[0]}, ${tpl.swatch[1]})` }}
                  />
                  <span>
                    <span className="template__n">{tpl.name}</span>
                    <span className="template__d">{tpl.tagline}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {qr && (
        <Modal
          title={`${qr.name} QR code`}
          subtitle={
            qr.status === "published"
              ? "Scan with a phone camera to open and install the app."
              : "This app is a draft — publish it before sharing the code. The link below is where it will live."
          }
          onClose={() => setQr(null)}
          footer={
            <>
              <Btn
                variant="ghost"
                onClick={() => {
                  void navigator.clipboard?.writeText(qr.publicUrl);
                  toast("Link copied");
                }}
              >
                Copy link
              </Btn>
              <Btn variant="primary" onClick={() => setQr(null)}>
                Done
              </Btn>
            </>
          }
        >
          <div style={{ display: "grid", placeItems: "center", gap: 12 }}>
            <div className="qr-card" style={{ background: "#fff", padding: 12, borderRadius: 14, width: 200 }}>
              <div dangerouslySetInnerHTML={{ __html: qrSvg(qr.publicUrl, 176) }} />
            </div>
            <code style={{ fontSize: 12, color: "var(--muted)" }}>{qr.publicUrl}</code>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal
          title={`Delete ${confirmDelete.name}?`}
          subtitle="This removes the app, its published folder, its push subscribers and its inbox messages. This cannot be undone."
          onClose={() => setConfirmDelete(null)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>
                Keep app
              </Btn>
              <Btn variant="danger" loading={busy} onClick={() => remove(confirmDelete)}>
                Delete permanently
              </Btn>
            </>
          }
        >
          <div className="notice notice--warn">
            Anyone who installed this app will see it stop working once their offline cache expires.
          </div>
        </Modal>
      )}

      <Toaster />
    </div>
  );
}
