"use client";

import { useCallback, useEffect, useState } from "react";
import { toLocalDateTimeInput } from "@/lib/client";
import { idbAll, idbDelete, idbPut, type StoredNotification } from "@/lib/local/idb";
import { Btn, Field, Ico, Toaster, toast } from "../ui";
import type { PanelProps } from "./types";

/**
 * GitHub Pages is static: it cannot hold subscriptions or run a scheduler, so
 * notifications cannot be delivered from here. The studio still lets you write
 * and queue them, and hands you the exact payload to send from the archived
 * API in `server/` (or any push service).
 */
export default function NotifyPanel({ app, appId, config }: PanelProps) {
  const [rows, setRows] = useState<StoredNotification[] | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [when, setWhen] = useState(() => toLocalDateTimeInput(new Date(Date.now() + 60 * 60 * 1000)));
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const all = await idbAll<StoredNotification>("notifications");
    setRows(all.filter((row) => row.app_id === appId).sort((a, b) => a.send_at.localeCompare(b.send_at)));
  }, [appId]);

  useEffect(() => {
    void load();
  }, [load]);

  const queue = async () => {
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    try {
      const sendAt = new Date(when);
      const row: StoredNotification = {
        id: crypto.randomUUID(),
        app_id: appId,
        title: title.trim().slice(0, 80),
        body: body.trim().slice(0, 300),
        url: url.trim() ? url.trim().slice(0, 300) : null,
        icon: null,
        status: "scheduled",
        send_at: (Number.isNaN(sendAt.getTime()) ? new Date() : sendAt).toISOString(),
        sent_at: null,
        recipients: 0,
        failures: 0,
        error: null,
        created_at: new Date().toISOString(),
      };
      await idbPut("notifications", row);
      setTitle("");
      setBody("");
      setUrl("");
      toast("Notification queued in this browser");
      await load();
    } catch (error) {
      toast((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const copyPayload = async (row: StoredNotification) => {
    const payload = {
      slug: app.slug,
      title: row.title,
      body: row.body,
      url: row.url ?? "/",
      icon: config.branding.icon ? `icons/icon-192.png` : undefined,
      sendAt: row.send_at,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast("Payload copied — paste it into your sender");
    } catch {
      toast("Could not copy to the clipboard", "error");
    }
  };

  const remove = async (row: StoredNotification) => {
    await idbDelete("notifications", row.id);
    await load();
  };

  return (
    <div className="panel">
      <div className="panel__inner">
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Push notifications</div>
              <div className="card__sub">Write the message here, then send it from a small push server.</div>
            </div>
            <span className="badge badge--draft">
              <span className="dot" /> needs a server
            </span>
          </div>
          <div className="notice notice--warn">
            GitHub Pages only serves files, so it cannot store push subscriptions or run a timer. The app itself is ready for
            push: its service worker and subscribe button are already in the published files. To deliver messages, deploy the
            API in <code>server/</code> (it has VAPID keys and a scheduler) and point it at the same repository.
          </div>
        </div>

        <div className="card">
          <div className="card__title">Compose</div>
          <div style={{ marginTop: 12 }}>
            <Field label="Title">
              <input
                className="input"
                value={title}
                maxLength={80}
                placeholder="Fresh pastries out of the oven"
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field label="Message" help="Keep it under 300 characters so it fits on a lock screen.">
              <textarea
                className="textarea"
                rows={3}
                value={body}
                maxLength={300}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Today's special: cardamom buns, still warm."
              />
            </Field>
            <div className="field-row">
              <Field label="Opens">
                <input
                  className="input"
                  value={url}
                  placeholder={`#/${config.pages[0]?.slug ?? ""}`}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </Field>
              <Field label="Scheduled for">
                <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
              </Field>
            </div>
            <Btn variant="primary" loading={busy} disabled={!title.trim() || !body.trim()} onClick={queue} icon="sparkles">
              Queue notification
            </Btn>
          </div>
        </div>

        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Queue</div>
              <div className="card__sub">Saved in this browser. Copy a payload when you are ready to send.</div>
            </div>
          </div>
          <div className="file-tree">
            {rows === null ? (
              <span className="spinner" />
            ) : rows.length === 0 ? (
              <p className="help">Nothing queued yet.</p>
            ) : (
              rows.map((row) => (
                <div className="file-row" key={row.id}>
                  <Ico name="bell" size={13} />
                  <span className="file-row__path" style={{ cursor: "default" }}>
                    {row.title}
                    <span style={{ color: "var(--muted2)" }}> · {new Date(row.send_at).toLocaleString()}</span>
                  </span>
                  <Btn size="sm" variant="ghost" onClick={() => void copyPayload(row)}>
                    Copy
                  </Btn>
                  <Btn size="sm" variant="ghost" onClick={() => void remove(row)}>
                    Remove
                  </Btn>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
