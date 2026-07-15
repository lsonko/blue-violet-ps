"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./client";
import type {
  Credential,
  Deduction,
  Cme,
  FileRef,
  Income,
  Settings,
} from "../types";
import { isK401 } from "../tax";

const BUCKET = "documents";

function fileCol(v: FileRef | boolean | null | undefined) {
  if (!v) return null;
  if (typeof v === "object") return v; // real FileRef
  return { onFile: true }; // truthy boolean → "on file" marker
}

/** Thin client-side wrapper over Supabase for the authenticated app's CRUD. */
export class Repo {
  supabase: SupabaseClient;
  userId: string;

  constructor(userId: string) {
    this.supabase = createClient();
    this.userId = userId;
  }

  // ---- settings ----
  async updateSettings(patch: Partial<Settings>) {
    const map: Record<string, unknown> = {};
    if (patch.filingStatus !== undefined) map.filing_status = patch.filingStatus;
    if (patch.cmeTarget !== undefined) map.cme_target = patch.cmeTarget;
    if (patch.cycleEnds !== undefined) map.cycle_ends = patch.cycleEnds;
    if (patch.solo401kMonthly !== undefined)
      map.solo401k_monthly = patch.solo401kMonthly;
    if (patch.physicianName !== undefined)
      map.physician_name = patch.physicianName;
    if (patch.spouseWages !== undefined) map.spouse_wages = patch.spouseWages;
    if (patch.spouseFedWithheld !== undefined)
      map.spouse_fed_withheld = patch.spouseFedWithheld;
    if (patch.spouseStateWithheld !== undefined)
      map.spouse_state_withheld = patch.spouseStateWithheld;
    if (patch.otherWithheld !== undefined)
      map.other_withheld = patch.otherWithheld;
    map.updated_at = new Date().toISOString();
    await this.supabase.from("settings").update(map).eq("user_id", this.userId);
  }

  // ---- income ----
  async saveIncome(rec: Partial<Income> & { id?: string }) {
    const row = {
      date: rec.date,
      amount: rec.amount ?? 0,
      source: rec.source ?? "",
      note: rec.note ?? "",
    };
    if (rec.id) {
      await this.supabase.from("income").update(row).eq("id", rec.id);
      return rec.id;
    }
    const { data } = await this.supabase
      .from("income")
      .insert({ user_id: this.userId, ...row })
      .select("id")
      .single();
    return data!.id as string;
  }

  // ---- deductions ----
  async saveDeduction(rec: Partial<Deduction> & { id?: string }) {
    const row: Record<string, unknown> = {
      date: rec.date,
      amount: rec.amount ?? 0,
      category: rec.category ?? "Other",
      note: rec.note ?? "",
      receipt: fileCol(rec.receipt),
    };
    // A row saved through this path with the 401(k) flag OR category is a
    // Solo 401(k) contribution the user touched — flag it and mark it edited
    // so the monthly auto-sync neither duplicates nor overwrites it.
    if (isK401(rec)) {
      row.k401 = true;
      row.edited = true;
    }
    if (rec.id) {
      await this.supabase.from("deductions").update(row).eq("id", rec.id);
      return rec.id;
    }
    const { data } = await this.supabase
      .from("deductions")
      .insert({ user_id: this.userId, ...row })
      .select("id")
      .single();
    return data!.id as string;
  }

  /** Amount-only update for auto 401(k) rows — leaves k401/edited untouched. */
  async updateDeductionAmount(id: string, amount: number) {
    await this.supabase.from("deductions").update({ amount }).eq("id", id);
  }

  // ---- cme ----
  async saveCme(rec: Partial<Cme> & { id?: string }) {
    const row = {
      date: rec.date,
      activity: rec.activity ?? "",
      hours: rec.hours ?? 0,
      cost: rec.cost ?? 0,
      receipt: fileCol(rec.receipt),
    };
    if (rec.id) {
      await this.supabase.from("cme").update(row).eq("id", rec.id);
      return rec.id;
    }
    const { data } = await this.supabase
      .from("cme")
      .insert({ user_id: this.userId, ...row })
      .select("id")
      .single();
    return data!.id as string;
  }

  // ---- credentials ----
  async saveCredential(rec: Partial<Credential> & { id?: string }) {
    const row = {
      type: rec.type ?? "",
      label: rec.label ?? "",
      issue: rec.issue || null,
      exp: rec.exp,
      number: rec.number ?? "",
      note: rec.note ?? "",
      doc: fileCol(rec.doc),
    };
    if (rec.id) {
      await this.supabase.from("credentials").update(row).eq("id", rec.id);
      return rec.id;
    }
    const { data } = await this.supabase
      .from("credentials")
      .insert({ user_id: this.userId, ...row })
      .select("id")
      .single();
    return data!.id as string;
  }

  async remove(table: "income" | "deductions" | "cme" | "credentials", id: string) {
    await this.supabase.from(table).delete().eq("id", id);
  }

  // ---- quarterly ----
  async setQuarterPaid(year: number, quarter: string, amount: number) {
    await this.supabase.from("quarter_payments").upsert(
      {
        user_id: this.userId,
        year,
        quarter,
        amount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,year,quarter" }
    );
  }

  // ---- storage ----
  async uploadFile(file: File, folder: string): Promise<FileRef> {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const path = `${this.userId}/${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return { path, name: file.name, type: file.type, size: file.size };
  }

  async signedUrl(path: string): Promise<string | null> {
    const { data } = await this.supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 10);
    return data?.signedUrl ?? null;
  }

  async signOut() {
    await this.supabase.auth.signOut();
  }

  async updatePassword(newPassword: string) {
    return this.supabase.auth.updateUser({ password: newPassword });
  }
}
