"use client";

import { useState } from "react";
import { Btn, Field, Ico, toast } from "../ui";
import type { PanelProps } from "./types";

/**
 * Without a backend there is no inbox to read: form submissions open the
 * visitor's mail app and go to the contact address, which works on any host.
 */
export default function InboxPanel({ app, config, update }: PanelProps) {
  const [draft, setDraft] = useState(config.pwa.contactEmail);

  const save = () => {
    update((c) => ({ ...c, pwa: { ...c.pwa, contactEmail: draft.trim().slice(0, 120) } }));
    toast("Contact email updated");
  };

  return (
    <div className="panel">
      <div className="panel__inner">
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Where messages go</div>
              <div className="card__sub">Forms in {app.name} send straight to this address.</div>
            </div>
            <span className="badge badge--draft">
              <span className="dot" /> email delivery
            </span>
          </div>
          <Field label="Contact email" help="Use the address that already reaches you — the studio sends nothing itself.">
            <input
              className="input"
              type="email"
              value={draft}
              placeholder="hello@yourbusiness.com"
              onChange={(e) => setDraft(e.target.value)}
            />
          </Field>
          <div className="btn-group" style={{ marginTop: 12 }}>
            <Btn variant="primary" onClick={save} disabled={draft.trim() === config.pwa.contactEmail}>
              Save address
            </Btn>
            <Btn
              variant="ghost"
              onClick={() => {
                if (!config.pwa.contactEmail) return toast("Add an address first", "error");
                void navigator.clipboard?.writeText(config.pwa.contactEmail);
                toast("Address copied");
              }}
              icon="bookmark"
            >
              Copy address
            </Btn>
          </div>
          <div className="notice" style={{ marginTop: 14 }}>
            When someone submits a form, their mail app opens with the answers already filled in and your address in the To
            field. They press send. This needs no server, so it keeps working on GitHub Pages — and you get real replies.
          </div>
        </div>

        <div className="card">
          <div className="card__title">Want a real inbox?</div>
          <div className="card__sub">
            Deploy the API in <code>server/</code> and form submissions are stored for you, with an inbox and push
            notifications. The static studio keeps working as-is either way.
          </div>
          <div className="file-tree" style={{ marginTop: 10, fontSize: 12, color: "var(--muted)", lineHeight: 1.9 }}>
            <div>
              <Ico name="book" size={12} /> server/ — Cloudflare Worker with D1 storage, push sender and cron
            </div>
            <div>
              <Ico name="book" size={12} /> README.md — deployment notes and the environment variables it needs
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
