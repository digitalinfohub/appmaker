import { createBlock } from "./blocks";
import type { AppConfig, BlockType, Page, Theme } from "./types";

export const DEFAULT_THEME: Theme = {
  primary: "#6d5efc",
  accent: "#22d3ee",
  background: "#0b0d12",
  surface: "#151925",
  text: "#f2f4fa",
  muted: "#9aa3b8",
  font: "sans",
  radius: 18,
  dark: true,
  wallpaper: null,
  wallpaperOpacity: 14,
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "app";
}

export function pageSlug(input: string, existing: Page[] = []): string {
  const base = slugify(input).slice(0, 32) || "page";
  let slug = base;
  let i = 2;
  while (existing.some((p) => p.slug === slug)) slug = `${base}-${i++}`;
  return slug;
}

function blk(type: BlockType, props: Record<string, any> = {}, id?: string) {
  const block = createBlock(type);
  block.props = { ...block.props, ...props };
  if (id) block.id = id;
  return block;
}

export function makePage(name: string, icon: string, blocks: ReturnType<typeof blk>[], showInNav = true): Page {
  return {
    id: `pg_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    name,
    slug: slugify(name),
    icon,
    blocks,
    showInNav,
  };
}

export function baseConfig(name: string, description = ""): AppConfig {
  const home = makePage("Home", "home", [
    blk("hero", {
      eyebrow: "Welcome",
      title: name,
      subtitle: description || "Your new app, one tap from the home screen.",
      primaryLabel: "Get started",
    }),
  ]);
  return {
    version: 1,
    name,
    shortName: name.slice(0, 12),
    description: description || `${name} — installable app.`,
    theme: { ...DEFAULT_THEME },
    branding: {
      icon: null,
      favicon: null,
      iconBackground: "#6d5efc",
      splashColor: "#0b0d12",
      splashLogo: null,
      iconSet: null,
    },
    pwa: {
      display: "standalone",
      orientation: "portrait",
      themeColor: "#0b0d12",
      offline: true,
      installPrompt: true,
      pushEnabled: true,
      pushPrompt: "button",
      contactEmail: "",
      desktopMode: "qr-first",
      categories: ["lifestyle"],
      shortcuts: [],
    },
    pages: [home],
    homePageId: home.id,
  };
}

export type Starter = {
  id: string;
  name: string;
  tagline: string;
  swatch: [string, string];
  build: (name: string) => AppConfig;
};

const cafe: Starter = {
  id: "cafe",
  name: "Café & bakery",
  tagline: "Menu, opening hours, loyalty and push updates",
  swatch: ["#c8763f", "#2b1b12"],
  build: (name) => {
    const config = baseConfig(name, "Fresh coffee, warm bread, every day.");
    config.theme = {
      ...DEFAULT_THEME,
      primary: "#c8763f",
      accent: "#f4c26b",
      background: "#1a120c",
      surface: "#241811",
      text: "#fdf6ee",
      muted: "#c6b3a3",
      radius: 20,
      font: "serif",
      dark: true,
    };
    config.branding.iconBackground = "#c8763f";
    config.branding.splashColor = "#1a120c";
    config.pwa.themeColor = "#1a120c";
    const home = config.pages[0];
    home.blocks = [
      blk("hero", {
        eyebrow: "Open today until 5pm",
        title: name,
        subtitle: "Small-batch coffee and sourdough baked before sunrise.",
        primaryLabel: "See the menu",
        primaryLink: "#/menu",
        secondaryLabel: "Find us",
        secondaryLink: "#/visit",
        height: "lg",
        overlay: 45,
      }),
      blk("stats", {
        items: [
          { value: "5am", label: "Fresh bake" },
          { value: "4.9★", label: "Local rating" },
          { value: "9 yrs", label: "On the high street" },
        ],
      }),
      blk("features", {
        title: "Today at the counter",
        subtitle: "Order ahead and skip the queue.",
        items: [
          { icon: "coffee", title: "House filter", text: "Rotating single origin, brewed all day.", link: "#/menu" },
          { icon: "leaf", title: "Sourdough", text: "Baked in-house every morning from 5am.", link: "#/menu" },
          { icon: "gift", title: "Loyalty card", text: "Every tenth coffee is on us.", link: "" },
          { icon: "clock", title: "Order ahead", text: "Send your order and collect in ten minutes.", link: "#/visit" },
        ],
      }),
      blk("cta", {
        title: "Get a free pastry on your first order",
        text: "Show this screen in store — members only.",
        label: "Join in one tap",
        link: "#/menu",
      }),
      blk("socials", { title: "Follow the bake" }),
    ];
    const menu = makePage("Menu", "coffee", [
      blk("text", {
        heading: "Coffee & kitchen",
        body: "Everything is made to order. Oat, soy and whole milk available.",
        size: "lg",
      }),
      blk("list", {
        title: "Coffee",
        items: [
          { title: "Filter", subtitle: "Rotating single origin", meta: "£3.20", icon: "coffee", link: "" },
          { title: "Flat white", subtitle: "Double shot, silky milk", meta: "£3.60", icon: "coffee", link: "" },
          { title: "Cold brew", subtitle: "18-hour steeped", meta: "£4.00", icon: "coffee", link: "" },
          { title: "Matcha latte", subtitle: "Ceremonial grade", meta: "£4.20", icon: "leaf", link: "" },
        ],
      }),
      blk("list", {
        title: "From the kitchen",
        items: [
          { title: "Sourdough toast", subtitle: "Cultured butter, jam", meta: "£4.20", icon: "leaf", link: "" },
          { title: "Breakfast bun", subtitle: "Egg, cheddar, chilli jam", meta: "£6.50", icon: "coffee", link: "" },
          { title: "Seasonal salad", subtitle: "Ask at the counter", meta: "£8.00", icon: "leaf", link: "" },
        ],
      }),
      blk("buttons", {
        title: "Order for collection",
        items: [
          { label: "Call the shop", link: "tel:+441234567890", style: "primary", icon: "phone", external: true },
          { label: "Message us", link: "mailto:hello@example.com", style: "secondary", icon: "mail", external: true },
        ],
      }),
    ]);
    const visit = makePage("Visit", "pin", [
      blk("text", { heading: "Find us", body: "12 High Street\nOpen Monday to Saturday, 7am – 5pm" }),
      blk("list", {
        title: "Opening hours",
        items: [
          { title: "Monday – Friday", subtitle: "", meta: "7am – 5pm", icon: "clock", link: "" },
          { title: "Saturday", subtitle: "", meta: "8am – 5pm", icon: "clock", link: "" },
          { title: "Sunday", subtitle: "", meta: "Closed", icon: "clock", link: "" },
        ],
      }),
      blk("buttons", {
        items: [
          { label: "Open in Maps", link: "https://maps.google.com/?q=12+High+Street", style: "primary", icon: "map", external: true },
          { label: "Call us", link: "tel:+441234567890", style: "secondary", icon: "phone", external: true },
        ],
      }),
      blk("form", { title: "Questions or cake orders", subtitle: "We reply within a day." }),
    ]);
    config.pages = [home, menu, visit];
    return config;
  },
};

const fitness: Starter = {
  id: "fitness",
  name: "Fitness studio",
  tagline: "Classes, timetable, memberships and reminders",
  swatch: ["#22c55e", "#08130d"],
  build: (name) => {
    const config = baseConfig(name, "Train with a plan that fits your week.");
    config.theme = {
      ...DEFAULT_THEME,
      primary: "#22c55e",
      accent: "#a3e635",
      background: "#070d0a",
      surface: "#101a14",
      text: "#f1fdf6",
      muted: "#95b3a3",
      radius: 16,
      font: "sans",
      dark: true,
    };
    config.branding.iconBackground = "#0f291b";
    config.branding.splashColor = "#070d0a";
    config.pwa.themeColor = "#070d0a";
    config.pwa.shortcuts = [{ name: "Timetable", page: "classes" }];
    const home = config.pages[0];
    home.blocks = [
      blk("hero", {
        eyebrow: "First class free",
        title: "Stronger every week",
        subtitle: `${name} — small group coaching, real progress.`,
        primaryLabel: "Book a class",
        primaryLink: "#/classes",
        secondaryLabel: "Memberships",
        secondaryLink: "#/memberships",
        height: "lg",
        overlay: 50,
      }),
      blk("features", {
        title: "Why train with us",
        columns: 2,
        items: [
          { icon: "sparkles", title: "Coached sessions", text: "Max eight people per class, so every rep gets checked.", link: "#/classes" },
          { icon: "clock", title: "45 minutes", text: "Built to fit around work, school and everything else.", link: "#/classes" },
          { icon: "heart", title: "Any level", text: "Every movement scales — from first session to PR day.", link: "" },
          { icon: "calendar", title: "Book in-app", text: "Reserve, reschedule and get reminders on your phone.", link: "#/classes" },
        ],
      }),
      blk("testimonials", {
        title: "Member stories",
        items: [
          { quote: "Three months in and I've never missed a Monday. The coaching is why.", name: "Priya K.", role: "Member since 2024" },
          { quote: "First place I've actually stuck with. The app reminders help.", name: "Tom R.", role: "Member" },
        ],
      }),
      blk("cta", {
        title: "Your first class is on us",
        text: "Pick a time and we'll take care of the rest.",
        label: "Claim free class",
        link: "#/classes",
      }),
    ];
    const classes = makePage("Classes", "calendar", [
      blk("text", { heading: "This week", body: "Tap a session to reserve your spot. Members can reschedule up to 2 hours before.", size: "lg" }),
      blk("list", {
        title: "Monday",
        items: [
          { title: "Strength foundations", subtitle: "Coach Amara · Studio 1", meta: "06:30", icon: "clock", link: "" },
          { title: "Conditioning 45", subtitle: "Coach Leo · Studio 2", meta: "18:30", icon: "clock", link: "" },
        ],
      }),
      blk("list", {
        title: "Wednesday",
        items: [
          { title: "Olympic lifting", subtitle: "Coach Amara · Studio 1", meta: "07:00", icon: "clock", link: "" },
          { title: "Mobility + core", subtitle: "Coach Sam · Studio 2", meta: "19:00", icon: "clock", link: "" },
        ],
      }),
      blk("list", {
        title: "Saturday",
        items: [
          { title: "Team sweat", subtitle: "All coaches · Main floor", meta: "09:00", icon: "clock", link: "" },
          { title: "Open gym", subtitle: "Staffed", meta: "10:00", icon: "clock", link: "" },
        ],
      }),
      blk("buttons", {
        title: "Need help choosing?",
        items: [{ label: "Talk to a coach", link: "mailto:hello@example.com", style: "primary", icon: "mail", external: true }],
      }),
    ]);
    const memberships = makePage("Plans", "tag", [
      blk("text", { heading: "Simple memberships", body: "No joining fee. Cancel with 30 days notice.", size: "lg" }),
      blk("list", {
        title: "Plans",
        items: [
          { title: "Flex", subtitle: "2 classes per week", meta: "£65/mo", icon: "tag", link: "" },
          { title: "Unlimited", subtitle: "Any class, any time", meta: "£95/mo", icon: "tag", link: "" },
          { title: "Online", subtitle: "Programming + app access", meta: "£25/mo", icon: "tag", link: "" },
        ],
      }),
      blk("cta", { title: "Start with a free week", text: "Try every class before you commit.", label: "Book free week", link: "#/classes" }),
      blk("form", { title: "Join the list", subtitle: "We'll message you when new blocks open.", submitLabel: "Join" }),
    ]);
    config.pages = [home, classes, memberships];
    return config;
  },
};

const salon: Starter = {
  id: "salon",
  name: "Salon & spa",
  tagline: "Treatments, prices, gallery and booking",
  swatch: ["#e879b9", "#170d14"],
  build: (name) => {
    const config = baseConfig(name, "Quiet luxury, five minutes from the station.");
    config.theme = {
      ...DEFAULT_THEME,
      primary: "#e879b9",
      accent: "#f0c9a8",
      background: "#120c11",
      surface: "#1d141b",
      text: "#fdf3f8",
      muted: "#c2aab9",
      radius: 22,
      font: "display",
      dark: true,
    };
    config.branding.iconBackground = "#e879b9";
    config.branding.splashColor = "#120c11";
    config.pwa.themeColor = "#120c11";
    const home = config.pages[0];
    home.blocks = [
      blk("hero", {
        eyebrow: "Est. 2016",
        title: name,
        subtitle: "Hair, skin and nails in a calm space built for slowing down.",
        primaryLabel: "Book a treatment",
        primaryLink: "#/treatments",
        height: "lg",
        overlay: 40,
      }),
      blk("gallery", { title: "Recent work", columns: 3, radius: 18 }),
      blk("features", {
        title: "Our promise",
        columns: 2,
        items: [
          { icon: "leaf", title: "Clean products", text: "Vegan, cruelty-free and kind to sensitive skin.", link: "" },
          { icon: "clock", title: "On time", text: "We never double-book, so your appointment starts when it should.", link: "" },
          { icon: "heart", title: "Your stylist", text: "Request the same person every visit.", link: "" },
          { icon: "gift", title: "Gift cards", text: "The easiest present you'll buy this year.", link: "#/treatments" },
        ],
      }),
      blk("testimonials", { title: "Loved by locals" }),
    ];
    const treatments = makePage("Treatments", "sparkles", [
      blk("text", { heading: "Treatments", body: "All prices include consultation. Patches tested 24 hours ahead.", size: "lg" }),
      blk("list", {
        title: "Hair",
        items: [
          { title: "Cut & finish", subtitle: "60 min", meta: "£65", icon: "star", link: "" },
          { title: "Colour", subtitle: "From — includes toner", meta: "£120", icon: "star", link: "" },
          { title: "Blow dry", subtitle: "45 min", meta: "£38", icon: "star", link: "" },
        ],
      }),
      blk("list", {
        title: "Skin & nails",
        items: [
          { title: "Signature facial", subtitle: "75 min", meta: "£85", icon: "heart", link: "" },
          { title: "Gel manicure", subtitle: "45 min", meta: "£45", icon: "sparkles", link: "" },
          { title: "Pedicure", subtitle: "60 min", meta: "£52", icon: "sparkles", link: "" },
        ],
      }),
      blk("buttons", {
        title: "Book",
        items: [
          { label: "Message to book", link: "mailto:hello@example.com", style: "primary", icon: "mail", external: true },
          { label: "Call the salon", link: "tel:+441234567890", style: "secondary", icon: "phone", external: true },
        ],
      }),
    ]);
    const book = makePage("Book", "calendar", [
      blk("text", { heading: "Book a visit", body: "Send your preferred date and treatment — we'll confirm by message.", size: "lg" }),
      blk("form", {
        title: "Request an appointment",
        fields: [
          { key: "name", label: "Name", type: "text", required: true },
          { key: "contact", label: "Phone or email", type: "text", required: true },
          { key: "treatment", label: "Treatment", type: "text", required: false },
          { key: "notes", label: "Preferred date & time", type: "textarea", required: false },
        ],
        submitLabel: "Request appointment",
        successMessage: "Lovely — we'll confirm your slot shortly.",
      }),
      blk("list", {
        title: "Opening hours",
        items: [
          { title: "Tuesday – Friday", subtitle: "", meta: "9am – 7pm", icon: "clock", link: "" },
          { title: "Saturday", subtitle: "", meta: "9am – 5pm", icon: "clock", link: "" },
          { title: "Sunday – Monday", subtitle: "", meta: "Closed", icon: "clock", link: "" },
        ],
      }),
    ]);
    config.pages = [home, treatments, book];
    return config;
  },
};

const service: Starter = {
  id: "service",
  name: "Local service",
  tagline: "Quote requests, service list and reviews",
  swatch: ["#3b82f6", "#0a1424"],
  build: (name) => {
    const config = baseConfig(name, "Trusted, insured and local.");
    config.theme = {
      ...DEFAULT_THEME,
      primary: "#3b82f6",
      accent: "#38bdf8",
      background: "#080d16",
      surface: "#101a2b",
      text: "#eef6ff",
      muted: "#9db3ce",
      radius: 16,
      font: "sans",
      dark: true,
    };
    config.branding.iconBackground = "#3b82f6";
    config.branding.splashColor = "#080d16";
    config.pwa.themeColor = "#080d16";
    const home = config.pages[0];
    home.blocks = [
      blk("hero", {
        eyebrow: "Emergency call-outs available",
        title: name,
        subtitle: "Fast, tidy work from a team your neighbours already recommend.",
        primaryLabel: "Get a free quote",
        primaryLink: "#/quote",
        secondaryLabel: "Call now",
        secondaryLink: "tel:+441234567890",
        height: "md",
      }),
      blk("stats", {
        items: [
          { value: "24/7", label: "Call-outs" },
          { value: "15 yrs", label: "Experience" },
          { value: "4.8★", label: "Google rating" },
        ],
      }),
      blk("features", {
        title: "What we do",
        columns: 2,
        items: [
          { icon: "grid", title: "Repairs", text: "Same-day fixes with parts on the van.", link: "" },
          { icon: "sparkles", title: "Installs", text: "Clean, certified and tidy on the day.", link: "" },
          { icon: "clock", title: "Servicing", text: "Annual plans that keep everything running.", link: "" },
          { icon: "phone", title: "Emergencies", text: "Call any hour — we answer.", link: "tel:+441234567890" },
        ],
      }),
      blk("testimonials", { title: "Reviews" }),
      blk("cta", { title: "Free quotes, no pressure", text: "Send a photo and a few details.", label: "Request a quote", link: "#/quote" }),
    ];
    const quote = makePage("Quote", "message", [
      blk("text", { heading: "Request a quote", body: "Tell us what you need. We usually reply the same working day.", size: "lg" }),
      blk("form", {
        title: "Your details",
        fields: [
          { key: "name", label: "Name", type: "text", required: true },
          { key: "phone", label: "Phone", type: "tel", required: true },
          { key: "details", label: "What do you need?", type: "textarea", required: true },
        ],
        submitLabel: "Send request",
        successMessage: "Got it — we'll be in touch shortly.",
      }),
      blk("list", {
        title: "Coverage",
        items: [
          { title: "Mon – Fri", subtitle: "", meta: "7am – 6pm", icon: "clock", link: "" },
          { title: "Saturday", subtitle: "", meta: "8am – 4pm", icon: "clock", link: "" },
          { title: "Emergency", subtitle: "Call for out-of-hours", meta: "24/7", icon: "phone", link: "tel:+441234567890" },
        ],
      }),
    ]);
    config.pages = [home, quote];
    return config;
  },
};

export const STARTERS: Starter[] = [cafe, fitness, salon, service];

export function starterConfig(starterId: string, name: string): AppConfig {
  const starter = STARTERS.find((s) => s.id === starterId);
  if (starter) return starter.build(name);
  return baseConfig(name);
}
