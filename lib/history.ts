// Vendor track record with the procurer (internal data). Seed values are illustrative;
// plant members add annual reviews in the Studio (saved in the browser).
export type Review = { year: number; quality: number; claims: number; honored: number; satisfaction: number; reviewers: number; by?: string; note?: string; local?: boolean };
export type Project = { year: number; work: string; value: number; similar: boolean };
export type VendorHistory = { projects: Project[]; reviews: Review[] };

export const HISTORY: Record<string, VendorHistory> = {
  "Thermax": { projects: [{ year: 2019, work: "Thermic fluid heater, 4 lakh kcal/hr (Unit 1)", value: 3200000, similar: true }, { year: 2022, work: "3 TPH briquette boiler (Unit 1)", value: 9800000, similar: true }],
    reviews: [{ year: 2023, quality: 4.5, claims: 3, honored: 3, satisfaction: 8.6, reviewers: 5, note: "Service engineer on site within 24 h" }, { year: 2024, quality: 4.4, claims: 2, honored: 2, satisfaction: 8.3, reviewers: 6 }, { year: 2025, quality: 4.6, claims: 1, honored: 1, satisfaction: 8.8, reviewers: 6, note: "EDGE Live alerts caught a feed-pump issue early" }] },
  "Thermodyne Engineering": { projects: [{ year: 2021, work: "Thermic fluid heater, 3 lakh kcal/hr (Unit 1)", value: 1900000, similar: true }],
    reviews: [{ year: 2022, quality: 3.0, claims: 4, honored: 2, satisfaction: 5.8, reviewers: 4, note: "Coil leak in year 2; spares took 5 weeks" }, { year: 2023, quality: 2.8, claims: 3, honored: 1, satisfaction: 5.1, reviewers: 4, note: "Warranty claim on burner rejected" }, { year: 2024, quality: 3.1, claims: 2, honored: 1, satisfaction: 5.6, reviewers: 5 }] },
  "Gungunwala Food Equipment": { projects: [{ year: 2020, work: "Continuous fryer, 250 kg/hr (Unit 1)", value: 1650000, similar: true }],
    reviews: [{ year: 2023, quality: 3.8, claims: 2, honored: 2, satisfaction: 7.4, reviewers: 4 }, { year: 2024, quality: 3.9, claims: 1, honored: 1, satisfaction: 7.6, reviewers: 4 }, { year: 2025, quality: 4.0, claims: 1, honored: 1, satisfaction: 7.8, reviewers: 5, note: "Belt replacement done free under warranty" }] },
  "Prakashwala Food Equipment": { projects: [{ year: 2022, work: "Boondi fryer, 150 kg/hr", value: 1100000, similar: true }],
    reviews: [{ year: 2023, quality: 3.4, claims: 3, honored: 2, satisfaction: 6.5, reviewers: 3 }, { year: 2024, quality: 3.2, claims: 2, honored: 1, satisfaction: 6.1, reviewers: 3, note: "Oil pump failure; charged as out-of-scope" }, { year: 2025, quality: 3.3, claims: 2, honored: 2, satisfaction: 6.4, reviewers: 4 }] },
  "Dynamech Engineers": { projects: [{ year: 2018, work: "Sev extruder, 150 kg/hr", value: 420000, similar: true }, { year: 2021, work: "Dough kneader DK-10", value: 160000, similar: true }],
    reviews: [{ year: 2023, quality: 4.3, claims: 1, honored: 1, satisfaction: 8.2, reviewers: 4 }, { year: 2024, quality: 4.2, claims: 2, honored: 2, satisfaction: 8.0, reviewers: 4 }, { year: 2025, quality: 4.4, claims: 0, honored: 0, satisfaction: 8.5, reviewers: 5 }] },
  "Sneha Food Equipments": { projects: [{ year: 2024, work: "Namkeen extruder, 100 kg/hr (pilot line)", value: 140000, similar: true }],
    reviews: [{ year: 2025, quality: 3.6, claims: 1, honored: 1, satisfaction: 7.0, reviewers: 2 }] },
  "Nichrome India": { projects: [{ year: 2019, work: "Collar VFFS line, 10-head (Line 1)", value: 1850000, similar: true }, { year: 2023, work: "Collar VFFS line, 14-head (Line 2)", value: 2900000, similar: true }],
    reviews: [{ year: 2023, quality: 4.5, claims: 2, honored: 2, satisfaction: 8.7, reviewers: 6 }, { year: 2024, quality: 4.4, claims: 3, honored: 3, satisfaction: 8.5, reviewers: 6 }, { year: 2025, quality: 4.6, claims: 1, honored: 1, satisfaction: 8.9, reviewers: 7, note: "Change parts delivered within a week" }] },
  "Asian Packing Machinery": { projects: [{ year: 2022, work: "Pouch packing machine, 40 ppm", value: 950000, similar: true }],
    reviews: [{ year: 2023, quality: 3.7, claims: 2, honored: 1, satisfaction: 6.9, reviewers: 3 }, { year: 2024, quality: 3.9, claims: 1, honored: 1, satisfaction: 7.2, reviewers: 3 }, { year: 2025, quality: 3.8, claims: 2, honored: 2, satisfaction: 7.1, reviewers: 4 }] },
  "Tata Power Solar": { projects: [{ year: 2021, work: "100 kWp rooftop solar (Unit 1)", value: 4400000, similar: true }],
    reviews: [{ year: 2023, quality: 4.0, claims: 2, honored: 2, satisfaction: 7.5, reviewers: 3, note: "Net metering took 7 months" }, { year: 2024, quality: 3.8, claims: 1, honored: 1, satisfaction: 7.0, reviewers: 3 }, { year: 2025, quality: 3.9, claims: 1, honored: 1, satisfaction: 7.3, reviewers: 4 }] },
};

export function mergedHistory(name: string, extra: Record<string, Review[]>): VendorHistory {
  const h = HISTORY[name] || { projects: [], reviews: [] };
  const reviews = [...h.reviews, ...(extra[name] || [])].sort((a, b) => a.year - b.year);
  return { projects: h.projects, reviews };
}
// Composite past-performance score, 0–100: quality 40%, warranties honoured 30%, satisfaction 30%.
// Recent years weigh more (weights 1, 2, 3… oldest → newest).
export function trackScore(h: VendorHistory) {
  if (!h.reviews.length) return null;
  let w = 0, q = 0, s = 0, claims = 0, honored = 0;
  h.reviews.forEach((r, i) => { const k = i + 1; w += k; q += r.quality * k; s += r.satisfaction * k; claims += r.claims; honored += r.honored; });
  const quality = q / w, satisfaction = s / w, warranty = claims ? honored / claims : 1;
  const score = Math.round((quality / 5) * 40 + warranty * 30 + (satisfaction / 10) * 30);
  const last = h.reviews[h.reviews.length - 1], first = h.reviews[0];
  const trend = h.reviews.length > 1 ? last.satisfaction - first.satisfaction : 0;
  return { score, quality, satisfaction, warranty, claims, honored, trend, lastYear: last.year, reviewers: h.reviews.reduce((n, r) => n + r.reviewers, 0) };
}
export const scoreBand = (s: number | null) => (s == null ? "none" : s >= 80 ? "good" : s >= 65 ? "warn" : "bad");
