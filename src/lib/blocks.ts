import type { Block, BlockType, AssetRef } from "./types";
import { ICON_NAMES, SOCIAL_ICONS } from "./icons";

export type FieldType =
  | "text"
  | "textarea"
  | "color"
  | "number"
  | "select"
  | "toggle"
  | "image"
  | "url"
  | "list";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  itemLabel?: string;
  itemFields?: Field[];
  maxItems?: number;
};

export type BlockDef = {
  type: BlockType;
  name: string;
  group: "Basics" | "Media" | "Sections" | "Layout";
  description: string;
  icon: string;
  defaults: Record<string, any>;
  fields: Field[];
};

const alignField: Field = {
  key: "align",
  label: "Alignment",
  type: "select",
  options: [
    { value: "left", label: "Left" },
    { value: "center", label: "Center" },
  ],
};

const linkHelp = "Use #/page-slug to link to another page, # for a section, mailto:, tel: or a full URL.";

export const BLOCK_DEFS: BlockDef[] = [
  {
    type: "hero",
    name: "Hero",
    group: "Sections",
    description: "Big opening banner with a headline, image and buttons.",
    icon: "sparkles",
    defaults: {
      eyebrow: "Welcome",
      title: "Your app, one tap away",
      subtitle: "Everything you need, right from your home screen.",
      image: null,
      align: "center",
      height: "md",
      overlay: 55,
      primaryLabel: "Get started",
      primaryLink: "#",
      secondaryLabel: "",
      secondaryLink: "",
      rounded: 26,
    },
    fields: [
      { key: "eyebrow", label: "Small label", type: "text", placeholder: "Welcome" },
      { key: "title", label: "Headline", type: "textarea" },
      { key: "subtitle", label: "Supporting text", type: "textarea" },
      { key: "image", label: "Background image", type: "image", help: "Use a wide image (1600×1000 or larger)." },
      alignField,
      {
        key: "height",
        label: "Height",
        type: "select",
        options: [
          { value: "sm", label: "Compact" },
          { value: "md", label: "Medium" },
          { value: "lg", label: "Tall" },
        ],
      },
      { key: "overlay", label: "Image overlay", type: "number", min: 0, max: 90, step: 5, help: "Darkens the image so text stays readable." },
      { key: "primaryLabel", label: "Primary button", type: "text" },
      { key: "primaryLink", label: "Primary link", type: "url", help: linkHelp },
      { key: "secondaryLabel", label: "Secondary button", type: "text" },
      { key: "secondaryLink", label: "Secondary link", type: "url" },
      { key: "rounded", label: "Corner radius", type: "number", min: 0, max: 40, step: 2 },
    ],
  },
  {
    type: "text",
    name: "Text",
    group: "Basics",
    description: "Headings and paragraphs with rich spacing.",
    icon: "book",
    defaults: {
      heading: "About us",
      body: "Tell people who you are, what you do and why it matters. Keep it short and clear — people read apps in small bites.",
      align: "left",
      size: "md",
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "body", label: "Body", type: "textarea", help: "Blank lines start a new paragraph. **bold** works." },
      alignField,
      {
        key: "size",
        label: "Text size",
        type: "select",
        options: [
          { value: "sm", label: "Small" },
          { value: "md", label: "Regular" },
          { value: "lg", label: "Large" },
        ],
      },
    ],
  },
  {
    type: "image",
    name: "Image",
    group: "Media",
    description: "A single full-width image with optional caption.",
    icon: "image",
    defaults: { image: null, caption: "", radius: 20, ratio: "wide", fit: "cover" },
    fields: [
      { key: "image", label: "Image", type: "image" },
      { key: "caption", label: "Caption", type: "text" },
      {
        key: "ratio",
        label: "Shape",
        type: "select",
        options: [
          { value: "auto", label: "Original" },
          { value: "wide", label: "Wide 16:9" },
          { value: "square", label: "Square" },
          { value: "tall", label: "Tall 4:5" },
        ],
      },
      {
        key: "fit",
        label: "Fit",
        type: "select",
        options: [
          { value: "cover", label: "Fill" },
          { value: "contain", label: "Fit inside" },
        ],
      },
      { key: "radius", label: "Corner radius", type: "number", min: 0, max: 40, step: 2 },
    ],
  },
  {
    type: "gallery",
    name: "Gallery",
    group: "Media",
    description: "A grid of photos — tap to view full screen.",
    icon: "camera",
    defaults: {
      title: "Gallery",
      columns: 3,
      radius: 14,
      images: [],
    },
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "columns", label: "Columns", type: "number", min: 2, max: 4, step: 1 },
      { key: "radius", label: "Corner radius", type: "number", min: 0, max: 30, step: 2 },
      {
        key: "images",
        label: "Photos",
        type: "list",
        itemLabel: "Photo",
        itemFields: [
          { key: "image", label: "Image", type: "image" },
          { key: "caption", label: "Caption", type: "text" },
        ],
        maxItems: 24,
      },
    ],
  },
  {
    type: "buttons",
    name: "Buttons",
    group: "Basics",
    description: "A stack of action buttons for key links.",
    icon: "grid",
    defaults: {
      title: "",
      stack: true,
      items: [
        { label: "Book now", link: "#", style: "primary", icon: "calendar", external: false },
        { label: "Contact us", link: "#", style: "secondary", icon: "mail", external: false },
      ],
    },
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "stack", label: "Full width buttons", type: "toggle" },
      {
        key: "items",
        label: "Buttons",
        type: "list",
        itemLabel: "Button",
        itemFields: [
          { key: "label", label: "Label", type: "text" },
          { key: "link", label: "Link", type: "url", help: linkHelp },
          {
            key: "style",
            label: "Style",
            type: "select",
            options: [
              { value: "primary", label: "Primary" },
              { value: "secondary", label: "Secondary" },
              { value: "ghost", label: "Ghost" },
            ],
          },
          { key: "icon", label: "Icon", type: "select", options: ICON_NAMES.map((n) => ({ value: n, label: n })) },
          { key: "external", label: "Opens outside the app", type: "toggle" },
        ],
      },
    ],
  },
  {
    type: "features",
    name: "Feature grid",
    group: "Sections",
    description: "Icon cards for services, benefits or categories.",
    icon: "star",
    defaults: {
      title: "What we offer",
      subtitle: "A few words about what makes you different.",
      columns: 2,
      items: [
        { icon: "sparkles", title: "Made for you", text: "Describe a service or benefit in one or two short lines." },
        { icon: "clock", title: "Fast", text: "Explain how easy it is to get started." },
      ],
    },
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
      { key: "columns", label: "Columns", type: "number", min: 1, max: 3, step: 1 },
      {
        key: "items",
        label: "Cards",
        type: "list",
        itemLabel: "Card",
        itemFields: [
          { key: "icon", label: "Icon", type: "select", options: ICON_NAMES.map((n) => ({ value: n, label: n })) },
          { key: "title", label: "Title", type: "text" },
          { key: "text", label: "Text", type: "textarea" },
          { key: "link", label: "Link", type: "url", help: linkHelp },
        ],
      },
    ],
  },
  {
    type: "list",
    name: "List",
    group: "Sections",
    description: "Menu, price list, opening hours or contact rows.",
    icon: "menu",
    defaults: {
      title: "Menu",
      note: "",
      items: [
        { title: "Flat white", subtitle: "Double shot, silky milk", meta: "£3.60", icon: "coffee", link: "" },
        { title: "Sourdough toast", subtitle: "Cultured butter, jam", meta: "£4.20", icon: "leaf", link: "" },
      ],
    },
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "note", label: "Note", type: "text" },
      {
        key: "items",
        label: "Rows",
        type: "list",
        itemLabel: "Row",
        itemFields: [
          { key: "title", label: "Title", type: "text" },
          { key: "subtitle", label: "Subtitle", type: "text" },
          { key: "meta", label: "Right value", type: "text", help: "Price, time or a short label." },
          { key: "icon", label: "Icon", type: "select", options: ICON_NAMES.map((n) => ({ value: n, label: n })) },
          { key: "link", label: "Link", type: "url", help: linkHelp },
        ],
      },
    ],
  },
  {
    type: "form",
    name: "Form",
    group: "Sections",
    description: "Collect messages straight into your studio inbox.",
    icon: "message",
    defaults: {
      title: "Get in touch",
      subtitle: "Leave a message and we'll reply soon.",
      submitLabel: "Send message",
      successMessage: "Thanks — your message is on its way.",
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "email", label: "Email", type: "email", required: true },
        { key: "message", label: "Message", type: "textarea", required: true },
      ],
    },
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
      { key: "submitLabel", label: "Button label", type: "text" },
      { key: "successMessage", label: "Thank-you message", type: "text" },
      {
        key: "fields",
        label: "Fields",
        type: "list",
        itemLabel: "Field",
        itemFields: [
          { key: "label", label: "Label", type: "text" },
          {
            key: "type",
            label: "Type",
            type: "select",
            options: [
              { value: "text", label: "Text" },
              { value: "email", label: "Email" },
              { value: "tel", label: "Phone" },
              { value: "textarea", label: "Long text" },
            ],
          },
          { key: "required", label: "Required", type: "toggle" },
        ],
      },
    ],
  },
  {
    type: "video",
    name: "Video",
    group: "Media",
    description: "Embed a YouTube or Vimeo video.",
    icon: "video",
    defaults: { title: "", url: "", caption: "" },
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "url", label: "YouTube or Vimeo URL", type: "url", placeholder: "https://youtu.be/..." },
      { key: "caption", label: "Caption", type: "text" },
    ],
  },
  {
    type: "testimonials",
    name: "Testimonials",
    group: "Sections",
    description: "Quotes from happy customers.",
    icon: "heart",
    defaults: {
      title: "What people say",
      items: [
        { quote: "The app makes booking so easy — everything I need is one tap away.", name: "Alex M.", role: "Regular", avatar: null },
      ],
    },
    fields: [
      { key: "title", label: "Title", type: "text" },
      {
        key: "items",
        label: "Quotes",
        type: "list",
        itemLabel: "Quote",
        itemFields: [
          { key: "quote", label: "Quote", type: "textarea" },
          { key: "name", label: "Name", type: "text" },
          { key: "role", label: "Role", type: "text" },
          { key: "avatar", label: "Photo", type: "image" },
        ],
      },
    ],
  },
  {
    type: "stats",
    name: "Stats",
    group: "Sections",
    description: "Big numbers to build trust.",
    icon: "sparkles",
    defaults: {
      items: [
        { value: "4.9★", label: "Average rating" },
        { value: "12k", label: "Happy customers" },
        { value: "8 yrs", label: "In business" },
      ],
    },
    fields: [
      {
        key: "items",
        label: "Numbers",
        type: "list",
        itemLabel: "Number",
        itemFields: [
          { key: "value", label: "Value", type: "text" },
          { key: "label", label: "Label", type: "text" },
        ],
        maxItems: 4,
      },
    ],
  },
  {
    type: "faq",
    name: "FAQ",
    group: "Sections",
    description: "Expandable questions and answers.",
    icon: "info",
    defaults: {
      title: "Questions",
      items: [
        { q: "How do I install the app?", a: "Tap the share button in your browser, then choose “Add to Home Screen”." },
        { q: "Do I need an account?", a: "No — everything works straight away." },
      ],
    },
    fields: [
      { key: "title", label: "Title", type: "text" },
      {
        key: "items",
        label: "Questions",
        type: "list",
        itemLabel: "Question",
        itemFields: [
          { key: "q", label: "Question", type: "text" },
          { key: "a", label: "Answer", type: "textarea" },
        ],
      },
    ],
  },
  {
    type: "cta",
    name: "Call to action",
    group: "Sections",
    description: "A highlighted banner with one clear action.",
    icon: "tag",
    defaults: {
      title: "Ready when you are",
      text: "Tap below to get started.",
      label: "Book now",
      link: "#",
      style: "card",
    },
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "text", label: "Text", type: "textarea" },
      { key: "label", label: "Button label", type: "text" },
      { key: "link", label: "Button link", type: "url", help: linkHelp },
      {
        key: "style",
        label: "Style",
        type: "select",
        options: [
          { value: "card", label: "Card" },
          { value: "solid", label: "Solid colour" },
        ],
      },
    ],
  },
  {
    type: "socials",
    name: "Social links",
    group: "Basics",
    description: "Round buttons for your social profiles.",
    icon: "bookmark",
    defaults: {
      title: "",
      items: [
        { platform: "instagram", url: "https://instagram.com/" },
        { platform: "facebook", url: "https://facebook.com/" },
      ],
    },
    fields: [
      { key: "title", label: "Title", type: "text" },
      {
        key: "items",
        label: "Links",
        type: "list",
        itemLabel: "Link",
        itemFields: [
          {
            key: "platform",
            label: "Platform",
            type: "select",
            options: Object.keys(SOCIAL_ICONS).map((n) => ({ value: n, label: n })),
          },
          { key: "url", label: "URL", type: "url" },
        ],
      },
    ],
  },
  {
    type: "spacer",
    name: "Spacer / divider",
    group: "Layout",
    description: "Add breathing room or a subtle divider.",
    icon: "menu",
    defaults: { size: "md", divider: false },
    fields: [
      {
        key: "size",
        label: "Space",
        type: "select",
        options: [
          { value: "sm", label: "Small" },
          { value: "md", label: "Medium" },
          { value: "lg", label: "Large" },
        ],
      },
      { key: "divider", label: "Show divider line", type: "toggle" },
    ],
  },
];

export const BLOCK_MAP: Record<string, BlockDef> = Object.fromEntries(
  BLOCK_DEFS.map((d) => [d.type, d]),
);

export function newId(prefix = "b"): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  const s = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${s}`;
}

export function createBlock(type: BlockType): Block {
  const def = BLOCK_MAP[type];
  if (!def) throw new Error(`Unknown block type: ${type}`);
  return {
    id: newId("blk"),
    type,
    props: JSON.parse(JSON.stringify(def.defaults)),
  };
}

export function sanitizeProps(def: BlockDef, props: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const field of def.fields) {
    const value = props?.[field.key];
    if (value === undefined) continue;
    if (field.type === "list") {
      if (!Array.isArray(value)) continue;
      out[field.key] = value.slice(0, field.maxItems ?? 40).map((item) => {
        const row: Record<string, any> = {};
        for (const sub of field.itemFields ?? []) {
          if (item?.[sub.key] !== undefined) row[sub.key] = item[sub.key];
        }
        return row;
      });
    } else if (field.type === "image") {
      if (value === null) out[field.key] = null;
      else if (value && typeof value === "object" && typeof value.id === "string") {
        out[field.key] = {
          id: value.id,
          name: String(value.name ?? "image"),
          type: String(value.type ?? "image/png"),
        } satisfies AssetRef;
      }
    } else if (field.type === "number") {
      const n = Number(value);
      if (Number.isFinite(n)) out[field.key] = n;
    } else if (field.type === "toggle") {
      out[field.key] = Boolean(value);
    } else {
      out[field.key] = String(value).slice(0, 4000);
    }
  }
  return out;
}

export function isAssetRef(value: any): value is AssetRef {
  return Boolean(value && typeof value === "object" && typeof value.id === "string");
}
