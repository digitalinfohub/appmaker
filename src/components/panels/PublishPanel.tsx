"use client";

import { useCallback, useEffect, useState } from "react";
import { api, formatBytes, formatDate, slugifyClient } from "@/lib/client";
import {
  checkRepository,
  defaultPagesUrl,
  loadGitHubConfig,
  parseRepoInput,
  saveGitHubConfig,
  type GitHubConfig,
} from "@/lib/local/github";
import { buildPreviewHtml, downloadZip } from "@/lib/local/publish";
import { qrSvg } from "@/lib/qr";
import { Btn, Field, Ico, toast } from "../ui";
import type { PanelProps } from "./types";

type PublishResult = {
  files: number;
  bytes: number;
  publicUrl: string;
  warnings: string[];
  version: number;
  commit?: string;
};

export default function PublishPanel({ app, appId, config, reload }: PanelProps) {
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [token, setToken] = useState("");
  const [pagesUrl, setPagesUrl] = useState("");
  const [connected, setConnected] = useState<{ owner: string; repo: string; private: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [slug, setSlug] = useState(app.slug);
  const [savingSlug, setSavingSlug] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const [lastResult, setLastResult] = useState<PublishResult | null>(null);

  const loadSettings = useCallback(async () => {
    const saved = await loadGitHubConfig();
    if (!saved) return;
    setRepo(`${saved.owner}/${saved.repo}`);
    setBranch(saved.branch || "main");
    setToken(saved.token);
    setPagesUrl(saved.pagesUrl || defaultPagesUrl(saved.owner, saved.repo));
    setConnected({ owner: saved.owner, repo: saved.repo, private: false });
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    setSlug(app.slug);
  }, [app.slug]);

  const currentConfig = (): GitHubConfig | null => {
    const parsed = parseRepoInput(repo);
    if (!parsed || !token.trim()) return null;
    return {
      owner: parsed.owner,
      repo: parsed.repo,
      branch: branch.trim() || "main",
      token: token.trim(),
      pagesUrl: pagesUrl.trim() || defaultPagesUrl(parsed.owner, parsed.repo),
    };
  };

  const connect = async () => {
    const next = currentConfig();
    if (!next) {
      toast("Enter the repository as owner/name and paste a token", "error");
      return;
    }
    setTesting(true);
    try {
      const info = await checkRepository(next);
      await saveGitHubConfig(next);
      setPagesUrl(next.pagesUrl);
      setConnected({ owner: next.owner, repo: next.repo, private: info.private });
      toast("Repository connected — publish whenever you are ready");
    } catch (error) {
      setConnected(null);
      toast((error as Error).message, "error");
    } finally {
      setTesting(false);
    }
  };

  const publicUrl =
    app.publishedUrl ||
    (() => {
      const parsed = parseRepoInput(repo);
      if (!parsed) return "";
      const base = (pagesUrl.trim() || defaultPagesUrl(parsed.owner, parsed.repo)).replace(/\/+$/, "");
      return `${base}/apps/${app.slug}/`;
    })();

  const publish = async () => {
    setBusy(true);
    try {
      const next = currentConfig();
      if (next) await saveGitHubConfig(next);
      const result = await api.post<PublishResult>(`/api/apps/${appId}/publish`);
      setLastResult(result);
      toast(
        result.warnings.length
          ? `Published ${result.files} files — ${result.warnings.length} image(s) were missing`
          : `Published ${result.files} files to GitHub`,
      );
      await reload();
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const unpublish = async () => {
    setBusy(true);
    try {
      await api.del(`/api/apps/${appId}/publish`);
      toast("App taken offline — its files were removed from the repo");
      await reload();
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    setZipBusy(true);
    try {
      const result = await downloadZip(config, { appId, slug: app.slug, publicUrl });
      toast(`Downloaded ${result.files} files (${formatBytes(result.bytes)})`);
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setZipBusy(false);
    }
  };

  const preview = async () => {
    try {
      const html = await buildPreviewHtml(config, { appId, slug: app.slug });
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      toast((error as Error).message, "error");
    }
  };

  const saveSlug = async () => {
    const next = slugifyClient(slug);
    if (!next || next === app.slug) return;
    setSavingSlug(true);
    try {
      await api.patch(`/api/apps/${appId}`, { slug: next });
      toast("Address updated — publish again to move the folder");
      await reload();
    } catch (error) {
      toast((error as Error).message, "error");
      setSlug(app.slug);
    } finally {
      setSavingSlug(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel__inner">
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">{connected ? "Your GitHub site" : "Connect GitHub"}</div>
              <div className="card__sub">
                Publishing commits this app to its own folder in your repository. GitHub Pages serves it from there.
              </div>
            </div>
            <span className={`badge ${connected ? "badge--live" : "badge--draft"}`}>
              <span className="dot" /> {connected ? `${connected.owner}/${connected.repo}` : "not connected"}
            </span>
          </div>

          <div className="field-row">
            <Field label="Repository" help="The repository that publishes your Pages site.">
              <input
                className="input"
                value={repo}
                placeholder="your-name/your-site"
                onChange={(e) => setRepo(e.target.value)}
                spellCheck={false}
              />
            </Field>
            <Field label="Branch">
              <input className="input" value={branch} onChange={(e) => setBranch(e.target.value)} spellCheck={false} />
            </Field>
          </div>
          <Field
            label="Fine-grained token"
            help="Needs Contents: read and write on this repository. It stays in this browser and is only sent to api.github.com."
          >
            <input
              className="input"
              type="password"
              value={token}
              placeholder="github_pat_…"
              onChange={(e) => setToken(e.target.value)}
              spellCheck={false}
            />
          </Field>
          <Field label="Site address" help="Where Pages serves your studio — leave as-is for a project site.">
            <input
              className="input"
              value={pagesUrl}
              placeholder="https://your-name.github.io/your-site/"
              onChange={(e) => setPagesUrl(e.target.value)}
              spellCheck={false}
            />
          </Field>
          <div className="btn-group">
            <Btn variant="primary" loading={testing} onClick={connect} icon="book">
              Save &amp; test connection
            </Btn>
            <Btn
              variant="ghost"
              onClick={() => {
                setConnected(null);
                setToken("");
                void saveGitHubConfig(null);
                toast("Repository disconnected");
              }}
            >
              Forget token
            </Btn>
          </div>
          <div className="notice" style={{ marginTop: 12 }}>
            Enable Pages once in the repository: <b>Settings → Pages → Build and deployment → Source: GitHub Actions</b>. The
            workflow in <code>.github/workflows/pages.yml</code> rebuilds the studio and republishes every app folder.
          </div>
        </div>

        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">{app.status === "published" ? "Live" : "Publish this app"}</div>
              <div className="card__sub">
                {app.status === "published"
                  ? "Every publish replaces this app's folder in one commit, so installed copies keep their address."
                  : "A published app is a complete, installable PWA in its own folder."}
              </div>
            </div>
            <span className={`badge ${app.status === "published" ? "badge--live" : "badge--draft"}`}>
              <span className="dot" /> {app.status === "published" ? "Live" : "Draft"}
            </span>
          </div>

          {publicUrl && (
            <div className="url-box" style={{ marginBottom: 12 }}>
              <code>{publicUrl}</code>
              <Btn size="sm" onClick={() => void navigator.clipboard?.writeText(publicUrl).then(() => toast("Link copied"))}>
                Copy
              </Btn>
              {app.status === "published" && (
                <a className="btn btn--sm btn--primary" href={publicUrl} target="_blank" rel="noopener">
                  <Ico name="pin" size={13} /> Open
                </a>
              )}
            </div>
          )}

          <div className="btn-group">
            <Btn variant="primary" loading={busy} onClick={publish} icon="sparkles">
              {app.status === "published" ? "Publish changes" : "Publish app"}
            </Btn>
            <Btn variant="ghost" loading={zipBusy} onClick={download} icon="bookmark">
              Download .zip
            </Btn>
            <Btn variant="ghost" onClick={preview} icon="pin">
              Preview
            </Btn>
            {app.status === "published" && (
              <Btn variant="danger" loading={busy} onClick={unpublish}>
                Take offline
              </Btn>
            )}
          </div>

          {app.status === "published" && (
            <>
              <div className="kv" style={{ marginTop: 14 }}>
                <span>Published</span>
                <b>{formatDate(app.publishedAt)}</b>
              </div>
              <div className="kv">
                <span>Version</span>
                <b>v{app.version}</b>
              </div>
              <div className="kv">
                <span>Files in folder</span>
                <b>{app.publishedFiles?.length ?? 0}</b>
              </div>
            </>
          )}
          {lastResult?.commit && (
            <div className="kv">
              <span>Last commit</span>
              <b>
                <a href={lastResult.commit} target="_blank" rel="noopener">
                  view on GitHub
                </a>
              </b>
            </div>
          )}
          {lastResult?.warnings?.length ? (
            <div className="notice notice--warn" style={{ marginTop: 12 }}>
              {lastResult.warnings.join(" · ")}
            </div>
          ) : null}
        </div>

        <div className="publish-grid">
          <div className="card">
            <div className="card__title">App address</div>
            <div className="card__sub">The folder name under <code>apps/</code>. Keep it stable so QR codes never break.</div>
            <div style={{ marginTop: 12 }}>
              <Field label="Slug">
                <div className="url-box">
                  <span style={{ color: "var(--muted2)", fontSize: 12 }}>apps/</span>
                  <input
                    className="input"
                    value={slug}
                    disabled={savingSlug}
                    onChange={(e) => setSlug(slugifyClient(e.target.value))}
                  />
                  <Btn size="sm" loading={savingSlug} onClick={saveSlug}>
                    Save
                  </Btn>
                </div>
              </Field>
              <p className="help">
                Renaming moves the folder on the next publish. Old links stop working, so share a fresh QR code afterwards.
              </p>
            </div>
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div className="qr-card" style={{ width: "100%", background: "#fff", padding: 10, borderRadius: 12 }}>
              <div dangerouslySetInnerHTML={{ __html: publicUrl ? qrSvg(publicUrl, 180) : "" }} />
            </div>
            <p className="help" style={{ textAlign: "center" }}>
              Scan to open {config.shortName || config.name} on a phone. The page detects the device and shows the install path.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card__title">What gets published</div>
          <div className="file-tree" style={{ marginTop: 10, fontSize: 12, color: "var(--muted)", lineHeight: 1.9 }}>
            <div>index.html — the whole app, all pages and offline routing</div>
            <div>manifest.webmanifest — install metadata, icons and shortcuts</div>
            <div>sw.js — service worker for offline use and push notifications</div>
            <div>offline.html — fallback when there is no connection</div>
            <div>icons/ — 512, 192, 180 and maskable icons</div>
            <div>media/ — every uploaded photo used in the app</div>
            <div style={{ marginTop: 8 }}>
              Forms send to your contact email, so they keep working with no server. Push delivery needs the API in{" "}
              <code>server/</code>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
