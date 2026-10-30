/**
 * The parts of a profile a member arranges, like a LinkedIn page: which sections show
 * and in what order, the banner, and the "How I invest" answers. Privacy still decides
 * who sees each part; these choices only ever hide more, never less.
 */
export const SECTIONS = ["about", "invest", "featured", "experience", "theses", "allocation", "guilds"] as const;
export type SectionKey = (typeof SECTIONS)[number];

export const SECTION_LABEL: Record<SectionKey, string> = {
  about: "About",
  invest: "How I invest",
  featured: "Featured",
  experience: "Experience",
  theses: "Theses",
  allocation: "Allocation",
  guilds: "Guilds",
};

export type SectionSetting = { key: SectionKey; visible: boolean };

/** A member's saved order, with any section added since then put back at the end, shown. */
export function profileSections(saved: SectionSetting[] | null | undefined): SectionSetting[] {
  const known = (saved ?? []).filter((s, i, all) => SECTIONS.includes(s.key) && all.findIndex((x) => x.key === s.key) === i);
  return [...known, ...SECTIONS.filter((k) => !known.some((s) => s.key === k)).map((key) => ({ key, visible: true }))];
}

/** Banners drawn by Portle, so nobody has to upload a picture. Colours come from the Portle mark. */
export const BANNERS = {
  dial: { label: "Portle dial", from: "#e3dffb", via: "#c4bcfb", to: "#a2d7f9", arcs: true },
  lavender: { label: "Lavender", from: "#f2f1fb", via: "#d8d1fc", to: "#b9adfa", arcs: false },
  sky: { label: "Sky", from: "#e6f1fb", via: "#a2d7f9", to: "#56b8f5", arcs: false },
  sunrise: { label: "Sunrise", from: "#fff1e4", via: "#ffc08a", to: "#ff9340", arcs: false },
  mint: { label: "Mint", from: "#e1f5ee", via: "#9fe1cb", to: "#25d0ee", arcs: false },
  night: { label: "Night", from: "#26215c", via: "#3c3489", to: "#5146e1", arcs: true },
} as const;
export type BannerStyle = keyof typeof BANNERS;
export const BANNER_STYLES = Object.keys(BANNERS) as BannerStyle[];

export const APPROACHES = [
  "Index first",
  "Index first, a few picks",
  "Mostly individual stocks",
  "Dividends and income",
  "Growth",
  "Value",
  "Still figuring it out",
] as const;

export const HORIZONS = ["Under 1 year", "1 to 3 years", "3 to 10 years", "10+ years"] as const;

/** The links a profile can show, in the order they appear. */
export const LINKS = {
  website: { label: "Website", host: null },
  linkedin: { label: "LinkedIn", host: "linkedin.com" },
  github: { label: "GitHub", host: "github.com" },
  x: { label: "X", host: "x.com" },
} as const;
export type LinkKey = keyof typeof LINKS;
export const LINK_KEYS = Object.keys(LINKS) as LinkKey[];

/** "portle.cc" from "https://www.portle.cc/about", for showing a website link without the noise. */
export function displayHost(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}
