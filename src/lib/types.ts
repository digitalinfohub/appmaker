export type AssetRef = {
  id: string;
  name: string;
  type: string;
  width?: number;
  height?: number;
};

export type BlockType =
  | "hero"
  | "text"
  | "image"
  | "gallery"
  | "buttons"
  | "features"
  | "list"
  | "form"
  | "video"
  | "testimonials"
  | "stats"
  | "faq"
  | "cta"
  | "socials"
  | "spacer";

export type Block = {
  id: string;
  type: BlockType;
  props: Record<string, any>;
};

export type Page = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  blocks: Block[];
  showInNav: boolean;
};

export type Theme = {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  font: "sans" | "serif" | "rounded" | "mono" | "display";
  radius: number;
  dark: boolean;
  wallpaper: AssetRef | null;
  wallpaperOpacity: number;
};

export type IconSet = {
  i512: AssetRef;
  i192: AssetRef;
  apple: AssetRef;
  maskable: AssetRef;
};

export type Branding = {
  icon: AssetRef | null;
  favicon: AssetRef | null;
  iconBackground: string;
  splashColor: string;
  splashLogo: AssetRef | null;
  iconSet: IconSet | null;
};

export type PwaSettings = {
  display: "standalone" | "fullscreen" | "minimal-ui" | "browser";
  orientation: "any" | "portrait" | "landscape";
  themeColor: string;
  offline: boolean;
  installPrompt: boolean;
  pushEnabled: boolean;
  pushPrompt: "auto" | "button" | "off";
  /** Where form submissions go when there is no backend (mailto fallback). */
  contactEmail: string;
  desktopMode: "qr-first" | "app-first";
  categories: string[];
  shortcuts: { name: string; page: string }[];
};

export type AppConfig = {
  version: 1;
  name: string;
  shortName: string;
  description: string;
  theme: Theme;
  branding: Branding;
  pwa: PwaSettings;
  pages: Page[];
  homePageId: string;
};

export type AppStatus = "draft" | "published";

export type AppRecord = {
  id: string;
  slug: string;
  name: string;
  config: AppConfig;
  status: AppStatus;
  version: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Repo-relative files written by the last publish (static studio). */
  publishedFiles?: string[];
  /** Live address of the published app (static studio). */
  publishedUrl?: string;
};

export type AppSummary = Omit<AppRecord, "config"> & {
  pages: number;
  blocks: number;
  icon: string | null;
};

export type PushSubscriptionRow = {
  id: number;
  app_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
  user_agent: string | null;
};

export type NotificationRow = {
  id: string;
  app_id: string;
  title: string;
  body: string;
  url: string | null;
  icon: string | null;
  status: "scheduled" | "sending" | "sent" | "failed" | "cancelled";
  send_at: string;
  sent_at: string | null;
  recipients: number;
  failures: number;
  error: string | null;
  created_at: string;
};

export type SubmissionRow = {
  id: string;
  app_id: string;
  form_block: string;
  payload: string;
  created_at: string;
  page: string | null;
};

export type SiteFile = {
  path: string;
  contentType: string;
  body: string;
  bytes: number;
  updatedAt?: string;
};

export type AssetCopy = {
  assetId: string;
  path: string;
  contentType: string;
};

export type SiteBuild = {
  files: SiteFile[];
  copies: AssetCopy[];
  precache: string[];
};
