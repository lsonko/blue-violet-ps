// Tax engine — ported verbatim from the Blue Violet prototype's calc(),
// with the hardcoded reference date replaced by a real, dynamic "today".
//
// Model: annualize YTD actuals (ratable projection, cf. IRS Form 2210),
// SE tax with SS cap + uncapped Medicare + 0.9% surtax, federal + NJ bracket
// income tax with spouse-wage stacking, Solo 401(k) as an above-the-line
// adjustment, then level quarterly installments with elapsed-quarter catch-up.

import type { AppData, FilingStatus, Settings } from "./types";

export const FED: Record<
  FilingStatus,
  { std: number; b: [number, number][] }
> = {
  single: {
    std: 16100,
    b: [
      [0, 0.1],
      [12400, 0.12],
      [50400, 0.22],
      [105700, 0.24],
      [201775, 0.32],
      [256225, 0.35],
      [640600, 0.37],
    ],
  },
  married: {
    std: 32200,
    b: [
      [0, 0.1],
      [24800, 0.12],
      [100800, 0.22],
      [211400, 0.24],
      [403550, 0.32],
      [512450, 0.35],
      [768700, 0.37],
    ],
  },
};

export const NJ_S: [number, number][] = [
  [0, 0.014],
  [20000, 0.0175],
  [35000, 0.035],
  [40000, 0.05525],
  [75000, 0.0637],
  [500000, 0.0897],
  [1000000, 0.1075],
];

export const NJ_M: [number, number][] = [
  [0, 0.014],
  [20000, 0.0175],
  [50000, 0.0245],
  [70000, 0.035],
  [80000, 0.05525],
  [150000, 0.0637],
  [500000, 0.0897],
  [1000000, 0.1075],
];

export const SS_WAGE_BASE = 184500;
export const MEDICARE_ADDL: Record<FilingStatus, number> = {
  single: 200000,
  married: 250000,
};

export interface Quarter {
  q: string;
  d: string;
}

/** Federal estimated-tax deadlines for the given tax year. */
export function quartersForYear(year: number): Quarter[] {
  return [
    { q: "Q1", d: `${year}-04-15` },
    { q: "Q2", d: `${year}-06-15` },
    { q: "Q3", d: `${year}-09-15` },
    { q: "Q4", d: `${year + 1}-01-15` },
  ];
}

export function bracketTax(income: number, b: [number, number][]): number {
  if (income <= 0) return 0;
  let t = 0;
  for (let i = 0; i < b.length; i++) {
    const lo = b[i][0];
    const hi = i + 1 < b.length ? b[i + 1][0] : Infinity;
    const rate = b[i][1];
    if (income > lo) t += (Math.min(income, hi) - lo) * rate;
    else break;
  }
  return t;
}

/** Reference "today". Real current date, normalized to local midnight. */
export function today(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function monthIndex(date: string) {
  const [year, month] = date.slice(0, 7).split("-").map(Number);
  return year * 12 + month - 1;
}

export function taxYear(ref: Date = today()): number {
  return ref.getFullYear();
}

export function daysUntil(dateStr: string, ref: Date = today()): number {
  return Math.round(
    (new Date(dateStr + "T00:00:00").getTime() - ref.getTime()) / 86400000
  );
}

export interface CalcResult {
  ytd: number;
  ytdNet: number;
  doy: number;
  factor: number;
  annNet: number;
  annIncome: number;
  annK401: number;
  cmeCost: number;
  k401: number;
  totalDed: number;
  net: number;
  seBase: number;
  ssTax: number;
  medTax: number;
  addlMed: number;
  seTax: number;
  mfj: boolean;
  spouseWages: number;
  spouseFedWH: number;
  spouseStateWH: number;
  householdTaxable: number;
  fedTaxTotal: number;
  njBase: number;
  njExempt: number;
  stateTaxTotal: number;
  fedTax: number;
  stateTax: number;
  total: number;
  accrued: number;
  reqPer: number;
  perRemaining: number;
  shortfall: number;
  paidTotal: number;
  remainingQ: number;
  quarterly: number;
  effRate: number;
}

export function calc(data: AppData, ref: Date = today()): CalcResult {
  const set: Settings = data.settings;
  const year = ref.getFullYear();
  const QUARTERS = quartersForYear(year);

  const ytd = data.income.reduce((a, b) => a + b.amount, 0);
  const cmeCost = data.cme.reduce((a, b) => a + b.cost, 0);
  const k401 = data.deductions
    .filter((d) => d.k401)
    .reduce((a, b) => a + b.amount, 0);
  const bizDedYtd =
    data.deductions.filter((d) => !d.k401).reduce((a, b) => a + b.amount, 0) +
    cmeCost;
  const totalDed = bizDedYtd + k401;
  const ytdNet = Math.max(0, ytd - bizDedYtd);

  // 1) Annualize YTD actuals (ratable projection, cf. IRS Form 2210)
  const doy = Math.max(
    1,
    Math.floor(
      (ref.getTime() - new Date(`${year}-01-01T00:00:00`).getTime()) / 86400000
    ) + 1
  );
  const factor = 365 / doy;
  const annNet = ytdNet * factor;
  const annIncome = ytd * factor;
  const nextMonth = year * 12 + ref.getMonth() + 1;
  const effectiveMonth = monthIndex(set.solo401kEffectiveFrom);
  const taxYearEndMonth = year * 12 + 11;
  const futureK401Months = Math.max(
    0,
    taxYearEndMonth - Math.max(nextMonth, effectiveMonth) + 1
  );
  const annK401 = k401 + set.solo401kMonthly * futureK401Months;
  const mfj = set.filingStatus === "married";
  const spouseWages = mfj ? set.spouseWages || 0 : 0;
  const spouseFedWH = mfj ? set.spouseFedWithheld || 0 : 0;
  const spouseStateWH = mfj ? set.spouseStateWithheld || 0 : 0;

  // 2) SE tax: SS capped at wage base; Medicare uncapped; 0.9% surtax above threshold.
  const seBase = annNet * 0.9235;
  const ssTax = Math.min(seBase, SS_WAGE_BASE) * 0.124;
  const medTax = seBase * 0.029;
  const addlMed =
    0.009 * Math.max(0, seBase + spouseWages - MEDICARE_ADDL[set.filingStatus]);
  const seTax = ssTax + medTax + addlMed;

  // 3) Federal income tax: ½ SE and Solo 401(k) deducted above the line; spouse wages stack.
  const fs = FED[set.filingStatus];
  const fedTaxable = Math.max(
    0,
    annNet - seTax / 2 - annK401 + spouseWages - fs.std
  );
  const fedTaxTotal = bracketTax(fedTaxable, fs.b);
  const fedTax = Math.max(0, fedTaxTotal - spouseFedWH);

  // 4) NJ: filing-status brackets; no std deduction, no ½-SE, no 401(k) — only personal exemption.
  const njB = mfj ? NJ_M : NJ_S;
  const njExempt = mfj ? 2000 : 1000;
  const njBase = Math.max(0, annNet + spouseWages - njExempt);
  const stateTaxTotal = bracketTax(njBase, njB);
  const stateTax = Math.max(0, stateTaxTotal - spouseStateWH);

  // 5) Projected full-year total and level installments + catch-up.
  const total = seTax + fedTax + stateTax;
  const accrued = (total * doy) / 365;
  const reqPer = total / 4;
  const qPaid = data.qPaid || {};
  const paidTotal = QUARTERS.reduce((a, x) => a + (qPaid[x.q] || 0), 0);
  const remaining = QUARTERS.filter((x) => daysUntil(x.d, ref) >= 0);
  const shortfall = QUARTERS.filter((x) => daysUntil(x.d, ref) < 0).reduce(
    (a, x) => a + (reqPer - (qPaid[x.q] || 0)),
    0
  );
  const perRemaining = remaining.length
    ? Math.max(0, reqPer + shortfall / remaining.length)
    : 0;

  return {
    ytd,
    ytdNet,
    doy,
    factor,
    annNet,
    annIncome,
    annK401,
    cmeCost,
    k401,
    totalDed,
    net: annNet,
    seBase,
    ssTax,
    medTax,
    addlMed,
    seTax,
    mfj,
    spouseWages,
    spouseFedWH,
    spouseStateWH,
    householdTaxable: fedTaxable,
    fedTaxTotal,
    njBase,
    njExempt,
    stateTaxTotal,
    fedTax,
    stateTax,
    total,
    accrued,
    reqPer,
    perRemaining,
    shortfall,
    paidTotal,
    remainingQ: remaining.length,
    quarterly: perRemaining,
    effRate: annIncome > 0 ? total / annIncome : 0,
  };
}
