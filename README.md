# App Maker

A studio that builds installable web apps (PWAs) for your clients — and publishes each one to its own folder on
**GitHub Pages**.

Everything runs in the browser. There is no server to pay for, no database to manage: your apps, uploaded images and
settings live in IndexedDB on your machine, and publishing commits the generated files to your GitHub repository.

---

## What it does

- **Drag-and-drop builder** — 15 block types (hero, menu, gallery, pricing, form, map, hours, reviews…), reordering,
  duplicate/delete, undo & redo, autosave, mobile/tablet/desktop canvas widths.
- **Real design system** — colours, fonts, corner radius, dark mode, wallpaper, per-page icons; all shared by the blocks.
- **Multi-page apps** with a bottom tab bar, home page selection and per-page nav visibility.
- **Five starter templates** — blank, café, fitness studio, salon, local service.
- **Branding uploads** — icon (auto-generates 512/192/180/maskable), favicon, splash logo, splash background, app
  background. Images are optimised in the browser before being stored.
- **One-click publishing** — the studio builds `index.html`, `manifest.webmanifest`, `sw.js`, `offline.html`, icons and
  media, then commits them to `apps/<app-name>/` in your repo in a single commit.
- **Installable result** — each app is a proper PWA: installable on Android/iOS, offline-capable, QR gate on desktop so
  visitors scan once and install on their phone.
- **`.zip` export** — download any app and host it anywhere else if you prefer.

## What needs more than GitHub Pages

GitHub Pages only serves files. Two features therefore need a small backend (the archived API in `server/`):

| Feature | On pure GitHub Pages |
| --- | --- |
| Forms | Open the visitor's mail app with the answers filled in and sent to your **contact email** — works everywhere. |
| Push notifications | The app is push-ready (service worker + subscribe button), but sending and scheduling need a server holding VAPID keys. The Push panel queues messages and gives you the payload. |

If you deploy `server/` (Cloudflare Worker + D1), both become fully automatic: stored submissions with an inbox, real
push delivery, and scheduled sends. The static studio keeps working either way.

## Studio passcode

The first visit asks you to create a passcode. It is hashed with PBKDF2 and checked in the browser — it is a convenient
lock screen, **not** server-side security, because anyone with the built files can read local storage. The real
protection for your site is your GitHub account: keep that password safe and use a fine-grained token.

## Publishing to GitHub Pages

1. Create a repository (for example `your-name/your-site`) and push this project to `main`.
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The included workflow (`.github/workflows/pages.yml`) builds the studio, copies every committed `apps/` folder into
   the site output, and deploys to Pages on each push.
4. Open `https://your-name.github.io/your-site/` and create your studio passcode.
5. In the builder: **Publish → Connect GitHub**. Paste a fine-grained token with **Contents: read and write** on that
   repository. The token stays in your browser and is only sent to `api.github.com`.
6. Press **Publish app**. The app appears at `https://your-name.github.io/your-site/apps/<app-name>/`, and the QR code in
   the panel opens it on a phone.

> **Project sites vs user sites.** For `https://user.github.io/repo/` the workflow sets
> `NEXT_PUBLIC_BASE_PATH=/repo`. For a user site (`user.github.io`) or a custom domain, set that variable to an empty
> string in the workflow (or your build environment).

Each publish is one commit that replaces the app's folder and deletes files that are no longer part of the app, so a
published address and its QR code never break.

## Local development

```bash
bun install
bunx next dev -H 0.0.0.0 -p 3000   # studio at http://localhost:3000
bun test                            # push encryption, zip, config, bundle tests
bunx next build                     # static export into out/
```

The build is a fully static export (`output: "export"`) — `out/` can be served by any static host.

## The optional server

`server/` contains the previous Cloudflare Worker edition of the API: cookie auth, D1 storage, R2 media, real Web Push
(VAPID, RFC 8291) and a cron trigger that sends scheduled notifications. It is not used by the static studio but is kept
so forms, inbox and push can be switched on later. See `server/README.md`.

## Project layout

```
src/app/            single hash-routed studio page (static export)
src/components/     dashboard, builder, inspector, panels, UI kit
src/lib/render.ts   generates the published app: CSS, blocks, shell, QR gate, manifest, service worker
src/lib/siteFiles.ts assembles a complete PWA bundle
src/lib/local/      IndexedDB store, media blobs, router, local /api implementation, GitHub publisher
server/             optional API for push, scheduling and form storage
.github/workflows/  Pages deployment
```

## Notes

- Everything is local-first: clearing site data removes your apps, so use **Download .zip** or publish to GitHub as a
  backup.
- Publishing requires the token to have `Contents: write`; a 401/403 in the panel means the token expired or is too
  narrow.
- App folders are plain static files — you can edit them in the repo, but the next publish from the studio overwrites
  them.
