// Demo dataset for a first-time physician account, ported from the prototype.
// The monthly Solo 401(k) rows are NOT seeded here. The app creates automatic
// rows only from the configured effective month onward.

export const SEED_SETTINGS = {
  filing_status: "single",
  state: "New Jersey",
  cme_target: 100,
  cycle_ends: "2027-06-30",
  solo401k_monthly: 2500,
  physician_name: "Dr. Alex Morgan",
  spouse_wages: 95000,
  spouse_fed_withheld: 11800,
  spouse_state_withheld: 3400,
  other_withheld: 0,
};

export const SEED_INCOME = [
  { date: "2026-01-15", amount: 48000, source: "Riverside Medical Center", note: "January locum coverage" },
  { date: "2026-02-15", amount: 46500, source: "Riverside Medical Center", note: "" },
  { date: "2026-03-16", amount: 52000, source: "Coastal Emergency Group", note: "Overnight shifts" },
  { date: "2026-04-15", amount: 49500, source: "Riverside Medical Center", note: "" },
  { date: "2026-05-15", amount: 47800, source: "Coastal Emergency Group", note: "" },
  { date: "2026-06-15", amount: 51200, source: "Riverside Medical Center", note: "" },
];

// receipt: true here means "on file" (a checkmark) without a viewable upload,
// mirroring the prototype's seed. Stored as {"onFile": true} jsonb.
export const SEED_DEDUCTIONS = [
  { date: "2026-01-10", amount: 8200, category: "Malpractice insurance", note: "Annual premium", onFile: true },
  { date: "2026-01-22", amount: 560, category: "Licensing & registration fees", note: "NJ CDS renewal", onFile: false },
  { date: "2026-02-08", amount: 1350, category: "Medical equipment & supplies", note: "Portable ultrasound probe", onFile: true },
  { date: "2026-03-12", amount: 2100, category: "Travel & mileage", note: "Conference travel", onFile: false },
  { date: "2026-04-02", amount: 480, category: "Professional dues & subscriptions", note: "AMA membership", onFile: true },
  { date: "2026-05-20", amount: 720, category: "Office / administrative", note: "Billing software", onFile: false },
];

export const SEED_CME = [
  { date: "2026-02-20", activity: "Emergency Ultrasound Workshop", hours: 12, cost: 950, onFile: true },
  { date: "2026-03-28", activity: "ACLS Recertification Course", hours: 8, cost: 350, onFile: true },
  { date: "2026-04-18", activity: "Stroke Management Update (online)", hours: 6, cost: 0, onFile: false },
  { date: "2026-05-10", activity: "Sepsis & Critical Care Symposium", hours: 16, cost: 1200, onFile: true },
  { date: "2026-06-05", activity: "Wound Care Management Module", hours: 5, cost: 0, onFile: false },
];

export const SEED_CREDENTIALS = [
  { type: "NJ medical license", label: "State Board of Medical Examiners", issue: "2024-08-25", exp: "2026-08-25", number: "25MA07•••••", note: "Biennial renewal", onFile: true },
  { type: "DEA registration", label: "Federal — controlled substances", issue: "2024-05-01", exp: "2027-04-30", number: "BM•••••••", note: "", onFile: true },
  { type: "NJ CDS registration", label: "State controlled substances", issue: "2024-09-15", exp: "2026-09-15", number: "CDS•••••", note: "Required in addition to DEA", onFile: true },
  { type: "Board certification", label: "ABEM — Emergency Medicine", issue: "2019-11-30", exp: "2029-11-30", number: "", note: "10-year MOC cycle", onFile: true },
  { type: "Malpractice insurance certificate", label: "Coverys — occurrence", issue: "2026-01-10", exp: "2027-01-10", number: "", note: "", onFile: true },
  { type: "BLS / ACLS", label: "American Heart Association", issue: "2024-07-28", exp: "2026-07-28", number: "", note: "", onFile: true },
];

// Seeded amounts the physician already set aside for the first two quarters.
export const SEED_QUARTER_PAYMENTS = [
  { quarter: "Q1", amount: 36700 },
  { quarter: "Q2", amount: 36700 },
];
