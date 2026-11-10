"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/client";
import { mediaUrl } from "@/lib/local/media";
import { buildPreviewHtml } from "@/lib/local/publish";
import { BLOCK_DEFS, createBlock, newId } from "@/lib/blocks";
import { appCss, renderBlock, type RenderContext } from "@/lib/render";
import { ICON_NAMES } from "@/lib/icons";
import type { AppConfig, AppRecord, Block, BlockType, Page } from "@/lib/types";
import { Btn, Field, Ico, Modal, Toaster, toast } from "./ui";
import { BlockInspector, PageInspector } from "./Inspector";
import BrandPanel from "./panels/BrandPanel";
import SettingsPanel from "./panels/SettingsPanel";
import PublishPanel from "./panels/PublishPanel";
import NotifyPanel from "./panels/NotifyPanel";
import InboxPanel from "./panels/InboxPanel";

type Tab = "design" | "brand" | "settings" | "publish" | "notify" | "inbox";
type Device = "mobile" | "tablet" | "desktop";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "design", label: "Design", icon: "grid" },
  { id: "brand", label: "Brand", icon: "image" },
  { id: "settings", label: "Settings", icon: "tag" },
  { id: "publish", label: "Publish", icon: "sparkles" },
  { id: "notify", label: "Push", icon: "bell" },
  { id: "inbox", label: "Inbox", icon: "message" },
];

const GROUPS = ["Sections", "Basics", "Media", "Layout"] as const;

function insertAt<T>(items: T[], item: T, index: number): T[] {
  const next = [...items];
  next.splice(Math.max(0, Math.min(items.length, index)), 0, item);
  return next;
}

export default function Builder({ appId }: { appId: string }) {
  const [app, setApp] = useState<AppRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("design");
  const [device, setDevice] = useState<Device>("mobile");
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [newPage, setNewPage] = useState("");
  const [newPageIcon, setNewPageIcon] = useState("grid");
  const [search, setSearch] = useState("");
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [dropzoneOver, setDropzoneOver] = useState(false);

  const drag = useRef<{ kind: "new"; type: BlockType } | { kind: "move"; index: number } | null>(null);
  const past = useRef<AppConfig[]>([]);
  const future = useRef<AppConfig[]>([]);
  const lastPush = useRef(0);
  const dirty = useRef(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ app: AppRecord }>(`/api/apps/${appId}`);
      setApp(data.app);
      setActivePageId((prev) => prev ?? data.app.config.homePageId ?? data.app.config.pages[0]?.id ?? null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [appId]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ------------------------------------------------------------- autosave */

  useEffect(() => {
    if (!app || !dirty.current) return;
    setSaving(true);
    const timer = setTimeout(async () => {
      try {
        await api.patch(`/api/apps/${appId}`, { name: app.config.name, config: app.config });
        dirty.current = false;
        setSaving(false);
        setSavedAt(Date.now());
      } catch (err) {
        setSaving(false);
        toast((err as Error).message, "error");
      }
    }, 850);
    return () => clearTimeout(timer);
  }, [app?.config, appId]);

  const mutate = useCallback((updater: (config: AppConfig) => AppConfig, history = true) => {
    setApp((prev) => {
      if (!prev) return prev;
      const next = updater(prev.config);
      if (next === prev.config) return prev;
      if (history) {
        const now = Date.now();
        if (now - lastPush.current > 600) past.current.push(prev.config);
        lastPush.current = now;
        future.current = [];
      }
      dirty.current = true;
      return { ...prev, config: next };
    });
  }, []);

  const undo = useCallback(() => {
    const previous = past.current.pop();
    if (!previous) return;
    setApp((prev) => {
      if (!prev) return prev;
      future.current.push(prev.config);
      dirty.current = true;
      return { ...prev, config: previous };
    });
  }, []);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    setApp((prev) => {
      if (!prev) return prev;
      past.current.push(prev.config);
      dirty.current = true;
      return { ...prev, config: next };
    });
  }, []);

  const config = app?.config;
  const pages = config?.pages ?? [];
  const activePage = pages.find((p) => p.id === activePageId) ?? pages[0] ?? null;
  const selectedBlock = activePage?.blocks.find((b) => b.id === selectedBlockId) ?? null;

  const openPreview = useCallback(async () => {
    if (!app) return;
    try {
      const html = await buildPreviewHtml(app.config, { appId, slug: app.slug });
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      toast((error as Error).message, "error");
    }
  }, [app, appId]);

  const css = useMemo(() => (config ? appCss(config) : ""), [config]);
  const ctx: RenderContext = useMemo(
    () => ({
      assetUrl: (ref) => (ref ? mediaUrl(ref.id) : null),
      publicUrl: app?.publishedUrl ?? "",
      apiBase: "",
      appId,
      slug: app?.slug ?? "",
      preview: true,
    }),
    [app?.slug, appId],
  );

  /* ---------------------------------------------------------------- keys */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (app) {
          void api
            .patch(`/api/apps/${appId}`, { name: app.config.name, config: app.config })
            .then(() => {
              dirty.current = false;
              setSavedAt(Date.now());
              toast("Saved");
            })
            .catch((err) => toast((err as Error).message, "error"));
        }
        return;
      }
      if (typing) return;
      if ((event.key === "Backspace" || event.key === "Delete") && selectedBlockId) {
        event.preventDefault();
        removeBlock(selectedBlockId);
      }
      if (event.key === "Escape") setSelectedBlockId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* -------------------------------------------------------------- blocks */

  const addBlock = (type: BlockType, index?: number) => {
    if (!activePage) return;
    const block = createBlock(type);
    mutate((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === activePage.id ? { ...page, blocks: insertAt(page.blocks, block, index ?? page.blocks.length) } : page,
      ),
    }));
    setSelectedBlockId(block.id);
  };

  const moveBlock = (from: number, target: number) => {
    if (!activePage) return;
    const blocks = [...activePage.blocks];
    if (from < 0 || from >= blocks.length) return;
    const [item] = blocks.splice(from, 1);
    const to = target > from ? target - 1 : target;
    blocks.splice(Math.max(0, Math.min(blocks.length, to)), 0, item);
    mutate((current) => ({
      ...current,
      pages: current.pages.map((page) => (page.id === activePage.id ? { ...page, blocks } : page)),
    }));
  };

  const removeBlock = (id: string) => {
    if (!activePage) return;
    mutate((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === activePage.id ? { ...page, blocks: page.blocks.filter((block) => block.id !== id) } : page,
      ),
    }));
    setSelectedBlockId(null);
  };

  const duplicateBlock = (id: string) => {
    if (!activePage) return;
    const index = activePage.blocks.findIndex((block) => block.id === id);
    if (index < 0) return;
    const source = activePage.blocks[index];
    const copy: Block = { ...source, id: newId("blk"), props: JSON.parse(JSON.stringify(source.props)) };
    mutate((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === activePage.id ? { ...page, blocks: insertAt(page.blocks, copy, index + 1) } : page,
      ),
    }));
    setSelectedBlockId(copy.id);
  };

  const updateBlockProps = (id: string, props: Record<string, any>) => {
    if (!activePage) return;
    mutate((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === activePage.id
          ? { ...page, blocks: page.blocks.map((block) => (block.id === id ? { ...block, props } : block)) }
          : page,
      ),
    }));
  };

  /* --------------------------------------------------------------- pages */

  const updatePage = (id: string, patch: Partial<Page>) => {
    mutate((current) => ({
      ...current,
      pages: current.pages.map((page) => (page.id === id ? { ...page, ...patch } : page)),
    }));
  };

  const deletePage = (id: string) => {
    if (!config || config.pages.length <= 1) {
      toast("An app needs at least one page", "error");
      return;
    }
    mutate((current) => {
      const next = current.pages.filter((page) => page.id !== id);
      return {
        ...current,
        pages: next,
        homePageId: current.homePageId === id ? next[0].id : current.homePageId,
      };
    });
    setSelectedBlockId(null);
    setActivePageId(null);
    toast("Page deleted — press ⌘Z to undo");
  };

  const createPage = () => {
    if (!config || !newPage.trim()) return;
    const page: Page = {
      id: newId("pg"),
      name: newPage.trim().slice(0, 40),
      slug:
        newPage
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 32) || "page",
      icon: newPageIcon,
      blocks: [],
      showInNav: true,
    };
    const exists = config.pages.some((p) => p.slug === page.slug);
    if (exists) page.slug = `${page.slug}-2`;
    mutate((current) => ({ ...current, pages: [...current.pages, page] }));
    setActivePageId(page.id);
    setSelectedBlockId(null);
    setAdding(false);
    setNewPage("");
    setNewPageIcon("grid");
  };

  /* ----------------------------------------------------------- drag/drop */

  const computeDropIndex = (clientY: number): number => {
    const container = canvasRef.current;
    if (!container) return activePage?.blocks.length ?? 0;
    const nodes = Array.from(container.querySelectorAll<HTMLElement>("[data-canvas-block]"));
    let index = nodes.length;
    for (let i = 0; i < nodes.length; i++) {
      const rect = nodes[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        index = i;
        break;
      }
    }
    return index;
  };

  const onDragOverCanvas = (event: React.DragEvent) => {
    if (!drag.current) return;
    event.preventDefault();
    setDropIndex(computeDropIndex(event.clientY));
    setDropzoneOver(false);
  };

  const onDropCanvas = (event: React.DragEvent) => {
    event.preventDefault();
    const payload = drag.current;
    const index = dropIndex ?? activePage?.blocks.length ?? 0;
    drag.current = null;
    setDropIndex(null);
    setDropzoneOver(false);
    if (!payload) return;
    if (payload.kind === "new") addBlock(payload.type, index);
    else moveBlock(payload.index, index);
  };

  const endDrag = () => {
    drag.current = null;
    setDropIndex(null);
    setDropzoneOver(false);
  };

  if (error) {
    return (
      <div className="shell">
        <header className="topbar">
          <a className="btn btn--ghost btn--sm" href="#/">
            <Ico name="menu" size={14} /> Studio
          </a>
        </header>
        <main className="page">
          <div className="notice notice--warn">{error}</div>
        </main>
        <Toaster />
      </div>
    );
  }

  if (!app || !config || !activePage) {
    return (
      <div className="builder" style={{ display: "grid", placeItems: "center" }}>
        <span className="spinner" />
        <Toaster />
      </div>
    );
  }

  const filtered = (group: string) =>
    BLOCK_DEFS.filter(
      (def) => def.group === group && (!search || `${def.name} ${def.description}`.toLowerCase().includes(search.toLowerCase())),
    );

  return (
    <div className="builder">
      <header className="bbar">
        <a className="btn btn--icon" href="#/" aria-label="Back to studio" title="Back to studio">
          <Ico name="menu" size={16} />
        </a>
        <div className="bbar__name">
          <input
            value={config.name}
            onChange={(e) => {
              const name = e.target.value.slice(0, 60);
              mutate((current) => ({ ...current, name, shortName: current.shortName || name.slice(0, 12) }), false);
            }}
            aria-label="App name"
          />
          <span className={`badge ${app.status === "published" ? "badge--live" : "badge--draft"}`}>
            <span className="dot" /> {app.status === "published" ? "Live" : "Draft"}
          </span>
        </div>
        <div className="bbar__status">
          {saving ? (
            <>
              <span className="spinner" /> Saving…
            </>
          ) : savedAt ? (
            <>Saved</>
          ) : null}
        </div>
        <div className="spacer" />
        <div className="modetabs">
          {TABS.map((item) => (
            <button
              key={item.id}
              className="modetab"
              data-active={tab === item.id}
              onClick={() => setTab(item.id)}
              type="button"
            >
              <Ico name={item.icon} size={13} /> {item.label}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <Btn variant="ghost" size="sm" onClick={undo} title="Undo (⌘Z)">
          <Ico name="menu" size={0} />
          <span style={{ fontSize: 15, lineHeight: 1 }}>↶</span>
        </Btn>
        <Btn variant="ghost" size="sm" onClick={redo} title="Redo (⇧⌘Z)">
          <span style={{ fontSize: 15, lineHeight: 1 }}>↷</span>
        </Btn>
        <Btn size="sm" onClick={() => void openPreview()} icon="pin">
          Preview
        </Btn>
        {app.status === "published" && app.publishedUrl && (
          <a className="btn btn--sm" href={app.publishedUrl} target="_blank" rel="noopener">
            <Ico name="sparkles" size={13} /> Live
          </a>
        )}
        <Btn variant="primary" size="sm" onClick={() => setTab("publish")} icon="sparkles">
          {app.status === "published" ? "Republish" : "Publish"}
        </Btn>
      </header>

      {tab === "design" ? (
        <div className="b-body">
          <aside className="palette">
            <input
              className="input palette__search"
              placeholder="Search blocks"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {GROUPS.map((group) => {
              const defs = filtered(group);
              if (!defs.length) return null;
              return (
                <div key={group}>
                  <div className="palette__group">{group}</div>
                  {defs.map((def) => (
                    <button
                      key={def.type}
                      type="button"
                      className="palette__item"
                      draggable
                      onDragStart={(event) => {
                        drag.current = { kind: "new", type: def.type };
                        event.dataTransfer.setData("text/plain", def.type);
                        event.dataTransfer.effectAllowed = "copy";
                      }}
                      onDragEnd={endDrag}
                      onClick={() => addBlock(def.type)}
                      title={def.description}
                    >
                      <span className="palette__ico">
                        <Ico name={def.icon} size={14} />
                      </span>
                      {def.name}
                    </button>
                  ))}
                </div>
              );
            })}
            <div className="palette__hint">
              Drag blocks onto the canvas, or click to add. Reorder by dragging a block. ⌘Z undoes anything.
            </div>
          </aside>

          <div className="canvas">
            <div className="canvas__bar">
              {pages.map((page) => (
                <button
                  key={page.id}
                  className="pagetab"
                  data-active={page.id === activePage.id}
                  onClick={() => {
                    setActivePageId(page.id);
                    setSelectedBlockId(null);
                  }}
                  type="button"
                >
                  <Ico name={page.icon} size={13} /> {page.name}
                </button>
              ))}
              <button className="pagetab" onClick={() => setAdding(true)} type="button">
                + Page
              </button>
              <div className="spacer" />
              <div className="modetabs">
                {(["mobile", "tablet", "desktop"] as Device[]).map((value) => (
                  <button
                    key={value}
                    className="modetab"
                    data-active={device === value}
                    onClick={() => setDevice(value)}
                    type="button"
                  >
                    {value === "mobile" ? "Phone" : value === "tablet" ? "Tablet" : "Desktop"}
                  </button>
                ))}
              </div>
            </div>

            <div className="canvas__scroll" onClick={() => setSelectedBlockId(null)}>
              <div className="device" data-w={device}>
                <div className="device__chrome">
                  <div
                    className="am-app canvas-app"
                    ref={canvasRef}
                    onDragOver={onDragOverCanvas}
                    onDrop={onDropCanvas}
                    onDragLeave={() => setDropIndex(null)}
                  >
                    <style dangerouslySetInnerHTML={{ __html: css }} />
                    <div className="am-main">
                      {activePage.blocks.map((block, index) => (
                        <Fragment key={block.id}>
                          {dropIndex === index && <div className="drop-line" />}
                          <div
                            className="canvas-block"
                            data-canvas-block
                            data-selected={block.id === selectedBlockId}
                            draggable
                            onDragStart={(event) => {
                              drag.current = { kind: "move", index };
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", block.type);
                            }}
                            onDragEnd={endDrag}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedBlockId(block.id);
                            }}
                          >
                            <div
                              style={{ pointerEvents: "none" }}
                              dangerouslySetInnerHTML={{ __html: renderBlock(block, config, ctx) }}
                            />
                            {block.id === selectedBlockId && (
                              <>
                                <div className="canvas-block__type">
                                  {BLOCK_DEFS.find((d) => d.type === block.type)?.name ?? block.type}
                                </div>
                                <div className="canvas-block__tools">
                                  <button
                                    type="button"
                                    title="Move up"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      moveBlock(index, index - 1);
                                    }}
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    title="Move down"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      moveBlock(index, index + 2);
                                    }}
                                  >
                                    ↓
                                  </button>
                                  <button
                                    type="button"
                                    title="Duplicate"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      duplicateBlock(block.id);
                                    }}
                                  >
                                    ⧉
                                  </button>
                                  <button
                                    type="button"
                                    title="Delete"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      removeBlock(block.id);
                                    }}
                                  >
                                    ×
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </Fragment>
                      ))}
                      {dropIndex === activePage.blocks.length && <div className="drop-line" />}
                      <div
                        className="canvas__dropzone"
                        data-over={dropzoneOver}
                        onDragOver={(event) => {
                          if (!drag.current) return;
                          event.preventDefault();
                          event.stopPropagation();
                          setDropIndex(activePage.blocks.length);
                          setDropzoneOver(true);
                        }}
                        onDragLeave={() => setDropzoneOver(false)}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const payload = drag.current;
                          drag.current = null;
                          setDropzoneOver(false);
                          setDropIndex(null);
                          if (!payload) return;
                          if (payload.kind === "new") addBlock(payload.type, activePage.blocks.length);
                          else moveBlock(payload.index, activePage.blocks.length);
                        }}
                      >
                        {activePage.blocks.length
                          ? "Drag a block here to add it to the end of the page"
                          : "Drag a block here to start building this page"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="inspector">
            {selectedBlock ? (
              <BlockInspector
                appId={appId}
                block={selectedBlock}
                onChange={(props) => updateBlockProps(selectedBlock.id, props)}
                onDelete={() => removeBlock(selectedBlock.id)}
              />
            ) : (
              <PageInspector
                page={activePage}
                isHome={config.homePageId === activePage.id}
                onChange={(patch) => updatePage(activePage.id, patch)}
                onSetHome={() => mutate((current) => ({ ...current, homePageId: activePage.id }))}
                onDelete={() => deletePage(activePage.id)}
              />
            )}
          </aside>
        </div>
      ) : tab === "brand" ? (
        <BrandPanel app={app} appId={appId} config={config} update={mutate} reload={load} />
      ) : tab === "settings" ? (
        <SettingsPanel app={app} appId={appId} config={config} update={mutate} reload={load} />
      ) : tab === "publish" ? (
        <PublishPanel app={app} appId={appId} config={config} update={mutate} reload={load} />
      ) : tab === "notify" ? (
        <NotifyPanel app={app} appId={appId} config={config} update={mutate} reload={load} />
      ) : (
        <InboxPanel app={app} appId={appId} config={config} update={mutate} reload={load} />
      )}

      {adding && (
        <Modal
          title="Add a page"
          subtitle="Pages become tabs inside the app. Each page has its own blocks."
          onClose={() => setAdding(false)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Btn>
              <Btn variant="primary" disabled={!newPage.trim()} onClick={createPage}>
                Add page
              </Btn>
            </>
          }
        >
          <Field label="Page name">
            <input
              className="input"
              autoFocus
              value={newPage}
              placeholder="Menu, Classes, Contact…"
              onChange={(e) => setNewPage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createPage()}
            />
          </Field>
          <Field label="Tab icon">
            <div className="icon-grid">
              {ICON_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="icon-cell"
                  data-active={newPageIcon === name}
                  onClick={() => setNewPageIcon(name)}
                  title={name}
                >
                  <Ico name={name} size={15} />
                </button>
              ))}
            </div>
          </Field>
        </Modal>
      )}

      <Toaster />
    </div>
  );
}
