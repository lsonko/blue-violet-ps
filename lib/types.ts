// Domain types shared across the Blue Violet app.

export type FilingStatus = "single" | "married";

export interface FileRef {
  /** Storage object path within the private bucket, e.g. "<uid>/receipts/uuid.png" */
  path: string;
  name: string;
  type: string;
  size: number;
}

export interface Settings {
  filingStatus: FilingStatus;
  state: string;
  cmeTarget: number;
  cycleEnds: string;
  solo401kMonthly: number;
  solo401kEffectiveFrom: string;
  physicianName: string;
  spouseWages: number;
  spouseFedWithheld: number;
  spouseStateWithheld: number;
  otherWithheld: number;
}

export interface Income {
  id: string;
  date: string;
  amount: number;
  source: string;
  note: string;
}

export interface Deduction {
  id: string;
  date: string;
  amount: number;
  category: string;
  note: string;
  /** true when a real file is attached (FileRef), false/null otherwise */
  receipt: FileRef | boolean | null;
  k401?: boolean;
  edited?: boolean;
}

export interface Cme {
  id: string;
  date: string;
  activity: string;
  hours: number;
  cost: number;
  receipt: FileRef | boolean | null;
}

export interface Credential {
  id: string;
  type: string;
  label: string;
  issue: string;
  exp: string;
  number: string;
  note: string;
  doc: FileRef | boolean | null;
}

/** Amount set aside per quarter, keyed by quarter label (Q1..Q4). */
export type QuarterPaid = Record<string, number>;

export interface AppData {
  settings: Settings;
  income: Income[];
  deductions: Deduction[];
  cme: Cme[];
  credentials: Credential[];
  qPaid: QuarterPaid;
}
