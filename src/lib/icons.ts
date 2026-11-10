export const ICON_NAMES = [
  "home",
  "info",
  "image",
  "mail",
  "phone",
  "calendar",
  "star",
  "heart",
  "grid",
  "cart",
  "map",
  "user",
  "music",
  "bell",
  "menu",
  "tag",
  "camera",
  "message",
  "clock",
  "book",
  "gift",
  "coffee",
  "pin",
  "video",
  "bookmark",
  "leaf",
  "sparkles",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

// Stroke icons on a 24x24 grid. Rendered with fill="none" stroke="currentColor".
export const ICONS: Record<string, string> = {
  home: '<path d="M3 11.2 12 3.5l9 7.7V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16.5V11M12 8h.01"/>',
  image: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="m3.5 16 5-5 4 4 3-3 5.5 5.5"/><circle cx="15.5" cy="9" r="1.4"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m3.8 7 8.2 6 8.2-6"/>',
  phone: '<path d="M6.3 3.5h3l1.8 4.4-2 1.3a12.5 12.5 0 0 0 5.7 5.7l1.3-2 4.4 1.8v3a2 2 0 0 1-2.2 2A17.5 17.5 0 0 1 4.3 5.7a2 2 0 0 1 2-2.2z"/>',
  calendar: '<rect x="3.5" y="5.5" width="17" height="15" rx="2.5"/><path d="M8 3v5M16 3v5M3.5 10.5h17"/>',
  star: '<path d="m12 3.5 2.7 5.7 6.1.8-4.5 4.3 1.2 6.1L12 17.5l-5.5 2.9 1.2-6.1L3.2 10l6.1-.8z"/>',
  heart: '<path d="M12 20.3S4.5 15.8 4.5 10.8A4.3 4.3 0 0 1 12 7.9a4.3 4.3 0 0 1 7.5 2.9c0 5-7.5 9.5-7.5 9.5z"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/>',
  cart: '<path d="M3 4h2.2l2.5 11h10.4L20.5 7H6"/><circle cx="9.5" cy="19.5" r="1.4"/><circle cx="17.5" cy="19.5" r="1.4"/>',
  map: '<path d="m9 4.5 6 2 6-2v15l-6 2-6-2-6 2v-15z"/><path d="M9 4.5v15M15 6.5v15"/>',
  user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
  music: '<path d="M9 17.5V5.5l10-2v12"/><circle cx="6.5" cy="18" r="2.6"/><circle cx="16.5" cy="16" r="2.6"/>',
  bell: '<path d="M18 9a6 6 0 1 0-12 0c0 5.5-2 6.5-2 6.5h16S18 14.5 18 9"/><path d="M13.8 19.5a2 2 0 0 1-3.6 0"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  tag: '<path d="M20.5 12.5 12 21l-8.5-8.5V4h8.5z"/><circle cx="8.6" cy="8.6" r="1.3"/>',
  camera: '<path d="M4 8.5h3l2-2.5h6l2 2.5h3v11H4z"/><circle cx="12" cy="13.5" r="3.6"/>',
  message: '<path d="M4 5h16v10.5H9l-5 4.5z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.3l3.8 2.2"/>',
  book: '<path d="M4.5 5.5a2 2 0 0 1 2-2H20v17H6.5a2 2 0 0 1-2-2z"/><path d="M8 7.5h7M8 11h7"/>',
  gift: '<rect x="4" y="10" width="16" height="10.5" rx="2"/><path d="M4 10 6 5h12l2 5M12 6v14.5"/>',
  coffee: '<path d="M4.5 8h13v5.5a5 5 0 0 1-5 5h-3a5 5 0 0 1-5-5z"/><path d="M17.5 9.5h1.8a2.3 2.3 0 0 1 0 4.5h-1.8M4 21.5h15"/>',
  pin: '<path d="M12 21.5s7-6.5 7-12A7 7 0 0 0 5 9.5c0 5.5 7 12 7 12z"/><circle cx="12" cy="9.5" r="2.4"/>',
  video: '<rect x="3" y="6" width="12" height="12" rx="2.5"/><path d="m15 11 6-3.2v8.4L15 13z"/>',
  bookmark: '<path d="M6 3.5h12v17l-6-4-6 4z"/>',
  leaf: '<path d="M4.5 19.5c0-8 5-14 15-14 0 10-6 15-13 14z"/><path d="M4.5 19.5C8 16 11 13 15.5 11"/>',
  sparkles: '<path d="m12 3.5 1.9 4.9 4.9 1.9-4.9 1.9L12 17.1l-1.9-4.9-4.9-1.9 4.9-1.9z"/><path d="M18.5 15.5l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z"/>',
};

export const SOCIAL_ICONS: Record<string, string> = {
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1.1"/>',
  facebook: '<path d="M14.5 8.5H17V5h-2.6C11.9 5 10.5 6.6 10.5 9v1.8H8V14h2.5v7h3.4v-7h2.7l.5-3.2h-3.2V9.4c0-.6.2-.9 1.1-.9z"/>',
  x: '<path d="M4 4l7.2 9.1L4.4 20h2.9l5.4-5.6 4.4 5.6H20l-7.4-9.4L19.3 4h-2.8l-4.9 5.1L7.5 4z"/>',
  tiktok: '<path d="M14 4v9.2a3.2 3.2 0 1 1-3.2-3.2"/><path d="M14 4c.4 2.2 1.9 3.6 4 3.8"/>',
  youtube: '<rect x="3" y="6" width="18" height="12" rx="4"/><path d="m11 9.5 4 2.5-4 2.5z"/>',
  linkedin: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 10v7M8 7.2v.1M12 17v-4a2.5 2.5 0 0 1 5 0v4"/>',
  whatsapp: '<path d="M20 12a8 8 0 0 1-11.9 7L4 20l1.1-3.9A8 8 0 1 1 20 12z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5.6 0 1-.4 1-.9l-.2-1-1.7-.5-.8.9c-1-.4-2-1.4-2.4-2.4l.9-.8-.5-1.7-1-.2c-.5 0-.9.4-.9 1z"/>',
  website: '<circle cx="12" cy="12" r="9"/><path d="M3.5 12h17M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>',
  spotify: '<circle cx="12" cy="12" r="9"/><path d="M7.5 9.5c3-1 6.5-.7 9 .8M8 12.5c2.3-.8 5-.5 7 .7M8.6 15.4c1.8-.6 3.8-.4 5.4.5"/>',
};

export function iconSvg(name: string, size = 22, strokeWidth = 1.7): string {
  const body = ICONS[name] || ICONS.sparkles;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

export function socialSvg(name: string, size = 20): string {
  const body = SOCIAL_ICONS[name] || SOCIAL_ICONS.website;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
