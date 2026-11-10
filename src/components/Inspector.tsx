"use client";

import { useState } from "react";
import { BLOCK_MAP, type Field } from "@/lib/blocks";
import { ICON_NAMES } from "@/lib/icons";
import type { Block, Page } from "@/lib/types";
import { Btn, ColorField, Field as FieldWrap, Ico, ImagePicker, Switch } from "./ui";

function Control({
  field,
  value,
  onChange,
  appId,
}: {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  appId: string;
}) {
  switch (field.type) {
    case "text":
    case "url":
      return (
        <input
          className="input"
          value={(value as string) ?? ""}
          placeholder={field.placeholder ?? (field.type === "url" ? "https:// or #/page" : undefined)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "textarea":
      return (
        <textarea
          className="textarea"
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "color":
      return <ColorField value={(value as string) ?? "#6d5efc"} onChange={onChange} />;
    case "number":
      return (
        <input
          className="input"
          type="number"
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={typeof value === "number" ? value : Number(value) || 0}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      );
    case "select":
      return (
        <select className="select" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case "toggle":
      return <Switch on={Boolean(value)} onChange={onChange} label={field.label} description={field.help} />;
    case "image":
      return (
        <ImagePicker
          compact
          appId={appId}
          value={(value as any) ?? null}
          onChange={onChange}
          help={field.help}
        />
      );
    case "list":
      return <ListEditor field={field} value={value} onChange={onChange} appId={appId} />;
    default:
      return null;
  }
}

function ListEditor({
  field,
  value,
  onChange,
  appId,
}: {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  appId: string;
}) {
  const items: Record<string, any>[] = Array.isArray(value) ? (value as Record<string, any>[]) : [];
  const [open, setOpen] = useState<number | null>(items.length ? 0 : null);
  const itemFields = field.itemFields ?? [];

  const commit = (next: Record<string, any>[]) => onChange(next);

  const updateItem = (index: number, patch: Record<string, any>) => {
    commit(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const add = () => {
    const blank: Record<string, any> = {};
    for (const sub of itemFields) {
      blank[sub.key] = sub.type === "toggle" ? false : sub.type === "image" ? null : "";
    }
    commit([...items, blank]);
    setOpen(items.length);
  };

  const remove = (index: number) => {
    commit(items.filter((_, i) => i !== index));
    setOpen(null);
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
    setOpen(target);
  };

  const labelFor = (item: Record<string, any>, index: number) => {
    const first = itemFields.find((f) => f.type === "text" || f.type === "textarea");
    const raw = first ? String(item[first.key] ?? "").trim() : "";
    return raw ? raw.slice(0, 34) : `${field.itemLabel ?? "Item"} ${index + 1}`;
  };

  return (
    <div>
      {items.map((item, index) => (
        <div className="list-item" key={index} data-open={open === index}>
          <div className="list-item__head">
            <button className="list-item__grip" onClick={() => setOpen(open === index ? null : index)} type="button">
              <Ico name="menu" size={12} />
              {labelFor(item, index)}
            </button>
            <button className="mini-btn" onClick={() => move(index, -1)} disabled={index === 0} title="Move up" type="button">
              ↑
            </button>
            <button
              className="mini-btn"
              onClick={() => move(index, 1)}
              disabled={index === items.length - 1}
              title="Move down"
              type="button"
            >
              ↓
            </button>
            <button className="mini-btn" onClick={() => remove(index)} title="Remove" type="button">
              ×
            </button>
          </div>
          {open === index && (
            <div className="list-item__body">
              {itemFields.map((sub) =>
                sub.type === "toggle" ? (
                  <Control
                    key={sub.key}
                    field={sub}
                    value={item[sub.key]}
                    onChange={(v) => updateItem(index, { [sub.key]: v })}
                    appId={appId}
                  />
                ) : (
                  <FieldWrap key={sub.key} label={sub.label} help={sub.help}>
                    <Control
                      field={sub}
                      value={item[sub.key]}
                      onChange={(v) => updateItem(index, { [sub.key]: v })}
                      appId={appId}
                    />
                  </FieldWrap>
                ),
              )}
            </div>
          )}
        </div>
      ))}
      <Btn size="sm" variant="ghost" onClick={add} disabled={items.length >= (field.maxItems ?? 40)}>
        + Add {field.itemLabel ?? "item"}
      </Btn>
    </div>
  );
}

export function BlockInspector({
  appId,
  block,
  onChange,
  onDelete,
}: {
  appId: string;
  block: Block;
  onChange: (props: Record<string, any>) => void;
  onDelete: () => void;
}) {
  const def = BLOCK_MAP[block.type];
  if (!def) return null;

  return (
    <>
      <div className="inspector__head">
        <div style={{ flex: 1 }}>
          <div className="inspector__title">{def.name}</div>
          <div className="inspector__type">Content block</div>
        </div>
        <button className="mini-btn" onClick={onDelete} title="Delete block">
          ×
        </button>
      </div>
      <div className="inspector__body">
        {def.fields.map((field) =>
          field.type === "toggle" ? (
            <Control
              key={field.key}
              field={field}
              value={block.props[field.key]}
              onChange={(value) => onChange({ ...block.props, [field.key]: value })}
              appId={appId}
            />
          ) : (
            <FieldWrap key={field.key} label={field.label} help={field.help}>
              <Control
                field={field}
                value={block.props[field.key]}
                onChange={(value) => onChange({ ...block.props, [field.key]: value })}
                appId={appId}
              />
            </FieldWrap>
          ),
        )}
      </div>
    </>
  );
}

export function PageInspector({
  page,
  isHome,
  onChange,
  onSetHome,
  onDelete,
}: {
  page: Page;
  isHome: boolean;
  onChange: (patch: Partial<Page>) => void;
  onSetHome: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <div className="inspector__head">
        <div style={{ flex: 1 }}>
          <div className="inspector__title">{page.name}</div>
          <div className="inspector__type">Page settings</div>
        </div>
      </div>
      <div className="inspector__body">
        <FieldWrap label="Page name">
          <input
            className="input"
            value={page.name}
            onChange={(e) => onChange({ name: e.target.value.slice(0, 40) })}
          />
        </FieldWrap>
        <FieldWrap label="Tab icon">
          <div className="icon-grid">
            {ICON_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                className="icon-cell"
                data-active={page.icon === name}
                onClick={() => onChange({ icon: name })}
                title={name}
              >
                <Ico name={name} size={15} />
              </button>
            ))}
          </div>
        </FieldWrap>
        <Switch
          on={page.showInNav}
          onChange={(on) => onChange({ showInNav: on })}
          label="Show in the tab bar"
          description="Up to five pages appear in the bottom navigation."
        />
        <div className="btn-group" style={{ marginTop: 14 }}>
          <Btn size="sm" onClick={onSetHome} disabled={isHome}>
            {isHome ? "Home page" : "Set as home"}
          </Btn>
          <Btn size="sm" variant="danger" onClick={onDelete}>
            Delete page
          </Btn>
        </div>
        <p className="help" style={{ marginTop: 14 }}>
          Select any block on the canvas to edit its text, images, links and layout.
        </p>
      </div>
    </>
  );
}
