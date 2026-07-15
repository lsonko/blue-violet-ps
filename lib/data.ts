import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AppData,
  Credential,
  Deduction,
  Cme,
  FileRef,
  Income,
  Settings,
} from "./types";
import {
  SEED_CME,
  SEED_CREDENTIALS,
  SEED_DEDUCTIONS,
  SEED_INCOME,
  SEED_QUARTER_PAYMENTS,
  SEED_SETTINGS,
} from "./seed";
import { isK401, taxYear } from "./tax";

// A jsonb file column is either null, an "on file" marker, or a real FileRef.
type FileCol = null | { onFile: boolean } | FileRef;

function toFileRef(v: FileCol): FileRef | boolean | null {
  if (!v) return null;
  if ("path" in v && v.path) return v as FileRef;
  if ("onFile" in v) return v.onFile ? true : null;
  return null;
}

function mapSettings(row: Record<string, unknown>): Settings {
  return {
    filingStatus: (row.filing_status as Settings["filingStatus"]) ?? "single",
    state: (row.state as string) ?? "New Jersey",
    cmeTarget: Number(row.cme_target ?? 100),
    cycleEnds: String(row.cycle_ends ?? "2027-06-30"),
    solo401kMonthly: Number(row.solo401k_monthly ?? 2500),
    physicianName: (row.physician_name as string) ?? "Physician",
    spouseWages: Number(row.spouse_wages ?? 0),
    spouseFedWithheld: Number(row.spouse_fed_withheld ?? 0),
    spouseStateWithheld: Number(row.spouse_state_withheld ?? 0),
    otherWithheld: Number(row.other_withheld ?? 0),
  };
}

/** Load the signed-in user's full dataset, seeding + syncing on first use. */
export async function getAppData(
  supabase: SupabaseClient,
  userId: string
): Promise<AppData> {
  let { data: settingsRow } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!settingsRow) {
    settingsRow = await seedUser(supabase, userId);
  }

  const settings = mapSettings(settingsRow as Record<string, unknown>);

  // Ensure a monthly Solo 401(k) deduction exists for every month up to now.
  await sync401k(supabase, userId, settings.solo401kMonthly, false);

  const [income, deductions, cme, credentials, quarters] = await Promise.all([
    supabase.from("income").select("*").eq("user_id", userId),
    supabase.from("deductions").select("*").eq("user_id", userId),
    supabase.from("cme").select("*").eq("user_id", userId),
    supabase.from("credentials").select("*").eq("user_id", userId),
    supabase
      .from("quarter_payments")
      .select("*")
      .eq("user_id", userId)
      .eq("year", taxYear()),
  ]);

  const mappedIncome: Income[] = (income.data ?? [])
    .map((r) => ({
      id: r.id,
      date: r.date,
      amount: Number(r.amount),
      source: r.source ?? "",
      note: r.note ?? "",
    }))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const mappedDeductions: Deduction[] = (deductions.data ?? [])
    .map((r) => ({
      id: r.id,
      date: r.date,
      amount: Number(r.amount),
      category: r.category ?? "Other",
      note: r.note ?? "",
      receipt: toFileRef(r.receipt as FileCol),
      k401: !!r.k401,
      edited: !!r.edited,
    }))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const mappedCme: Cme[] = (cme.data ?? [])
    .map((r) => ({
      id: r.id,
      date: r.date,
      activity: r.activity ?? "",
      hours: Number(r.hours),
      cost: Number(r.cost),
      receipt: toFileRef(r.receipt as FileCol),
    }))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const mappedCreds: Credential[] = (credentials.data ?? [])
    .map((r) => ({
      id: r.id,
      type: r.type ?? "",
      label: r.label ?? "",
      issue: r.issue ?? "",
      exp: r.exp,
      number: r.number ?? "",
      note: r.note ?? "",
      doc: toFileRef(r.doc as FileCol),
    }))
    .sort((a, b) => (b.exp || "").localeCompare(a.exp || ""));

  const qPaid: Record<string, number> = {};
  for (const q of quarters.data ?? []) qPaid[q.quarter] = Number(q.amount);

  return {
    settings,
    income: mappedIncome,
    deductions: mappedDeductions,
    cme: mappedCme,
    credentials: mappedCreds,
    qPaid,
  };
}

async function seedUser(supabase: SupabaseClient, userId: string) {
  const { data: created } = await supabase
    .from("settings")
    .insert({ user_id: userId, ...SEED_SETTINGS, seeded: true })
    .select("*")
    .single();

  await supabase
    .from("income")
    .insert(SEED_INCOME.map((r) => ({ user_id: userId, ...r })));

  await supabase.from("deductions").insert(
    SEED_DEDUCTIONS.map(({ onFile, ...r }) => ({
      user_id: userId,
      ...r,
      receipt: onFile ? { onFile: true } : null,
    }))
  );

  await supabase.from("cme").insert(
    SEED_CME.map(({ onFile, ...r }) => ({
      user_id: userId,
      ...r,
      receipt: onFile ? { onFile: true } : null,
    }))
  );

  await supabase.from("credentials").insert(
    SEED_CREDENTIALS.map(({ onFile, ...r }) => ({
      user_id: userId,
      ...r,
      doc: onFile ? { onFile: true } : null,
    }))
  );

  await supabase.from("quarter_payments").insert(
    SEED_QUARTER_PAYMENTS.map((q) => ({
      user_id: userId,
      year: taxYear(),
      quarter: q.quarter,
      amount: q.amount,
    }))
  );

  return created;
}

/**
 * Ensure a Solo 401(k) deduction row exists for each month Jan..current of the
 * current year. When `updateUnedited` is true, untouched monthly rows are reset
 * to the new default; edited rows keep their own amount.
 */
export async function sync401k(
  supabase: SupabaseClient,
  userId: string,
  monthly: number,
  updateUnedited: boolean
) {
  const now = new Date();
  const year = now.getFullYear();
  const upTo = now.getMonth(); // 0-based; include through current month

  // Match by flag OR category so a manually entered "Retirement — Solo 401(k)"
  // row counts as that month's contribution instead of getting a duplicate
  // auto row. (PostgREST .or() can't safely quote the parens in the category,
  // so filter client-side.)
  const { data: existing } = await supabase
    .from("deductions")
    .select("id, date, edited, k401, category")
    .eq("user_id", userId);

  const byMonth = new Map<string, { id: string; edited: boolean }>();
  for (const e of existing ?? []) {
    if (!isK401(e as { k401?: boolean; category?: string })) continue;
    byMonth.set(String(e.date).slice(0, 7), { id: e.id, edited: !!e.edited });
  }

  const toInsert: Record<string, unknown>[] = [];
  const toUpdate: string[] = [];
  for (let m = 0; m <= upTo; m++) {
    const ym = `${year}-${String(m + 1).padStart(2, "0")}`;
    const found = byMonth.get(ym);
    if (!found) {
      toInsert.push({
        user_id: userId,
        date: `${ym}-15`,
        amount: monthly,
        category: "Retirement — Solo 401(k)",
        note: "Monthly contribution",
        receipt: null,
        k401: true,
        edited: false,
      });
    } else if (updateUnedited && !found.edited) {
      toUpdate.push(found.id);
    }
  }

  if (toInsert.length) await supabase.from("deductions").insert(toInsert);
  if (toUpdate.length)
    await supabase
      .from("deductions")
      .update({ amount: monthly })
      .in("id", toUpdate);
}
