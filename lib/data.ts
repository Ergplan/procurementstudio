// Seed data. Vendor bids are illustrative; benchmarks and vendor intel were web-researched on RESEARCH_DATE.
export type Cell = [spec: string, qty: number, rate: number] | null;
export type Bench = { lo: number; hi: number; src?: string; date?: string; note?: string };
export type Row = [id: string, item: string, unit: string, gst: number, q: Record<string, Cell>, bench: Bench | null, ref?: string];
export type Vendor = { key: string; name: string; offer: string; cap: number; lead: string; warranty: string; payment: string; eff?: number; yield?: number };
export type Asset = {
  id: string; name: string; short: string; hsn: string; category: string;
  req: { cap: number; capLabel: string; text: string };
  capUnit: string; capUnitLabel: string; scaleExp: number;
  lifecycle?: { type: "energy" | "fuel"; field: "yield" | "eff"; label: string; unit: string; duty?: number };
  marketNote: string; marketSrc: string[]; brochure?: boolean;
  vendors: Vendor[]; rows: Row[]; assetBench?: Bench;
};
export type Intel = { rating: string; flags: string[]; plus: string[]; src: { t: string; u: string }[] };
export type TechRow = [param: string, need: string, offers: Record<string, string>, fit: Record<string, "good" | "warn" | "bad">];
export type Master = { client: string; factory: string; location: string; names: Record<string, string>; fuelPrice: number; gcv: number; hours: number; load: number; years: number; tariff: number };

export const RESEARCH_DATE = "28 Sep 2026";
export const DEFAULT_MASTER: Master = {
  client: "Shree Marudhar Namkeen Pvt Ltd",
  factory: "Bikaner Plant – Unit 2",
  location: "Karni Industrial Area, Bikaner, Rajasthan",
  names: {} as Record<string, string>,
  fuelPrice: 8000,   // ₹ per tonne biomass briquette
  gcv: 3800,         // kcal/kg
  hours: 6000,       // operating hours / yr
  load: 0.7,         // average load factor
  years: 5,          // evaluation horizon
  tariff: 8.0        // ₹/kWh grid tariff avoided
};

export const SRC: Record<string, { t: string; u: string }> = {
  jmk: { t: "JMK Research via SolarBytes, TOPCon module prices (Apr 2026)", u: "https://solarbytes.info/india-bytes/topcon-module-price-trends-april-2026-jmk-research-india-market-11848910" },
  mget: { t: "MGet Energy, 1 MW solar cost breakdown India (Apr 2026)", u: "https://www.mgetenergy.com/blogs/1-mw-solar-power-plant-cost-india-2026/" },
  bridge: { t: "Bridgeway Power, solar structure cost per kW (Jul 2026)", u: "https://bridgewaypower.in/blog/solar-structure-cost-per-kw-india" },
  solis: { t: "Aajjo listing, Solis 100 kW string inverter", u: "https://www.aajjo.com/product/solis-100kw-solar-string-inverter-in-gurugram-rv-renewable-energy-private-limited" },
  heaven: { t: "Heaven Green Energy, solar AMC cost (Aug 2026)", u: "https://www.heavengreenenergy.com/blog/solar-amc-cost" },
  powermore: { t: "Powermore, commercial solar cost per kW (Jul 2026)", u: "https://powermore.in/blog/commercial-solar-cost-per-kw-india" },
  pvgst: { t: "pv magazine India, GST on modules cut to 5% (Sep 2025)", u: "https://www.pv-magazine-india.com/2025/09/04/gst-on-solar-cells-modules-cut-to-5/" },
  dynaFry: { t: "IndiaMART, Dynamech continuous snacks fryer", u: "https://www.indiamart.com/dynamech-engineers/continuous-snacks-fryer.html" },
  gungun: { t: "IndiaMART, Gungunwala continuous namkeen fryer", u: "https://www.indiamart.com/proddetail/continuous-namkeen-fryer-with-wooden-heat-exchanger-14452188362.html" },
  economode: { t: "IndiaMART, Economode namkeen fryers", u: "https://www.indiamart.com/economode/namkeen-fryers.html" },
  extr: { t: "IndiaMART, namkeen extruder machine category", u: "https://dir.indiamart.com/impcat/namkeen-extruder-machine.html" },
  plant: { t: "IndiaMART, fully automatic namkeen plant category", u: "https://dir.indiamart.com/impcat/fully-automatic-namkeen-making-plant.html" },
  mhw: { t: "IndiaMART, multihead weigher packing machine category", u: "https://m.indiamart.com/impcat/multihead-weigher-packing-machine.html" },
  zbucket: { t: "IndiaMART, Z-type bucket elevator", u: "https://www.indiamart.com/proddetail/z-type-bucket-elevator-8959042091.html" },
  cw: { t: "IndiaMART, online checkweigher category", u: "https://m.indiamart.com/impcat/online-check-weigher.html" },
  coder: { t: "IndiaMART, inkjet batch coding machine category", u: "https://m.indiamart.com/impcat/inkjet-batch-coding-machine.html" },
  tfh: { t: "IndiaMART, thermal fluid heaters category", u: "https://m.indiamart.com/impcat/thermal-fluid-heaters.html" },
  boil: { t: "IndiaMART, biomass fired steam boilers category", u: "https://m.indiamart.com/impcat/biomass-steam-boilers.html" },
  ultrapac: { t: "Thermax Ultrapac brochure (supplied by you)", u: "" },
  gst8438: { t: "ClearTax, GST on food machinery HSN 8438", u: "https://cleartax.in/s/food-machinery-gst-rates-hsn-code-8438" }
};

// Row: [id, item, unit, gst, { vendorKey: [spec, qty, rate] | null }, bench|null, ref]
// bench: { lo, hi, src, date }  (per unit, same unit as rate)
export const ASSETS: Asset[] = [
{
  id: "solar", name: "Rooftop Solar Plant", short: "Rooftop Solar",
  hsn: "8541 / composite EPC", category: "Energy",
  req: { cap: 500000, capLabel: "500 kWp DC", text: "500 kWp grid-tied, net-metered, on metal-sheet and RCC roofs (≈5,200 m² usable)" },
  capUnit: "Wp", capUnitLabel: "₹/Wp", scaleExp: 1.0,
  lifecycle: { type: "energy", field: "yield", label: "Specific yield", unit: "kWh/kWp/yr" },
  marketNote: "Turnkey C&I rooftop EPC in India trades at ₹40–55/Wp incl. GST (Powermore, Jul 2026); aggressive non-DCR builds reach ₹34.8/Wp (MGet, Apr 2026). Net-metered C&I needs ALMM List-I modules; List-II (Indian cells) exemption for net-metering ends 31 Dec 2026.",
  marketSrc: ["powermore", "mget", "jmk"],
  vendors: [
    { key: "A", name: "Tata Power Solar", offer: "500 kWp · TOPCon 580 Wp (ALMM-I)", cap: 500000, yield: 1600, lead: "14 weeks", warranty: "12 yr product / 30 yr perf.", payment: "10/60/25/5" },
    { key: "B", name: "Waaree Energies", offer: "520 kWp · bifacial TOPCon 590 Wp", cap: 520000, yield: 1640, lead: "12 weeks", warranty: "12 yr product / 30 yr perf.", payment: "20/60/20" },
    { key: "C", name: "Oriano Clean Energy", offer: "480 kWp · mono PERC 550 Wp", cap: 480000, yield: 1540, lead: "10 weeks", warranty: "10 yr product / 25 yr perf.", payment: "30/60/10" }
  ],
  rows: [
    ["s1", "Solar PV modules", "Wp", 5, { A: ["TOPCon 580 Wp, non-DCR, ALMM-I", 500000, 15.8], B: ["Bifacial TOPCon 590 Wp, ALMM-I", 520000, 14.6], C: ["Mono PERC 550 Wp", 480000, 13.9] }, { lo: 13.8, hi: 14.2, src: "jmk", date: "Apr 2026", note: "non-DCR TOPCon / mono PERC" }],
    ["s2", "String inverters", "W AC", 18, { A: ["Sungrow 4 × 110 kW", 440000, 3.9], B: ["Solis 4 × 110 kW", 440000, 3.5], C: ["Solis 4 × 100 kW", 400000, 3.3] }, { lo: 3.2, hi: 5.2, src: "mget", date: "Apr 2026" }],
    ["s3", "Module mounting structure", "Wp", 18, { A: ["Aluminium rail on sheet roof, HDG on RCC", 500000, 5.2], B: ["Pre-galv GI, mixed roof", 520000, 3.6], C: ["GI rail on sheet roof", 480000, 3.4] }, { lo: 3.0, hi: 6.0, src: "bridge", date: "Jul 2026", note: "flush on sheet roof ₹3.0–4.5; elevated RCC higher" }],
    ["s4", "DC & AC cabling, connectors, BOS", "Wp", 18, { A: ["Polycab 4/6 mm² DC, Al AC", 500000, 2.6], B: ["KEI DC, Al AC", 520000, 2.3], C: ["Local make DC, Al AC", 480000, 2.1] }, { lo: 2.1, hi: 2.8, src: "mget", date: "Apr 2026" }],
    ["s5", "ACDB, LT panel & metering", "Wp", 18, { A: ["ACB 1000 A, ABT meter", 500000, 1.8], B: ["MCCB panel, ABT meter", 520000, 1.6], C: ["MCCB panel", 480000, 1.5] }, { lo: 1.4, hi: 2.1, src: "mget", date: "Apr 2026" }],
    ["s6", "Earthing & lightning arresters", "lot", 18, { A: ["12 chemical pits, 4 ESE LA", 1, 450000], B: ["10 pits, 3 ESE LA", 1, 380000], C: null }, null],
    ["s7", "SCADA & remote monitoring", "Wp", 18, { A: ["Web SCADA + weather station", 500000, 0.9], B: ["Inverter portal + WMS", 520000, 0.7], C: null }, { lo: 0.7, hi: 1.0, src: "mget", date: "Apr 2026" }],
    ["s8", "Walkways & safety lifelines", "m", 18, { A: ["FRP walkway + lifeline", 600, 850], B: ["FRP walkway", 400, 780], C: null }, null],
    ["s9", "Installation, testing & commissioning", "Wp", 18, { A: ["Incl. thermography, PR test", 500000, 2.6], B: ["Standard I&C", 520000, 1.9], C: ["Standard I&C", 480000, 1.8] }, { lo: 1.7, hi: 2.4, src: "mget", date: "Apr 2026" }],
    ["s10", "Net-metering liaison & DISCOM approvals", "lot", 18, { A: ["End-to-end incl. CEIG", 1, 350000], B: ["Liaison only", 1, 280000], C: ["Liaison only", 1, 150000] }, null],
    ["s11", "Comprehensive O&M (5 years)", "kWp-yr", 18, { A: ["Monthly wash, 24 h SLA", 2500, 1100], B: ["Fortnightly wash, 48 h SLA", 2600, 950], C: ["Monthly wash, 72 h SLA", 2400, 900] }, { lo: 800, hi: 1500, src: "heaven", date: "Aug 2026" }]
  ]
},
{
  id: "fryer", name: "Continuous Namkeen Fryer", short: "Continuous Fryer",
  hsn: "8419 / 8438", category: "Process",
  req: { cap: 400, capLabel: "400 kg/hr", text: "400 kg/hr continuous fryer, SS304 contact parts, thermic-fluid heated, for sev, bhujia, mixture and dal" },
  capUnit: "kg/hr", capUnitLabel: "₹ per kg/hr", scaleExp: 0.6,
  marketNote: "300–500 kg/hr continuous namkeen fryers list at ₹23–30 L ex-GST on IndiaMART (Gungunwala ₹23 L, Economode ₹27 L, Dynamech ₹30 L). Heat exchanger, installation and freight are often left out of list prices. GST 18% (HSN 8438/8419).",
  marketSrc: ["gungun", "economode", "dynaFry"],
  vendors: [
    { key: "A", name: "Gungunwala Food Equipment", offer: "400 kg/hr · 45 ft · 600 L oil", cap: 400, lead: "10 weeks", warranty: "12 months", payment: "40/50/10" },
    { key: "B", name: "Prakashwala Food Equipment", offer: "350 kg/hr · 40 ft · 520 L oil", cap: 350, lead: "8 weeks", warranty: "12 months", payment: "50/50" },
    { key: "C", name: "Dynamech Engineers", offer: "500 kg/hr · 50 ft · 750 L oil", cap: 500, lead: "12 weeks", warranty: "18 months", payment: "30/60/10" }
  ],
  rows: [
    ["f1", "Fryer body & pan, SS304", "no.", 18, { A: ["45 ft, 3 mm SS304", 1, 1150000], B: ["40 ft, 2.5 mm SS304", 1, 1020000], C: ["50 ft, 3 mm SS304", 1, 1480000] }, null],
    ["f2", "Upper & lower conveyor with lift", "no.", 18, { A: ["Pneumatic lift", 1, 320000], B: ["Screw-gear lift", 1, 260000], C: ["Pneumatic lift", 1, 390000] }, null],
    ["f3", "Thermic-fluid heat exchanger", "no.", 18, { A: ["3-pass, SS tubes", 1, 240000], B: ["2-pass, MS tubes", 1, 195000], C: ["3-pass, SS tubes", 1, 260000] }, { lo: 180000, hi: 220000, src: "dynaFry", date: "2026 listing", note: "≈₹2 L separate HX" }],
    ["f4", "Oil circulation pump & storage tank", "set", 18, { A: ["Hot-oil pump, 800 L tank", 1, 160000], B: ["Hot-oil pump, 600 L tank", 1, 140000], C: ["Hot-oil pump, 1000 L tank", 1, 185000] }, null],
    ["f5", "Continuous oil filter", "no.", 18, { A: ["Drum type", 1, 190000], B: null, C: ["Belt + drum", 1, 220000] }, null],
    ["f6", "De-oiling vibro conveyor", "no.", 18, { A: ["SS304, 8 ft", 1, 110000], B: ["SS304, 6 ft", 1, 95000], C: ["SS304, 10 ft", 1, 130000] }, null],
    ["f7", "Control panel with VFD & PID", "no.", 18, { A: ["ABB VFD, PID temp", 1, 145000], B: ["Delta VFD", 1, 120000], C: ["Siemens PLC + HMI", 1, 175000] }, null],
    ["f8", "Fume hood & exhaust", "no.", 18, { A: ["SS hood + blower", 1, 85000], B: null, C: ["SS hood, oil mist separator", 1, 105000] }, null],
    ["f9", "Installation, commissioning & trial", "lot", 18, { A: ["3-day trial run", 1, 60000], B: ["2-day trial", 1, 50000], C: ["5-day trial + training", 1, 90000] }, null]
  ],
  assetBench: { lo: 2300000, hi: 3000000, src: "economode", date: "2026 listings", note: "turnkey fryer 300–500 kg/hr" }
},
{
  id: "extruder", name: "Bhujia & Sev Extrusion Line", short: "Bhujia Extruder",
  hsn: "8438", category: "Process",
  req: { cap: 250, capLabel: "250 kg/hr", text: "250 kg/hr kneader + sev/bhujia extruder + cutter + feed conveyor, SS304, feeding the continuous fryer" },
  capUnit: "kg/hr", capUnitLabel: "₹ per kg/hr", scaleExp: 0.6,
  marketNote: "Standalone industrial SS extruders list at ₹1.2–4.1 L; fully automatic namkeen plants (kneader + extruder + fryer) at 300–500 kg/hr list at ₹10–25 L. Quotes must be tagged 'machine only' vs 'plant' — prices differ 10–50×. GST 18%.",
  marketSrc: ["extr", "plant"],
  vendors: [
    { key: "A", name: "Dynamech Engineers", offer: "250 kg/hr · SM-250 screw extruder", cap: 250, lead: "8 weeks", warranty: "12 months", payment: "40/50/10" },
    { key: "B", name: "Harikrishna Techno (HKT)", offer: "300 kg/hr · hydraulic extruder", cap: 300, lead: "9 weeks", warranty: "12 months", payment: "50/40/10" },
    { key: "C", name: "Sneha Food Equipments", offer: "200 kg/hr · screw extruder", cap: 200, lead: "6 weeks", warranty: "12 months", payment: "50/50" }
  ],
  rows: [
    ["e1", "Dough kneader / besan mixer", "no.", 18, { A: ["DK-20, 100 kg batch, 2 HP", 1, 185000], B: ["120 kg batch, 3 HP", 1, 210000], C: ["80 kg batch, 2 HP", 1, 160000] }, null],
    ["e2", "Sev / bhujia extruder head", "no.", 18, { A: ["SM-250 screw, 3 HP, SS304", 1, 240000], B: ["Hydraulic, 5 HP, SS304", 1, 310000], C: ["Screw, 2 HP, SS304", 1, 160000] }, { lo: 120000, hi: 410000, src: "extr", date: "2026 listings" }],
    ["e3", "Die plate set (sev, bhujia, gathiya)", "set", 18, { A: ["6 profiles", 6, 9000], B: ["8 profiles", 8, 8500], C: ["5 profiles", 5, 8000] }, null],
    ["e4", "Rotary cutter", "no.", 18, { A: ["Variable speed", 1, 65000], B: ["Servo cutter", 1, 72000], C: null }, null],
    ["e5", "Feed conveyor to fryer", "no.", 18, { A: ["SS304 mesh, 12 ft", 1, 110000], B: ["SS304 mesh, 14 ft", 1, 125000], C: ["SS304, 10 ft", 1, 95000] }, null],
    ["e6", "De-oiling centrifuge", "no.", 18, { A: ["CD-10", 1, 145000], B: ["CD-10, auto-discharge", 1, 160000], C: ["CD-7", 1, 130000] }, null],
    ["e7", "Spice coating drum", "no.", 18, { A: ["Continuous, SS304", 1, 120000], B: ["Continuous + auto dosing", 1, 135000], C: null }, null],
    ["e8", "Electrical panel & cabling", "lot", 18, { A: ["VFD panel", 1, 70000], B: ["PLC panel", 1, 85000], C: ["Starter panel", 1, 60000] }, null],
    ["e9", "Installation & trial", "lot", 18, { A: ["2 days", 1, 35000], B: ["3 days", 1, 45000], C: ["1 day", 1, 30000] }, null]
  ],
  assetBench: { lo: 1000000, hi: 2500000, src: "plant", date: "2026 listings", note: "full plant incl. fryer; line alone lower" }
},
{
  id: "packing", name: "Namkeen Pouch Packaging Line", short: "Packaging Line",
  hsn: "8422 / 8423", category: "Packaging",
  req: { cap: 50, capLabel: "50 packs/min", text: "Collar VFFS + multihead weigher, pillow pouch 50 g–1 kg with N₂ flushing, 50 packs/min, with Z-elevator, coder and checkweigher" },
  capUnit: "ppm", capUnitLabel: "₹ per pack/min", scaleExp: 0.7,
  marketNote: "Indian-make 10-head multihead + collar VFFS at 40–60 ppm lists at ₹11.2–16.5 L; a complete line with elevator, checkweigher and coder lands near ₹18–30 L. Imported weigher heads push it higher. GST 18% (HSN 8422/8423).",
  marketSrc: ["mhw", "cw", "coder"],
  vendors: [
    { key: "A", name: "Nichrome India", offer: "60 ppm · 14-head weigher · CIJ coder", cap: 60, lead: "14 weeks", warranty: "12 months", payment: "30/60/10" },
    { key: "B", name: "Asian Packing Machinery", offer: "55 ppm · 10-head weigher · TIJ coder", cap: 55, lead: "8 weeks", warranty: "12 months", payment: "40/50/10" },
    { key: "C", name: "Pakona Engineers", offer: "45 ppm · 10-head weigher · TIJ coder", cap: 45, lead: "10 weeks", warranty: "12 months", payment: "50/40/10" }
  ],
  rows: [
    ["p1", "Multihead weigher", "no.", 18, { A: ["14-head, 1.6 L buckets", 1, 980000], B: ["10-head, 1.6 L", 1, 540000], C: ["10-head, 1.3 L", 1, 510000] }, null],
    ["p2", "Collar VFFS, servo pull, N₂ kit", "no.", 18, { A: ["Servo, 60 ppm", 1, 860000], B: ["Servo, 55 ppm", 1, 720000], C: ["Pneumatic jaws, 45 ppm", 1, 640000] }, null],
    ["p3", "Forming collars & tubes", "set", 18, { A: ["50 g–1 kg", 4, 45000], B: ["50 g–1 kg", 4, 38000], C: ["50–500 g", 3, 35000] }, null],
    ["p4", "Z-bucket elevator + vibro feeder", "no.", 18, { A: ["SS304 buckets", 1, 260000], B: ["PP buckets", 1, 225000], C: ["PP buckets", 1, 210000] }, { lo: 200000, hi: 250000, src: "zbucket", date: "2026 listing" }],
    ["p5", "Working platform", "no.", 18, { A: ["SS304", 1, 140000], B: ["MS powder-coated", 1, 110000], C: ["MS", 1, 95000] }, null],
    ["p6", "Batch coder", "no.", 18, { A: ["CIJ", 1, 185000], B: ["TIJ", 1, 65000], C: ["TIJ", 1, 60000] }, { lo: 25000, hi: 200000, src: "coder", date: "2026 listings", note: "TIJ ₹0.25–1.45 L · CIJ ₹1.3–2 L" }],
    ["p7", "Online checkweigher with reject", "no.", 18, { A: ["±0.5 g, air-jet reject", 1, 520000], B: ["±1 g, pusher reject", 1, 390000], C: null }, { lo: 250000, hi: 650000, src: "cw", date: "2026 listings" }],
    ["p8", "Take-off conveyor", "no.", 18, { A: ["3 m", 1, 55000], B: ["3 m", 1, 45000], C: ["2.5 m", 1, 40000] }, null],
    ["p9", "Installation, FAT/SAT & training", "lot", 18, { A: ["FAT at Pune + SAT", 1, 120000], B: ["SAT only", 1, 80000], C: ["SAT only", 1, 70000] }, null]
  ],
  assetBench: { lo: 1800000, hi: 3000000, src: "mhw", date: "2026 listings", note: "complete Indian-make line (estimate)" }
},
{
  id: "tfh", name: "Thermic Fluid Heater", short: "Thermic Fluid Heater",
  hsn: "8419", category: "Utilities",
  req: { cap: 6, capLabel: "6 lakh kcal/hr", text: "6 lakh kcal/hr briquette-fired thermic fluid heater serving the fryers, with pumps, expansion tank, dust collector, chimney and hot-oil piping" },
  capUnit: "lakh kcal/hr", capUnitLabel: "₹ per lakh kcal/hr", scaleExp: 0.6,
  lifecycle: { type: "fuel", field: "eff", label: "Thermal efficiency", unit: "%", duty: 600000 },
  marketNote: "The heater body alone lists at ₹6–15 L; a complete solid-fuel package at 6–10 lakh kcal/hr with fluid, pumps, piping and chimney runs ₹25–60 L depending on scope. GST 18% (HSN 8419).",
  marketSrc: ["tfh"],
  vendors: [
    { key: "A", name: "Thermax", offer: "6 lakh kcal/hr · 80% eff.", cap: 6, eff: 80, lead: "12 weeks", warranty: "18 months", payment: "20/70/10" },
    { key: "B", name: "Thermodyne Engineering", offer: "6 lakh kcal/hr · 75% eff.", cap: 6, eff: 75, lead: "8 weeks", warranty: "12 months", payment: "40/50/10" },
    { key: "C", name: "Isotex Corporation", offer: "8 lakh kcal/hr · 78% eff.", cap: 8, eff: 78, lead: "10 weeks", warranty: "12 months", payment: "30/60/10" }
  ],
  rows: [
    ["t1", "Heater coil & shell", "no.", 18, { A: ["3-pass coil, IS 2062", 1, 1450000], B: ["2-pass coil", 1, 1120000], C: ["3-pass coil, 8 L kcal", 1, 1580000] }, { lo: 600000, hi: 1500000, src: "tfh", date: "2026 listings", note: "heater body only" }],
    ["t2", "Furnace & fixed grate", "no.", 18, { A: ["Refractory-lined, fixed grate", 1, 420000], B: ["Fixed grate", 1, 340000], C: ["Fixed grate", 1, 460000] }, null],
    ["t3", "FD & ID fans", "set", 18, { A: ["VFD-driven", 1, 180000], B: ["DOL", 1, 145000], C: ["VFD-driven", 1, 200000] }, null],
    ["t4", "Thermic fluid pump (1W + 1S)", "no.", 18, { A: ["KSB hot-oil", 2, 135000], B: ["Kirloskar hot-oil", 2, 110000], C: ["KSB hot-oil", 2, 125000] }, null],
    ["t5", "Expansion, deaerator & storage tanks", "set", 18, { A: ["Full set", 1, 240000], B: ["Full set", 1, 190000], C: ["Full set", 1, 220000] }, null],
    ["t6", "Thermic fluid initial fill", "litre", 18, { A: ["Hytherm 500", 3000, 165], B: ["Hytherm 500", 2800, 160], C: ["Equivalent grade", 3500, 158] }, null],
    ["t7", "Multi-cyclone dust collector", "no.", 18, { A: ["PCB-compliant, <150 mg/Nm³", 1, 310000], B: ["Multi-cyclone", 1, 260000], C: null }, null],
    ["t8", "MS chimney, 30 m", "no.", 18, { A: ["Self-supporting", 1, 320000], B: ["Guyed", 1, 280000], C: ["Self-supporting", 1, 300000] }, null],
    ["t9", "PLC panel & flame safeguard", "no.", 18, { A: ["PLC + HMI, flow/temp trips", 1, 290000], B: ["Relay logic", 1, 190000], C: ["PLC", 1, 240000] }, null],
    ["t10", "Hot-oil piping, valves & insulation", "m", 18, { A: ["To 2 fryers, 120 m", 120, 4200], B: ["120 m", 120, 3600], C: null }, null],
    ["t11", "Fuel feeding system", "no.", 18, { A: ["Screw feeder", 1, 210000], B: ["Manual + hopper", 1, 170000], C: ["Screw feeder", 1, 200000] }, null],
    ["t12", "Erection & commissioning", "lot", 18, { A: ["Incl. hydro test", 1, 250000], B: ["Standard", 1, 180000], C: ["Standard", 1, 220000] }, null]
  ],
  assetBench: { lo: 2500000, hi: 6000000, src: "tfh", date: "2026 listings", note: "complete solid-fuel package (estimate)" }
},
{
  id: "boiler", name: "Biomass Steam Boiler", short: "Steam Boiler",
  hsn: "8402", category: "Utilities",
  req: { cap: 4, capLabel: "4 TPH", text: "4 TPH (F&A 100 °C) briquette-fired steam boiler, 10.5 kg/cm² working, IBR, with economiser, APC and chimney" },
  capUnit: "TPH", capUnitLabel: "₹ per TPH", scaleExp: 0.6,
  lifecycle: { type: "fuel", field: "eff", label: "Boiler efficiency (NCV)", unit: "%", duty: 2240000 },
  brochure: true,
  marketNote: "Base-boiler list prices on IndiaMART (e.g. 6 TPH ₹45 L) exclude economiser, APC, chimney, water treatment and IBR erection, which together often double the price. Thermax's Ultrapac UPRGA 40 (4 TPH) is rated 87% efficient on briquettes at 677 kg/hr fuel (your brochure). GST 18%.",
  marketSrc: ["boil", "ultrapac"],
  vendors: [
    { key: "A", name: "Thermax", offer: "Ultrapac UPRGA 40 · 4 TPH · 87% eff.", cap: 4, eff: 87, lead: "16 weeks", warranty: "18 months", payment: "20/70/10" },
    { key: "B", name: "Cheema Boilers", offer: "4 TPH reciprocating grate · 84% eff.", cap: 4, eff: 84, lead: "14 weeks", warranty: "12 months", payment: "30/60/10" },
    { key: "C", name: "Thermodyne Engineering", offer: "5 TPH fixed grate · 80% eff.", cap: 5, eff: 80, lead: "10 weeks", warranty: "12 months", payment: "40/50/10" }
  ],
  rows: [
    ["b1", "Boiler shell (2-pass) with membrane panel & baffle walls", "no.", 18, { A: ["Hybrid shell + MPA", 1, 5200000], B: ["Smoke tube + water wall", 1, 4400000], C: ["3-pass smoke tube, 5 TPH", 1, 4600000] }, null, "#1, #7, #8"],
    ["b2", "Combustion grate", "no.", 18, { A: ["Sloped reciprocating grate (Lambion)", 1, 1850000], B: ["Reciprocating grate", 1, 1400000], C: ["Fixed grate", 1, 750000] }, null, "#12"],
    ["b3", "Economiser with soot blower", "no.", 18, { A: ["Vertical serpentine + rotary soot blower", 1, 950000], B: ["Serpentine coil", 1, 780000], C: ["Coil type, no soot blower", 1, 690000] }, null, "#13"],
    ["b4", "Fuel feeding: screw feeder, dosing bin, level switch", "set", 18, { A: ["Variable-pitch screw, dosing bin", 1, 680000], B: ["Screw feeder", 1, 520000], C: ["Chain feeder", 1, 420000] }, null, "#27–29"],
    ["b5", "Primary & secondary air fans with ducting", "set", 18, { A: ["VFD-driven", 1, 560000], B: ["VFD-driven", 1, 460000], C: ["DOL", 1, 480000] }, null, "#10, #11, #19, #20"],
    ["b6", "ID fan & flue-gas ducting", "set", 18, { A: ["VFD", 1, 380000], B: ["VFD", 1, 340000], C: ["DOL", 1, 360000] }, null, "#18"],
    ["b7", "Feed-water pumping system (1W + 1S)", "no.", 18, { A: ["Grundfos multistage", 2, 190000], B: ["CRI multistage", 2, 160000], C: ["Kirloskar", 2, 170000] }, null, "#14–16"],
    ["b8", "Boiler trims: safety valves, stop valve, level gauge, probe controller, blowdown", "set", 18, { A: ["IBR trims, Forbes Marshall", 1, 420000], B: ["IBR trims", 1, 360000], C: ["IBR trims", 1, 330000] }, null, "#3–6, #21"],
    ["b9", "Online soot blowing (Danblast)", "no.", 18, { A: ["Compressed-air shock wave", 1, 450000], B: null, C: null }, null, "#31"],
    ["b10", "Air pollution control: multi-cyclone + bag filter", "set", 18, { A: ["Multi-cyclone + bag filter", 1, 1200000], B: ["Multi-cyclone + bag filter", 1, 1050000], C: ["Multi-cyclone + bag filter", 1, 980000] }, null],
    ["b11", "MS chimney, 30 m", "no.", 18, { A: ["Self-supporting", 1, 380000], B: ["Self-supporting", 1, 350000], C: ["Self-supporting", 1, 360000] }, null],
    ["b12", "Controls: PLC/HMI + IIoT remote monitoring", "set", 18, { A: ["Thermowiz Nxt + EDGE Live", 1, 520000], B: ["PLC + HMI", 1, 380000], C: ["Relay panel + HMI", 1, 290000] }, null],
    ["b13", "Platforms, staircases & access", "lot", 18, { A: ["Full access platforms", 1, 460000], B: ["Standard", 1, 390000], C: ["Standard", 1, 320000] }, null, "#2, #17, #25, #26"],
    ["b14", "Ash removal: wet/dry screw conveyor", "no.", 18, { A: ["Auto screw conveyor", 1, 340000], B: ["Screw conveyor", 1, 290000], C: null }, null, "#23, #24"],
    ["b15", "Water treatment: softener & dosing", "set", 18, { A: ["Duplex softener + dosing", 1, 280000], B: ["Duplex softener", 1, 260000], C: ["Simplex softener", 1, 250000] }, null],
    ["b16", "IBR approval, erection & commissioning", "lot", 18, { A: ["Turnkey incl. IBR", 1, 950000], B: ["Turnkey incl. IBR", 1, 820000], C: ["Erection + IBR", 1, 750000] }, null]
  ],
  assetBench: { lo: 1000000, hi: 4500000, src: "boil", date: "2026 listings", note: "base boiler only, scope varies widely" }
}
];

// Vendor intelligence gathered from the web on RESEARCH_DATE
export const INTEL: Record<string, Intel> = {
  "Tata Power Solar": { rating: "1.6★ ConsumerComplaints.in · 156 complaints (108 unresolved)", flags: ["Installation delays and unresponsive channel partners", "Cracked panels, inverter errors, low generation reported", "Priced ~10–15% above Waaree/Adani", "Parent Tata Power lost $490M Kleros arbitration challenge (coal, not solar), Aug 2026"], plus: ["Largest EPC track record in India; strong balance sheet"], src: [{ t: "ConsumerComplaints.in", u: "https://www.consumercomplaints.in/tata-power-solar-b110692" }, { t: "GoSolarIndex review 2026", u: "https://gosolarindex.in/blog/tata-power-solar-review-india-2026" }, { t: "Business Today, Aug 2026", u: "https://www.businesstoday.in/markets/stocks/story/tata-power-shares-in-focus-490-million-arbitration-challenge-lost-in-singapore-551640-2026-08-27" }] },
  "Waaree Energies": { rating: "No reliable aggregate score (Justdial 220 reviews, score not readable)", flags: ["US CBP found AD/CVD duty evasion on Vietnam/Malaysia imports, Jun 2026", "Income Tax search at Gujarat offices, Nov 2025", "Consumer reports of defective inverters and under-generation"], plus: ["Integrated module maker; ALMM-listed TOPCon capacity"], src: [{ t: "pv magazine USA, Jun 2026", u: "https://pv-magazine-usa.com/2026/06/25/waaree-determined-to-have-evaded-ad-cvd-orders-on-solar-imports-finds-u-s-customs/" }, { t: "Business Standard, Nov 2025", u: "https://www.business-standard.com/companies/news/income-tax-officials-conduct-probe-at-waaree-energies-offices-facilities-125111900590_1.html" }] },
  "Oriano Clean Energy": { rating: "No public ratings found; IndiaMART testimonials only", flags: ["Thin public track record for 500 kWp-class C&I", "GI rail on sheet roof risks galvanic corrosion"], plus: ["Lowest price, fastest delivery"], src: [{ t: "IndiaMART testimonials", u: "https://www.indiamart.com/oriano-clean-energy-private-limited/testimonial.html" }] },
  "Gungunwala Food Equipment": { rating: "4.2★ IndiaMART (92 reviews) · 90% response · 25% of reviews 1–2★", flags: ["One in four reviews negative"], plus: ["15 years, TrustSEAL verified"], src: [{ t: "IndiaMART", u: "https://www.indiamart.com/gungunwala-food-equipment/" }] },
  "Prakashwala Food Equipment": { rating: "4.1★ IndiaMART (134 reviews) · 93% response · 20% 1–2★", flags: ["No continuous oil filter or fume hood in quote"], plus: ["93% delivery score"], src: [{ t: "IndiaMART", u: "https://www.indiamart.com/prakashwalafoodequipment/" }] },
  "Dynamech Engineers": { rating: "4.3★ IndiaMART (129 reviews)", flags: ["Premium price"], plus: ["Est. 1985; full range kneader → extruder → fryer → coater"], src: [{ t: "Dynamech", u: "https://www.dynamechengineers.com/continuous-snacks-fryer.html" }] },
  "Harikrishna Techno (HKT)": { rating: "4.4★ IndiaMART", flags: ["Hydraulic extruder: higher maintenance"], plus: ["Rajkot maker, plants up to ₹20 L"], src: [{ t: "HKT Exports", u: "https://www.hktexports.com/namkeen-making-machine.html" }] },
  "Sneha Food Equipments": { rating: "4.3–4.4★ IndiaMART", flags: ["Undersized at 200 kg/hr; no cutter or coating drum quoted"], plus: ["Lowest price, fastest delivery"], src: [{ t: "IndiaMART category", u: "https://dir.indiamart.com/impcat/namkeen-extruder-machine.html" }] },
  "Nichrome India": { rating: "No usable public star rating", flags: ["Longest lead time (14 weeks)"], plus: ["Large established Pune OEM; FAT at works"], src: [{ t: "Nichrome", u: "https://www.nichrome.com/" }] },
  "Asian Packing Machinery": { rating: "4.4★ IndiaMART (66 ratings) · ~18% 1–2★", flags: ["~18% negative ratings, complaint text not public"], plus: ["Est. 1998, Faridabad"], src: [{ t: "IndiaMART", u: "https://www.indiamart.com/proddetail/collar-type-multihead-weigher-packing-machine-19980329897.html" }] },
  "Pakona Engineers": { rating: "3.3★ IndiaMART (4 ratings)", flags: ["Low score on thin data", "No checkweigher quoted; below 50 ppm target"], plus: ["Est. 1986, Vadodara"], src: [{ t: "IndiaMART", u: "https://m.indiamart.com/pakona-engineers/profile.html" }] },
  "Thermax": { rating: "4.3★ (dealer listing, 11 ratings); no public complaint text found", flags: ["Highest capex"], plus: ["Market leader in Indian process heating; IIoT remote monitoring"], src: [{ t: "Thermax thermic fluid heaters", u: "https://www.thermaxglobal.com/heating/thermic-fluid-heater/" }, { t: "IndiaMART dealer", u: "https://www.indiamart.com/proddetail/thermax-thermic-fluid-heater-vtb-coal-husk-fired-7159560430.html" }] },
  "Thermodyne Engineering": { rating: "4.1★ IndiaMART (26) · 3.0★ Trustpilot (5, 40% 1★)", flags: ["Trustpilot: design fault 'since beginning', contract terms changed, delayed delivery, below-standard quality"], plus: ["Lowest capex"], src: [{ t: "Trustpilot", u: "https://www.trustpilot.com/review/thermodyneboilers.com" }, { t: "IndiaMART", u: "https://m.indiamart.com/thermodyneengineering-systems/thermic-fluid-heaters.html" }] },
  "Isotex Corporation": { rating: "4.6★ IndiaMART (20) · but 55% user satisfaction, 60% quality score", flags: ["Oversized at 8 lakh kcal/hr; no dust collector or piping quoted"], plus: ["Ahmedabad maker, solid-fuel specialist"], src: [{ t: "IndiaMART", u: "https://www.indiamart.com/proddetail/10lakh-kcal-wood-fired-thermic-fluid-heater-2854114088073.html" }] },
  "Cheema Boilers": { rating: "Justdial 8 ratings (score not readable)", flags: ["No online soot blowing quoted"], plus: ["Mohali; reciprocating-grate biomass boilers, strong in agro-waste fuels"], src: [{ t: "Cheema reciprocating grate", u: "https://cheemaboilers.com/power-boiler/biomass-fired-boiler/reciprocating-grate/" }, { t: "Justdial", u: "https://www.justdial.com/Chandigarh/Cheema-Boilers-Limited-Kurali/0172PX172-X172-110210143632-J3L2_BZDET/reviews" }] }
};

// ===== Part knowledge: what each BoQ line is, where it sits, what a CXO should check =====
export const PARTS: Record<string, { about: string; check: string }> = {
  // Solar
  s1: { about: "The PV panels on the roof. They are about 45% of project cost and set how much power you generate for 25+ years.", check: "The make must be on ALMM List-I. Compare the Wp rating, bifacial vs mono-facial, and the degradation warranty (≤0.4%/yr after year 1)." },
  s2: { about: "Wall- or roof-mounted boxes that convert DC from the panels into AC for the plant bus.", check: "Check the DC:AC ratio (1.1–1.25 is typical), whether a 5-yr or 10-yr warranty is included, and whether the service centre is within reach of Bikaner." },
  s3: { about: "The rails and clamps that hold the panels to the roof sheets or RCC slab.", check: "Metal-sheet roofs need aluminium or magnelis rails. GI rails can corrode where they touch dissimilar metal. Ask for wind-load design for Zone IV (Rajasthan)." },
  s4: { about: "DC strings from panels to inverters, and AC cables from inverters to the LT panel, run in trays across the roof.", check: "Look for solar-grade DC cable (EN 50618), UV-resistant trays, and a voltage-drop calculation under 1.5%." },
  s5: { about: "The AC combiner and LT panel where solar output joins the factory's main bus, with the net meter.", check: "Breaker rating, a bi-directional ABT meter approved by the DISCOM, and space for future expansion." },
  s6: { about: "Earth pits for the array and lightning-arrester masts at the roof corners.", check: "The number of earth pits, ESE vs conventional LA, and the protection radius covering the full array." },
  s7: { about: "Weather station and data logger that report generation and alarms remotely.", check: "Irradiance sensor included? Is the portal free for 5+ years? Does it alarm on string failures?" },
  s8: { about: "FRP walkways and fall-arrest lifelines between panel rows for cleaning and maintenance.", check: "Without walkways, cleaners step on panels and cause micro-cracks. Treat this as mandatory for sheet roofs." },
  s9: { about: "Site work to erect, wire, test and commission the plant.", check: "It should include IV-curve testing, thermography and a performance-ratio test before handover." },
  s10: { about: "Paperwork with the DISCOM and electrical inspector (CEIG) to get the net meter installed.", check: "Who carries the approval risk? Fix a timeline and a penalty for delays. This is the most common complaint across vendors." },
  s11: { about: "Cleaning, inspection and breakdown response after commissioning.", check: "Cleaning frequency (Bikaner dust needs at least fortnightly), response SLA, and a generation guarantee with liquidated damages." },
  // Fryer
  f1: { about: "The long SS trough that holds hot oil. Product travels through it on the conveyor.", check: "The SS304 grade certificate, plate thickness (3 mm resists warping) and oil holding volume. Less oil means faster turnover and fresher oil." },
  f2: { about: "Mesh belts that carry product through the oil and hold it submerged, with a lift to raise them for cleaning.", check: "Pneumatic lift is faster and safer than screw-gear. Check belt mesh size for sev and boondi." },
  f3: { about: "Heat exchanger that transfers heat from the thermic fluid into the frying oil.", check: "SS tubes avoid the oil contamination MS tubes can cause. Check the rated duty in kcal/hr against the fryer capacity." },
  f4: { about: "Pump and tank that keep the oil circulating through the heat exchanger and filter.", check: "Pump make, flow rate, and tank size relative to oil holdup." },
  f5: { about: "Removes fried crumbs from the oil continuously so the oil lasts longer and stays clean.", check: "Missing from Prakashwala's quote. Without it, oil darkens faster and acrylamide risk rises. Insist it is included." },
  f6: { about: "Vibrating conveyor at the exit that shakes off surface oil before seasoning.", check: "Length and vibration amplitude. It directly affects the oil content of the finished product." },
  f7: { about: "Controls for conveyor speed and oil temperature.", check: "A PID loop with ±2 °C accuracy, and a PLC if you want batch records for FSSAI audits." },
  f8: { about: "Hood and blower above the fryer that remove oil fumes and steam.", check: "Missing from Prakashwala's quote. It is needed for worker safety and fire risk. Check for an oil-mist separator." },
  f9: { about: "Erection, trial runs and operator training at site.", check: "The number of trial days on your own products (sev, mixture, dal), and whether trial oil is included." },
  // Extruder
  e1: { about: "Mixer that kneads besan dough to a consistent texture before extrusion.", check: "Batch size against the line rate, SS304 contact parts, and a discharge mechanism." },
  e2: { about: "The heart of the line. It presses dough through the die to form sev and bhujia strands.", check: "Screw vs hydraulic: hydraulic handles stiff dough but needs more maintenance. Check that capacity matches the fryer." },
  e3: { about: "Interchangeable perforated plates that decide the product shape and thickness.", check: "How many profiles are included (sev, bhujia, gathiya, papdi), and the price of extra dies." },
  e4: { about: "Blade that cuts extruded strands to length as they fall into the fryer.", check: "Missing from Sneha's quote. A servo cutter gives uniform length." },
  e5: { about: "Belt that carries extruded product into the fryer.", check: "Length must match the plant layout. It should have food-grade SS304 mesh." },
  e6: { about: "Spinning drum that removes excess oil after frying.", check: "Drum size and whether discharge is automatic." },
  e7: { about: "Rotating drum that coats product evenly with masala.", check: "Missing from Sneha's quote. Auto-dosing gives consistent taste across batches." },
  e8: { about: "Motor starters and drives for the line.", check: "VFDs let you change speed for different products." },
  e9: { about: "Setup and trials at site.", check: "Trials on your own recipes." },
  // Packing
  p1: { about: "The ring of weigh buckets at the top that combines portions to hit the exact pack weight.", check: "14 heads give better accuracy and less giveaway than 10 heads. Each gram saved on a 200 g pack is 0.5% of product." },
  p2: { about: "Vertical form-fill-seal machine that forms the pouch from film, fills it and seals it, with nitrogen flushing.", check: "Servo film pull (more accurate, faster than pneumatic), seal jaw type, and N₂ residual oxygen below 3%." },
  p3: { about: "Shaped collar and tube that fold flat film into a pouch. You need one set per pouch width.", check: "Check that every SKU size you run is covered." },
  p4: { about: "Bucket elevator that lifts product from the floor up to the weigher.", check: "SS buckets are easier to clean than PP. Check the breakage rate on fragile products like bhujia." },
  p5: { about: "Raised platform that holds the weigher above the VFFS.", check: "SS304 for hygiene, with railings and access stairs." },
  p6: { about: "Printer that marks batch number, MRP and expiry on each pouch.", check: "CIJ is faster and more robust; TIJ is cheaper but its ink costs more per print. This is a Legal Metrology requirement." },
  p7: { about: "Weighs every pack after sealing and rejects under-weight packs.", check: "Missing from Pakona's quote. It is essential for Legal Metrology compliance. ±0.5 g accuracy is the benchmark." },
  p8: { about: "Short conveyor that carries sealed packs to cartoning.", check: "Length should suit the layout." },
  p9: { about: "Factory acceptance test (FAT), site acceptance test (SAT), and operator training.", check: "Run the FAT with your own film and product before dispatch." },
  // TFH
  t1: { about: "The coiled pipe inside the heater where thermic fluid is heated by combustion gases.", check: "Coil tube material and thickness, number of passes (3-pass is more efficient), and the rated maximum fluid temperature." },
  t2: { about: "Combustion chamber where briquettes burn on the grate.", check: "Refractory quality and grate type for briquettes." },
  t3: { about: "Forced-draft fan pushes air into the furnace; induced-draft fan pulls flue gas out.", check: "VFD drives save 20–30% of fan power." },
  t4: { about: "Pumps that circulate hot fluid to the fryers and back, one working and one standby.", check: "Hot-oil rated pumps (KSB or Kirloskar), mechanical seals, and an automatic standby changeover." },
  t5: { about: "Expansion tank absorbs fluid growth when hot; deaerator removes air; storage tank holds drained fluid.", check: "Expansion tank must sit at the highest point of the circuit. Check volume against the system holdup." },
  t6: { about: "The first charge of heat-transfer oil for the whole circuit.", check: "Grade, max film temperature and volume. A cheap fluid degrades fast." },
  t7: { about: "Dust collector that cleans flue gas before the chimney.", check: "Missing from Isotex's quote. It is required for the pollution control board's consent to operate (<150 mg/Nm³)." },
  t8: { about: "Stack that disperses flue gas at height.", check: "Height per CPCB norms, and self-supporting vs guyed." },
  t9: { about: "Controls, interlocks and flame safety.", check: "Low-flow and high-temperature trips are critical: fluid overheating causes fires." },
  t10: { about: "Insulated pipework carrying hot fluid from the heater to the fryers.", check: "Missing from Isotex's quote. Check flanged vs welded joints, insulation thickness and valve make." },
  t11: { about: "Hopper and screw that feed briquettes into the furnace.", check: "Automatic feeding keeps temperature steady and reduces labour." },
  t12: { about: "Site erection, hydro test and commissioning.", check: "Check whether the hydro test and fluid flushing are included." },
  // Boiler (numbers match the Ultrapac brochure)
  b1: { about: "The main pressure vessel (brochure #1): a 2-pass smoke-tube shell over a membrane-panel furnace (#7, #8). Water turns to steam here.", check: "Design pressure is the key spec. Also check plate material (SA 516 Gr 70), tube size and heating surface area." },
  b2: { about: "The moving grate at the furnace floor (#12). It pushes burning fuel forward so ash falls off and fresh fuel keeps burning.", check: "A reciprocating grate handles mixed biomass and briquettes better than a fixed grate, which needs manual de-ashing." },
  b3: { about: "Heat exchanger in the flue path (#13) that pre-heats feed water using exhaust heat.", check: "It adds 4–6 points of efficiency. Soot blowing on the economiser keeps it effective." },
  b4: { about: "Dosing bin, level switch and screw feeder (#27–29) that push briquettes into the furnace.", check: "Variable-pitch screws resist jamming. Check backfire protection (temperature sensors, water jets)." },
  b5: { about: "Primary air goes under the grate and secondary air over the fire (#10, #11, #19, #20).", check: "VFD drives let air follow load, which matters for efficiency at part load." },
  b6: { about: "Induced-draft fan and flue ducting (#18) that pull gas through the boiler, economiser and dust collector.", check: "VFD drive and fan material rated for flue temperature." },
  b7: { about: "Pumps (#14–16) that push treated water into the boiler against its pressure.", check: "The pump head must exceed the boiler design pressure. One working and one standby is mandatory." },
  b8: { about: "Safety valves, main steam stop valve, gauge glass, probe level controller and blowdown (#3–6, #21).", check: "Safety-valve set pressure follows design pressure. Needs IBR-approved makes." },
  b9: { about: "Danblast (#31): compressed-air shock waves that clean soot off the tubes while the boiler runs.", check: "Only Thermax quotes it. Without it, tubes foul and efficiency drops about 1% a month between manual cleanings." },
  b10: { about: "Multi-cyclone plus bag filter that removes fly ash before the chimney.", check: "It must meet the pollution control board's particulate limit for Rajasthan. Check the bag material temperature rating." },
  b11: { about: "Chimney that discharges flue gas at height.", check: "Height per CPCB norms for the steam rating." },
  b12: { about: "PLC and HMI (Thermowiz Nxt) plus IIoT remote monitoring (EDGE Live) for efficiency and alarms.", check: "Remote monitoring allows predictive maintenance. Ask who owns the data and what the subscription costs." },
  b13: { about: "Platforms, staircases and railings (#2, #17, #25, #26) for access to trims, economiser and feeders.", check: "Galvanised or painted steel, and whether they cover every valve that needs operating." },
  b14: { about: "Ash removal points and screw conveyor (#23, #24) that take ash out of the furnace continuously.", check: "Missing from Thermodyne's quote. Manual de-ashing needs extra labour and dust control." },
  b15: { about: "Softener and chemical dosing that treat feed water to prevent scale inside the shell.", check: "Duplex (two vessels) means no downtime during regeneration. Hardness should be below 5 ppm." },
  b16: { about: "Registration with the Boiler Inspectorate, plus erection and commissioning.", check: "IBR drawing approval, inspection fees and a hydro test should be in the vendor's scope." }
};

// ===== Vendor technical sheets: [parameter, requirement, {A,B,C}, {A,B,C fit: good|warn|bad}] =====
export const TECH: Record<string, TechRow[]> = {
  solar: [
    ["Module technology", "TOPCon or better, ALMM List-I", { A: "TOPCon 580 Wp", B: "Bifacial TOPCon 590 Wp", C: "Mono PERC 550 Wp" }, { A: "good", B: "good", C: "warn" }],
    ["DC:AC ratio", "1.10–1.25", { A: "1.14", B: "1.18", C: "1.20" }, { A: "good", B: "good", C: "good" }],
    ["Structure on sheet roof", "Aluminium / magnelis", { A: "Aluminium rail", B: "Pre-galv GI", C: "GI rail" }, { A: "good", B: "warn", C: "bad" }],
    ["Specific yield (P50)", "≥ 1,580 kWh/kWp/yr", { A: "1,600", B: "1,640", C: "1,540" }, { A: "good", B: "good", C: "warn" }],
    ["O&M response SLA", "≤ 48 h", { A: "24 h", B: "48 h", C: "72 h" }, { A: "good", B: "good", C: "bad" }]
  ],
  fryer: [
    ["Capacity", "400 kg/hr", { A: "400 kg/hr", B: "350 kg/hr", C: "500 kg/hr" }, { A: "good", B: "bad", C: "good" }],
    ["Pan plate", "SS304, ≥ 3 mm", { A: "3 mm", B: "2.5 mm", C: "3 mm" }, { A: "good", B: "warn", C: "good" }],
    ["Oil holdup", "Lower is better", { A: "600 L", B: "520 L", C: "750 L" }, { A: "good", B: "good", C: "warn" }],
    ["Continuous filtration", "Required", { A: "Drum", B: "Not quoted", C: "Belt + drum" }, { A: "good", B: "bad", C: "good" }],
    ["Heat exchanger tubes", "SS", { A: "SS, 3-pass", B: "MS, 2-pass", C: "SS, 3-pass" }, { A: "good", B: "bad", C: "good" }]
  ],
  extruder: [
    ["Capacity", "250 kg/hr", { A: "250 kg/hr", B: "300 kg/hr", C: "200 kg/hr" }, { A: "good", B: "good", C: "bad" }],
    ["Extrusion type", "Screw preferred (lower upkeep)", { A: "Screw", B: "Hydraulic", C: "Screw" }, { A: "good", B: "warn", C: "good" }],
    ["Die profiles", "≥ 6", { A: "6", B: "8", C: "5" }, { A: "good", B: "good", C: "warn" }],
    ["Cutter & coating drum", "Both required", { A: "Both", B: "Both", C: "Neither" }, { A: "good", B: "good", C: "bad" }]
  ],
  packing: [
    ["Speed", "≥ 50 packs/min", { A: "60", B: "55", C: "45" }, { A: "good", B: "good", C: "bad" }],
    ["Weigher heads", "14 preferred for giveaway", { A: "14-head", B: "10-head", C: "10-head" }, { A: "good", B: "warn", C: "warn" }],
    ["Film pull", "Servo", { A: "Servo", B: "Servo", C: "Pneumatic" }, { A: "good", B: "good", C: "warn" }],
    ["Checkweigher", "Required, ±0.5 g", { A: "±0.5 g", B: "±1 g", C: "Not quoted" }, { A: "good", B: "warn", C: "bad" }],
    ["Batch coder", "CIJ preferred", { A: "CIJ", B: "TIJ", C: "TIJ" }, { A: "good", B: "warn", C: "warn" }]
  ],
  tfh: [
    ["Capacity", "6 lakh kcal/hr", { A: "6 lakh", B: "6 lakh", C: "8 lakh" }, { A: "good", B: "good", C: "warn" }],
    ["Efficiency", "≥ 78%", { A: "80%", B: "75%", C: "78%" }, { A: "good", B: "bad", C: "good" }],
    ["Max fluid temperature", "≥ 280 °C (frying at 180–190 °C)", { A: "300 °C", B: "280 °C", C: "300 °C" }, { A: "good", B: "warn", C: "good" }],
    ["Safety interlocks", "PLC with flow and temperature trips", { A: "PLC + HMI", B: "Relay logic", C: "PLC" }, { A: "good", B: "warn", C: "good" }],
    ["Dust collector", "Required for PCB consent", { A: "Included", B: "Included", C: "Not quoted" }, { A: "good", B: "good", C: "bad" }]
  ],
  boiler: [
    ["Steam output (F&A 100 °C)", "4,000 kg/hr", { A: "4,000 kg/hr", B: "4,000 kg/hr", C: "5,000 kg/hr" }, { A: "good", B: "good", C: "warn" }],
    ["Working pressure", "10.5 kg/cm²(g)", { A: "10.5", B: "10.5", C: "10.5" }, { A: "good", B: "good", C: "good" }],
    ["Design pressure", "≥ 11.5 kg/cm²(g) (working + safety-valve margin)", { A: "11.25 std · 17.5 option", B: "10.54", C: "17.5" }, { A: "warn", B: "bad", C: "good" }],
    ["Efficiency on briquettes (NCV)", "≥ 85%", { A: "87% (brochure)", B: "84%", C: "80%" }, { A: "good", B: "warn", C: "bad" }],
    ["Grate", "Reciprocating (auto de-ash)", { A: "Sloped reciprocating", B: "Reciprocating", C: "Fixed (manual)" }, { A: "good", B: "good", C: "bad" }],
    ["Fuel flexibility", "Briquette, husk, wood chips", { A: "Briquette, husk, chips, GN shell, PKS, coal", B: "Briquette, husk, wood", C: "Wood, coal" }, { A: "good", B: "good", C: "warn" }],
    ["Online soot cleaning", "Preferred", { A: "Danblast + rotary", B: "Manual", C: "Manual" }, { A: "good", B: "warn", C: "warn" }],
    ["Remote monitoring", "Preferred", { A: "EDGE Live IIoT", B: "None", C: "None" }, { A: "good", B: "warn", C: "warn" }],
    ["Design code", "IBR 1950", { A: "IBR 1950", B: "IBR 1950", C: "IBR 1950" }, { A: "good", B: "good", C: "good" }]
  ]
};
