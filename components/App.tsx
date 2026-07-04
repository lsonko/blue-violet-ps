"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Repo } from "@/lib/supabase/repo";
import { logo, ic, iconFor } from "./ui";
import { fmt, fmt2, fdate } from "@/lib/format";
import {
  calc,
  FED,
  NJ_S,
  NJ_M,
  SS_WAGE_BASE,
  MEDICARE_ADDL,
  quartersForYear,
  daysUntil,
  today,
  taxYear,
} from "@/lib/tax";
import type {
  AppData,
  Cme,
  Credential,
  Deduction,
  FileRef,
  Income,
  Settings,
} from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const YEAR = taxYear();
const QUARTERS = quartersForYear(YEAR);

type AnyRec = Record<string, any>;

interface AppProps {
  initialData: AppData;
  userId: string;
  userEmail: string;
  router: ReturnType<typeof useRouter>;
}

interface AppState {
  route: string;
  modal: AnyRec | null;
  form: AnyRec;
  vw: number;
  drawer: boolean;
  viewer: (FileRef & { url: string }) | null;
  settings: Settings;
  income: Income[];
  deductions: Deduction[];
  cme: Cme[];
  credentials: Credential[];
  qPaid: Record<string, number>;
  accountEmail: string;
  pwForm: { current: string; next: string; confirm: string; err: string | null; msg: string | null };
}

class AppInner extends React.Component<AppProps, AppState> {
  repo: Repo;
  previews: Record<string, string> = {};
  _onResize?: () => void;
  palette = "periwinkle";
  nav = "sidebar";
  layout = "cards";

  constructor(props: AppProps) {
    super(props);
    const d = props.initialData;
    this.repo = new Repo(props.userId);
    this.state = {
      route: "dashboard",
      modal: null,
      form: {},
      vw: 1200,
      drawer: false,
      viewer: null,
      settings: d.settings,
      income: d.income,
      deductions: d.deductions,
      cme: d.cme,
      credentials: d.credentials,
      qPaid: d.qPaid,
      accountEmail: props.userEmail,
      pwForm: { current: "", next: "", confirm: "", err: null, msg: null },
    };
  }

  componentDidMount() {
    this._onResize = () => {
      const w = window.innerWidth;
      if (w !== this.state.vw) this.setState({ vw: w });
    };
    window.addEventListener("resize", this._onResize);
    this._onResize();
  }
  componentWillUnmount() {
    if (this._onResize) window.removeEventListener("resize", this._onResize);
  }
  isMobile() {
    const w = this.state.vw || (typeof window !== "undefined" ? window.innerWidth : 1200);
    return w < 760;
  }

  appData(): AppData {
    const s = this.state;
    return {
      settings: s.settings,
      income: s.income,
      deductions: s.deductions,
      cme: s.cme,
      credentials: s.credentials,
      qPaid: s.qPaid,
    };
  }
  calc() {
    return calc(this.appData());
  }

  fmt = fmt;
  fmt2 = fmt2;
  fdate = fdate;

  credData() {
    return this.state.credentials
      .map((c) => ({ ...c, days: daysUntil(c.exp) }))
      .sort((a, b) => a.days - b.days);
  }

  logo = logo;
  ic = ic;
  iconFor = iconFor;

  navList() {
    return [
      { key: "dashboard", label: "Dashboard" },
      { key: "income", label: "Income" },
      { key: "deductions", label: "Deductions" },
      { key: "cme", label: "CME" },
      { key: "credentials", label: "Credentials" },
      { key: "settings", label: "Settings" },
    ];
  }

  buildSideNav() {
    return React.createElement(
      "nav",
      { style: { display: "flex", flexDirection: "column", gap: "2px" } },
      this.navList().map((it) => {
        const on = this.state.route === it.key;
        return React.createElement(
          "button",
          {
            key: it.key,
            className: "navi",
            "data-on": on ? "1" : "0",
            onClick: () => this.go(it.key),
            style: { display: "flex", alignItems: "center", gap: "11px", padding: "10px 11px", border: "none", background: on ? "var(--psoft)" : "transparent", color: on ? "var(--pdark)" : "var(--soft)", borderRadius: "10px", fontSize: "13.5px", fontWeight: on ? 600 : 500, textAlign: "left", width: "100%", transition: "background .15s" },
          },
          React.createElement("span", { style: { display: "flex", color: on ? "var(--primary)" : "var(--muted)" } }, this.iconFor(it.key)),
          it.label
        );
      })
    );
  }
  buildTopNav() {
    return React.createElement(
      "nav",
      { style: { display: "flex", gap: "4px", alignItems: "center" } },
      this.navList().map((it) => {
        const on = this.state.route === it.key;
        return React.createElement(
          "button",
          { key: it.key, onClick: () => this.go(it.key), style: { display: "flex", alignItems: "center", gap: "8px", padding: "8px 13px", border: "none", background: on ? "var(--psoft)" : "transparent", color: on ? "var(--pdark)" : "var(--soft)", borderRadius: "9px", fontSize: "13.5px", fontWeight: on ? 600 : 500 } },
          React.createElement("span", { style: { display: "flex", color: on ? "var(--primary)" : "var(--muted)" } }, this.iconFor(it.key)),
          it.label
        );
      })
    );
  }

  go(r: string) {
    this.setState({ route: r, drawer: false });
    const m = document.querySelector("main.bvscroll");
    if (m) m.scrollTop = 0;
  }
  openDrawer() {
    this.setState({ drawer: true });
  }
  closeDrawer() {
    this.setState({ drawer: false });
  }

  // ---- file handling (real Supabase Storage) ----
  async readFileTo(k: string, file: File | undefined) {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    this.setField("_" + k + "Preview", preview);
    this.setField("_" + k + "Uploading", true);
    const folder = k === "doc" ? "documents" : "receipts";
    try {
      const ref = await this.repo.uploadFile(file, folder);
      this.previews[ref.path] = preview;
      this.setField(k, ref);
    } catch {
      this.setField("_" + k + "Error", "Upload failed");
    } finally {
      this.setField("_" + k + "Uploading", false);
    }
  }
  async openViewer(fileObj: any) {
    if (fileObj && typeof fileObj === "object" && fileObj.path) {
      const url = this.previews[fileObj.path] || (await this.repo.signedUrl(fileObj.path));
      if (url) this.setState({ viewer: { ...fileObj, url } });
    }
  }
  closeViewer() {
    this.setState({ viewer: null });
  }
  buildViewer() {
    const h = React.createElement;
    const v = this.state.viewer;
    if (!v) return null;
    const isPdf = (v.type || "").includes("pdf") || /\.pdf$/i.test(v.name || "");
    const media = isPdf
      ? h("iframe", { src: v.url, title: v.name, style: { width: "min(880px,92vw)", height: "80vh", border: "none", borderRadius: "12px", background: "#fff" } })
      : h("img", { src: v.url, alt: v.name, style: { maxWidth: "92vw", maxHeight: "78vh", borderRadius: "12px", objectFit: "contain", boxShadow: "0 20px 60px -20px rgba(0,0,0,.6)" } });
    return h(
      "div",
      { onClick: (e: any) => e.stopPropagation(), style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", maxWidth: "100%" } },
      h(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "12px", color: "#fff", maxWidth: "92vw" } },
        h("span", { style: { fontSize: "13.5px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, v.name || "Document"),
        h("a", { href: v.url, download: v.name || "document", style: { color: "#fff", opacity: 0.9, textDecoration: "none", fontSize: "12.5px", border: "1px solid rgba(255,255,255,.4)", borderRadius: "8px", padding: "5px 11px" } }, "Download"),
        h("button", { onClick: () => this.closeViewer(), style: { border: "1px solid rgba(255,255,255,.4)", background: "transparent", color: "#fff", borderRadius: "8px", padding: "5px 11px", fontSize: "12.5px", cursor: "pointer" } }, "Close")
      ),
      media
    );
  }

  // ---- account & security ----
  async signOut() {
    await this.repo.signOut();
    this.props.router.push("/login");
    this.props.router.refresh();
  }
  setPwField(k: string, v: string) {
    this.setState((s) => ({ pwForm: { ...s.pwForm, [k]: v, err: null, msg: null } }));
  }
  async changePassword() {
    const p = this.state.pwForm;
    if (!p.next || p.next.length < 6) {
      this.setState((s) => ({ pwForm: { ...s.pwForm, err: "New password must be at least 6 characters.", msg: null } }));
      return;
    }
    if (p.next !== p.confirm) {
      this.setState((s) => ({ pwForm: { ...s.pwForm, err: "New passwords do not match.", msg: null } }));
      return;
    }
    const { error } = await this.repo.updatePassword(p.next);
    if (error) {
      this.setState((s) => ({ pwForm: { ...s.pwForm, err: error.message, msg: null } }));
    } else {
      this.setState({ pwForm: { current: "", next: "", confirm: "", err: null, msg: "Password updated successfully." } });
    }
  }

  openModal(type: string, editId?: string | null) {
    let form: AnyRec = {};
    if (editId) {
      const list = (this.state as any)[type] as AnyRec[];
      const rec = list.find((x) => x.id === editId);
      form = { ...rec };
    } else {
      const t = new Date().toISOString().slice(0, 10);
      if (type === "income") form = { date: t, amount: "", source: "", note: "" };
      if (type === "deductions") form = { date: t, amount: "", category: "Medical equipment & supplies", note: "", receipt: null };
      if (type === "cme") form = { date: t, activity: "", hours: "", cost: "", receipt: null };
      if (type === "credentials") form = { type: "NJ medical license", label: "", issue: "", exp: "", number: "", note: "", doc: null };
    }
    this.setState({ modal: { type, editId: editId || null }, form });
  }
  openQPay(q: string) {
    this.setState((s) => ({ modal: { type: "qpay", q }, form: { amount: (s.qPaid && s.qPaid[q]) || "" } }));
  }
  closeModal() {
    this.setState({ modal: null });
  }
  setField(k: string, v: any) {
    this.setState((s) => ({ form: { ...s.form, [k]: v } }));
  }

  async saveRecord() {
    const modal = this.state.modal!;
    const { type, editId } = modal;
    const f = this.state.form;

    if (type === "qpay") {
      const q = modal.q as string;
      const amt = parseFloat(f.amount) || 0;
      this.setState((s) => ({ qPaid: { ...s.qPaid, [q]: amt }, modal: null }));
      await this.repo.setQuarterPaid(YEAR, q, amt);
      return;
    }

    const rec: AnyRec = {};
    for (const k of Object.keys(f)) if (!k.startsWith("_")) rec[k] = f[k];
    if ("amount" in rec) rec.amount = parseFloat(rec.amount) || 0;
    if ("cost" in rec) rec.cost = parseFloat(rec.cost) || 0;
    if ("hours" in rec) rec.hours = parseFloat(rec.hours) || 0;
    if (rec.k401) rec.edited = true;

    // Persist, then reflect in local state.
    let id = editId as string | null;
    if (type === "income") id = await this.repo.saveIncome({ ...rec, id: editId || undefined });
    if (type === "deductions") id = await this.repo.saveDeduction({ ...rec, id: editId || undefined });
    if (type === "cme") id = await this.repo.saveCme({ ...rec, id: editId || undefined });
    if (type === "credentials") id = await this.repo.saveCredential({ ...rec, id: editId || undefined });
    rec.id = id;

    this.setState((s) => {
      const list = ((s as any)[type] as AnyRec[]).slice();
      if (editId) {
        const i = list.findIndex((x) => x.id === editId);
        list[i] = { ...list[i], ...rec };
      } else {
        list.unshift(rec);
      }
      list.sort((a, b) => (b.date || b.exp || "").localeCompare(a.date || a.exp || ""));
      return { [type]: list, modal: null } as any;
    });
  }

  async deleteRecord(type: "income" | "deductions" | "cme" | "credentials", id: string) {
    this.setState((s) => ({ [type]: ((s as any)[type] as AnyRec[]).filter((x) => x.id !== id) } as any));
    await this.repo.remove(type, id);
  }

  setSetting(k: keyof Settings, v: any) {
    this.setState((s) => ({ settings: { ...s.settings, [k]: v } }));
    this.repo.updateSettings({ [k]: v } as Partial<Settings>);
  }
  setAccountEmail(v: string) {
    this.setState({ accountEmail: v });
    this.repo.supabase.auth.updateUser({ email: v });
  }

  async set401k(v: string) {
    const val = parseInt(v) || 0;
    this.setState((s) => ({ settings: { ...s.settings, solo401kMonthly: val } }));
    this.repo.updateSettings({ solo401kMonthly: val });
    // Update untouched monthly rows to the new default, in state + storage.
    const updates: string[] = [];
    this.setState((s) => {
      const list = s.deductions.map((d) => {
        if (d.k401 && !d.edited) {
          updates.push(d.id);
          return { ...d, amount: val };
        }
        return d;
      });
      return { deductions: list };
    });
    for (const id of updates) await this.repo.saveDeduction({ id, k401: false, amount: val, category: "Retirement — Solo 401(k)", date: undefined } as any);
  }

  card(children: any, extra?: AnyRec) {
    const h = React.createElement;
    const { onClick, ...styleExtra } = extra || {};
    const kids = Array.isArray(children) ? children : [children];
    return h("div", { onClick, style: Object.assign({ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "22px 24px" }, styleExtra) }, ...kids);
  }
  addBtn(label: string, type: string) {
    const h = React.createElement;
    return h("button", { onClick: () => this.openModal(type), style: { display: "flex", alignItems: "center", gap: "7px", padding: "10px 16px", border: "none", borderRadius: "10px", background: "var(--primary)", color: "#fff", fontWeight: 600, fontSize: "13.5px", boxShadow: "0 6px 16px -8px var(--primary)" } }, h("span", { style: { fontSize: "17px", lineHeight: 1, marginTop: "-1px" } }, "+"), label);
  }
  pageHead(title: string, sub?: string, btnLabel?: string, btnType?: string, right?: any) {
    const h = React.createElement;
    return h(
      "div",
      { style: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px", marginBottom: "24px", flexWrap: "wrap" } },
      h("div", {}, h("h1", { style: { margin: 0, fontFamily: "var(--serif)", fontWeight: 400, fontSize: "28px", letterSpacing: "-.4px" } }, title), sub && h("p", { style: { margin: "7px 0 0", color: "var(--soft)", fontSize: "14px" } }, sub)),
      right || (btnLabel && this.addBtn(btnLabel, btnType!))
    );
  }
  daysBadge(days: number) {
    const h = React.createElement;
    const urgent = days <= 30,
      warn = days <= 90;
    const bg = urgent ? "var(--warnbg)" : warn ? "var(--warnbg)" : "var(--surface2)",
      fg = urgent ? "var(--warn)" : warn ? "var(--warn)" : "var(--soft)";
    const txt = days < 0 ? Math.abs(days) + "d overdue" : days + " days";
    return h("span", { style: { display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "20px", background: bg, color: fg, fontSize: "12px", fontWeight: 600, fontVariantNumeric: "tabular-nums" } }, urgent && h("span", { style: { width: "6px", height: "6px", borderRadius: "50%", background: "currentColor" } }), txt);
  }
  fileCell(v: any) {
    const h = React.createElement;
    const chk = this.ic(["M9 12l2 2 4-4", "M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"], { width: 16, height: 16 });
    if (v && typeof v === "object" && v.path)
      return h("button", { onClick: () => this.openViewer(v), title: "View " + (v.name || "file"), style: { border: "none", background: "transparent", cursor: "pointer", display: "inline-flex", color: "var(--good)", padding: "2px" } }, chk);
    if (v) return h("span", { style: { display: "inline-flex", color: "var(--good)" } }, chk);
    return h("span", { style: { color: "var(--muted)", fontSize: "12px" } }, "—");
  }
  rowActions(type: any, id: string) {
    const h = React.createElement;
    const b = { border: "1px solid var(--border)", background: "var(--surface)", borderRadius: "8px", padding: "6px", display: "flex", color: "var(--muted)" };
    return h(
      "div",
      { style: { display: "flex", gap: "6px", justifyContent: "flex-end" } },
      h("button", { title: "Edit", onClick: () => this.openModal(type, id), style: b }, this.ic(["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"], { width: 14, height: 14 })),
      h("button", { title: "Delete", onClick: () => this.deleteRecord(type, id), style: b }, this.ic(["M3 6h18", "M8 6V4h8v2", "M6 6l1 14h10l1-14"], { width: 14, height: 14 }))
    );
  }

  buildScreen() {
    const r = this.state.route;
    if (r === "dashboard") return this.vDashboard();
    if (r === "income") return this.vIncome();
    if (r === "deductions") return this.vDeductions();
    if (r === "cme") return this.vCme();
    if (r === "credentials") return this.vCredentials();
    if (r === "settings") return this.vSettings();
    return null;
  }

  todayLabel() {
    const d = today();
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) + " · Tax year " + YEAR;
  }
  cycleEndLabel() {
    const ce = this.state.settings.cycleEnds;
    if (!ce) return "";
    return new Date(ce + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  // ---------- DASHBOARD ----------
  vDashboard() {
    const h = React.createElement,
      c = this.calc(),
      cred = this.credData();
    const upcoming = cred.filter((x) => x.days <= 90);
    const cmeHours = this.state.cme.reduce((a, b) => a + b.hours, 0),
      target = this.state.settings.cmeTarget;
    const layout = this.layout;
    const head = this.pageHead("Dashboard", this.todayLabel(), "Add income", "income");

    const taxCard = this.card(
      [
        h("div", { key: "t1", style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between" } }, h("div", { style: { fontSize: "12.5px", fontWeight: 600, color: "var(--pdark)", letterSpacing: ".3px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" } }, h("span", { style: { width: "9px", height: "9px", borderRadius: "3px", background: "var(--primary)" } }), "Estimated tax to set aside"), h("span", { style: { fontSize: "12px", color: "var(--muted)" } }, Math.round(c.effRate * 100) + "% of projected income")),
        h("div", { key: "t2", style: { fontFamily: "var(--serif)", fontWeight: 400, fontSize: "54px", letterSpacing: "-1.4px", lineHeight: 1.02, margin: "14px 0 4px", fontVariantNumeric: "tabular-nums" } }, this.fmt(c.total)),
        h("div", { key: "t3", style: { fontSize: "13px", color: "var(--soft)" } }, "projected full-year · " + this.fmt(c.ytdNet) + " YTD net × " + c.factor.toFixed(2) + " annualized" + (c.mfj ? " + " + this.fmt(c.spouseWages) + " spouse wages" : "")),
        h("div", { key: "t4", style: { display: "flex", gap: "18px", margin: "20px 0 4px", paddingTop: "18px", borderTop: "1px solid var(--line)" } }, this.taxLine("Self-employment", c.seTax, "var(--acc-ded)"), this.taxLine(c.mfj ? "Federal (your share)" : "Federal income", c.fedTax, "var(--acc-inc)"), this.taxLine(c.mfj ? "NJ (your share)" : "NJ state income", c.stateTax, "var(--acc-cme)")),
        this.quarterStrip(c),
        h("div", { key: "t6", style: { marginTop: "16px", fontSize: "11.5px", color: "var(--muted)", lineHeight: 1.5, display: "flex", gap: "8px" } }, this.ic(["M12 9v4", "M12 17h.01", "M10.3 3.9l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0z"], { width: 14, height: 14, stroke: "var(--muted)" }), h("span", {}, (c.mfj ? "Filed jointly: spouse wages are taxed alongside your business income and their withholding is subtracted. " : "") + "Projected by annualizing your YTD actuals — the number firms up as the year fills in. A planning estimate, not a filed return; QBI excluded.")),
      ],
      { borderColor: "color-mix(in srgb, var(--primary) 22%, var(--border))", background: "linear-gradient(180deg, color-mix(in srgb, var(--primary) 5%, var(--surface)), var(--surface))" }
    );

    const incCard = this.miniStat("var(--acc-inc)", "YTD income", this.fmt(c.ytd), this.state.income.length + " payments logged", () => this.go("income"));
    const dedCard = this.miniStat("var(--acc-ded)", "Deductions YTD", this.fmt(c.totalDed), "incl. " + this.fmt(c.cmeCost) + " CME · " + this.fmt(c.k401) + " 401(k)", () => this.go("deductions"));
    const k401Card = this.miniStat("var(--acc-cred)", "Solo 401(k) contributed", this.fmt(c.k401), this.fmt(this.state.settings.solo401kMonthly) + "/mo · auto to deductions", () => this.go("deductions"));
    const cmeCard = this.cmeCard(cmeHours, target, c.cmeCost);
    const deadCard = this.deadlinesCard(upcoming);

    if (this.isMobile()) {
      return h("div", { style: { animation: "bvFade .4s ease both" } }, head, h("div", { style: { display: "flex", flexDirection: "column", gap: "16px" } }, taxCard, incCard, dedCard, k401Card, cmeCard, deadCard));
    }
    if (layout === "split") {
      return h("div", { style: { animation: "bvFade .4s ease both" } }, head, h("div", { style: { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "18px", alignItems: "start" } }, taxCard, h("div", { style: { display: "flex", flexDirection: "column", gap: "18px" } }, incCard, dedCard, k401Card, cmeCard, deadCard)));
    }
    return h("div", { style: { animation: "bvFade .4s ease both" } }, head, h("div", { style: { display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "18px", alignItems: "start", marginBottom: "18px" } }, taxCard, h("div", { style: { display: "flex", flexDirection: "column", gap: "18px" } }, incCard, dedCard, k401Card)), h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", alignItems: "start" } }, cmeCard, deadCard));
  }
  taxLine(label: string, val: number, color: string) {
    const h = React.createElement;
    return h("div", { style: { flex: 1 } }, h("div", { style: { fontSize: "11.5px", color: "var(--muted)", marginBottom: "5px" } }, label), h("div", { style: { fontSize: "18px", fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "var(--text)" } }, this.fmt(val)), h("div", { style: { height: "3px", borderRadius: "2px", marginTop: "7px", background: color, opacity: 0.85 } }));
  }
  quarterStrip(c: any) {
    const h = React.createElement;
    const qPaid = this.state.qPaid || {};
    let nextFound = false;
    const cells = QUARTERS.map((x) => {
      const past = daysUntil(x.d) < 0;
      const isNext = !past && !nextFound;
      if (isNext) nextFound = true;
      const paid = qPaid[x.q] || 0;
      const funded = past && paid >= c.reqPer * 0.98;
      const short = past && !funded;
      const tagColor = isNext ? "var(--pdark)" : funded ? "var(--good)" : short ? "var(--warn)" : "var(--muted)";
      return h(
        "button",
        { key: x.q, onClick: () => this.openQPay(x.q), title: "Log what you set aside for " + x.q, style: { textAlign: "left", fontFamily: "inherit", padding: "11px 12px", borderRadius: "11px", cursor: "pointer", background: isNext ? "var(--psoft)" : "var(--surface2)", border: isNext ? "1px solid color-mix(in srgb,var(--primary) 30%,transparent)" : short ? "1px solid color-mix(in srgb,var(--warn) 35%,transparent)" : "1px solid transparent" } },
        h("div", { style: { fontSize: "11px", color: tagColor, fontWeight: 600, display: "flex", justifyContent: "space-between", gap: "4px" } }, x.q, isNext ? "next" : funded ? "✓ set aside" : short ? (paid > 0 ? "short" : "not logged") : ""),
        h("div", { style: { fontSize: "15.5px", fontWeight: 600, fontVariantNumeric: "tabular-nums", margin: "4px 0 2px", color: past ? (funded ? "var(--text)" : "var(--warn)") : "var(--text)" } }, past ? this.fmt(paid) : this.fmt(c.perRemaining)),
        h("div", { style: { fontSize: "10.5px", color: "var(--muted)" } }, past ? "of " + this.fmt(c.reqPer) + " · " + this.fdate(x.d) : this.fdate(x.d))
      );
    });
    const sf = c.shortfall;
    const status =
      Math.abs(sf) < 1
        ? { icon: ["M20 6L9 17l-5-5"], color: "var(--good)", msg: "On plan — each remaining deadline needs " + this.fmt(c.perRemaining) + " (25% of the projected year)." }
        : sf > 0
        ? { icon: ["M12 9v4", "M12 17h.01", "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"], color: "var(--warn)", msg: "You are " + this.fmt(sf) + " behind plan from elapsed quarters — that catch-up is spread across the " + c.remainingQ + " remaining deadline" + (c.remainingQ === 1 ? "" : "s") + " on top of the level " + this.fmt(c.reqPer) + " installment." }
        : { icon: ["M20 6L9 17l-5-5"], color: "var(--good)", msg: "You are " + this.fmt(-sf) + " ahead of plan — remaining installments are reduced below the level " + this.fmt(c.reqPer) + "." };
    return h(
      "div",
      {},
      h("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px", marginTop: "18px" } }, cells),
      h("div", { style: { fontSize: "11px", color: status.color, marginTop: "9px", display: "flex", gap: "7px", alignItems: "flex-start", lineHeight: 1.45 } }, this.ic(status.icon, { width: 13, height: 13, stroke: status.color }), h("span", {}, status.msg + " Click a quarter to log what you actually set aside."))
    );
  }
  miniStat(accent: string, label: string, value: string, sub: string, onClick: () => void) {
    const h = React.createElement;
    return this.card(
      [
        h("div", { key: "a", style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" } }, h("div", { style: { display: "flex", alignItems: "center", gap: "9px" } }, h("span", { style: { width: "9px", height: "9px", borderRadius: "3px", background: accent } }), h("span", { style: { fontSize: "12.5px", fontWeight: 600, color: "var(--soft)" } }, label)), h("span", { style: { color: "var(--muted)", display: "flex" } }, this.ic(["M9 18l6-6-6-6"], { width: 15, height: 15 }))),
        h("div", { key: "b", style: { fontFamily: "var(--serif)", fontWeight: 400, fontSize: "33px", letterSpacing: "-.6px", lineHeight: 1, fontVariantNumeric: "tabular-nums" } }, value),
        sub && h("div", { key: "c", style: { marginTop: "9px", fontSize: "12.5px", color: "var(--muted)" } }, sub),
      ],
      { cursor: "pointer", onClick }
    );
  }
  cmeCard(hours: number, target: number, cost: number) {
    const h = React.createElement;
    const pct = Math.min(100, Math.round((hours / target) * 100)),
      rem = Math.max(0, target - hours);
    return this.card([
      h("div", { key: "a", style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" } }, h("div", { style: { display: "flex", alignItems: "center", gap: "9px" } }, h("span", { style: { width: "9px", height: "9px", borderRadius: "3px", background: "var(--acc-cme)" } }), h("span", { style: { fontSize: "12.5px", fontWeight: 600, color: "var(--soft)" } }, "CME progress")), h("span", { style: { fontSize: "12px", color: "var(--muted)" } }, "cycle ends " + this.cycleEndLabel())),
      h("div", { key: "b", style: { display: "flex", alignItems: "baseline", gap: "6px" } }, h("span", { style: { fontFamily: "var(--serif)", fontSize: "33px", fontVariantNumeric: "tabular-nums" } }, hours), h("span", { style: { fontSize: "15px", color: "var(--muted)" } }, "/ " + target + " credit hours")),
      h("div", { key: "c", style: { height: "9px", borderRadius: "6px", background: "var(--surface2)", margin: "14px 0 10px", overflow: "hidden" } }, h("div", { style: { width: pct + "%", height: "100%", borderRadius: "6px", background: "var(--acc-cme)", transformOrigin: "left", animation: "bvGrow .7s cubic-bezier(.3,.8,.3,1) both" } })),
      h("div", { key: "d", style: { display: "flex", justifyContent: "space-between", fontSize: "12.5px" } }, h("span", { style: { color: "var(--soft)" } }, rem + " credits remaining"), h("span", { style: { color: "var(--muted)" } }, this.fmt(cost) + " → deductions")),
    ]);
  }
  deadlinesCard(list: any[]) {
    const h = React.createElement;
    return this.card([
      h("div", { key: "h", style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" } }, h("div", { style: { display: "flex", alignItems: "center", gap: "9px" } }, h("span", { style: { width: "9px", height: "9px", borderRadius: "3px", background: "var(--acc-cred)" } }), h("span", { style: { fontSize: "12.5px", fontWeight: 600, color: "var(--soft)" } }, "Upcoming deadlines")), h("button", { onClick: () => this.go("credentials"), style: { border: "none", background: "transparent", color: "var(--primary)", fontSize: "12.5px", fontWeight: 600 } }, "View all")),
      h("div", { key: "b" }, list.length ? list.map((x, i) => h("div", { key: x.id, style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "13px 0", borderTop: i ? "1px solid var(--line)" : "none" } }, h("div", { style: { minWidth: 0 } }, h("div", { style: { fontSize: "13.5px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, x.type), h("div", { style: { fontSize: "11.5px", color: "var(--muted)" } }, this.fdate(x.exp))), this.daysBadge(x.days))) : h("div", { style: { padding: "18px 0", color: "var(--muted)", fontSize: "13px" } }, "Nothing due in the next 90 days.")),
    ]);
  }

  // ---------- shared table ----------
  tableCard(headers: any[], rows: any, footer?: any) {
    const h = React.createElement;
    const th = { textAlign: "left", fontSize: "11px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px", padding: "0 14px 13px" };
    return this.card(
      h("div", { className: "bvscroll", style: { overflowX: "auto", margin: "0 -12px", padding: "0 12px" } }, h("table", { style: { width: "100%", minWidth: this.isMobile() ? "640px" : "auto", borderCollapse: "collapse" } }, h("thead", {}, h("tr", {}, headers.map((hd, i) => h("th", { key: i, style: Object.assign({}, th, { textAlign: hd.align || "left", width: hd.w || "auto" }) }, hd.label)))), h("tbody", {}, rows), footer && h("tfoot", {}, footer))),
      { padding: "20px 12px" }
    );
  }
  td(content: any, align?: string) {
    const h = React.createElement;
    return h("td", { style: { padding: "15px 14px", borderTop: "1px solid var(--line)", fontSize: "14px", textAlign: align || "left", verticalAlign: "middle" } }, content);
  }

  // ---------- INCOME ----------
  vIncome() {
    const h = React.createElement;
    const list = this.state.income;
    const total = list.reduce((a, b) => a + b.amount, 0);
    const rows = list.map((x) => h("tr", { key: x.id }, this.td(h("span", { style: { color: "var(--soft)", fontVariantNumeric: "tabular-nums" } }, this.fdate(x.date))), this.td(h("span", { style: { fontWeight: 600 } }, x.source)), this.td(h("span", { style: { color: "var(--muted)" } }, x.note || "—")), this.td(h("span", { style: { fontWeight: 600, fontVariantNumeric: "tabular-nums" } }, this.fmt(x.amount)), "right"), this.td(this.rowActions("income", x.id), "right")));
    const foot = h("tr", {}, h("td", { colSpan: 3, style: { padding: "16px 14px 4px", fontSize: "13px", fontWeight: 600, color: "var(--soft)", borderTop: "2px solid var(--border)" } }, "Year-to-date total"), h("td", { style: { padding: "16px 14px 4px", textAlign: "right", fontWeight: 700, fontSize: "16px", fontVariantNumeric: "tabular-nums", borderTop: "2px solid var(--border)", color: "var(--acc-inc)" } }, this.fmt(total)), h("td", { style: { borderTop: "2px solid var(--border)" } }));
    return h("div", { style: { animation: "bvFade .4s ease both" } }, this.pageHead("Income", this.fmt(total) + " received across " + list.length + " payments this year", "Add income", "income"), this.tableCard([{ label: "Date", w: "18%" }, { label: "Source / payer", w: "28%" }, { label: "Note" }, { label: "Amount", align: "right", w: "15%" }, { label: "", align: "right", w: "12%" }], rows, foot));
  }

  // ---------- DEDUCTIONS ----------
  vDeductions() {
    const h = React.createElement;
    const list = this.state.deductions;
    const c = this.calc();
    const catColor = "var(--acc-ded)";
    const rows = list.map((x: any) => h("tr", { key: x.id }, this.td(h("span", { style: { color: "var(--soft)", fontVariantNumeric: "tabular-nums" } }, this.fdate(x.date))), this.td(h("span", { style: { display: "inline-flex", alignItems: "center", gap: "8px", fontWeight: 600 } }, h("span", { style: { width: "8px", height: "8px", borderRadius: "50%", background: x.k401 ? "var(--acc-cred)" : catColor } }), x.category, x.k401 && h("span", { style: { fontSize: "11px", fontWeight: 600, color: "var(--acc-cred)", background: "color-mix(in srgb,var(--acc-cred) 12%,#fff)", padding: "2px 7px", borderRadius: "20px" } }, "monthly auto"))), this.td(h("span", { style: { color: "var(--muted)" } }, x.note || "—")), this.td(this.fileCell(x.receipt), "center"), this.td(h("span", { style: { fontWeight: 600, fontVariantNumeric: "tabular-nums" } }, this.fmt(x.amount)), "right"), this.td(this.rowActions("deductions", x.id), "right")));
    const cmeRow = h("tr", { key: "cme-auto" }, this.td(h("span", { style: { color: "var(--muted)", fontVariantNumeric: "tabular-nums" } }, "auto")), this.td(h("span", { style: { display: "inline-flex", alignItems: "center", gap: "8px", fontWeight: 600 } }, h("span", { style: { width: "8px", height: "8px", borderRadius: "50%", background: "var(--acc-cme)" } }), "CME", h("span", { style: { fontSize: "11px", fontWeight: 600, color: "var(--acc-cme)", background: "color-mix(in srgb,var(--acc-cme) 12%,#fff)", padding: "2px 7px", borderRadius: "20px" } }, "from CME list"))), this.td(h("span", { style: { color: "var(--muted)" } }, this.state.cme.length + " activities")), this.td("—", "center"), this.td(h("span", { style: { fontWeight: 600, fontVariantNumeric: "tabular-nums" } }, this.fmt(c.cmeCost)), "right"), this.td("", "right"));
    const foot = h("tr", {}, h("td", { colSpan: 4, style: { padding: "16px 14px 4px", fontSize: "13px", fontWeight: 600, color: "var(--soft)", borderTop: "2px solid var(--border)" } }, "Total deductions YTD"), h("td", { style: { padding: "16px 14px 4px", textAlign: "right", fontWeight: 700, fontSize: "16px", fontVariantNumeric: "tabular-nums", borderTop: "2px solid var(--border)", color: "var(--acc-ded)" } }, this.fmt(c.totalDed)), h("td", { style: { borderTop: "2px solid var(--border)" } }));
    return h("div", { style: { animation: "bvFade .4s ease both" } }, this.pageHead("Deductions", this.fmt(c.totalDed) + " total · lowers your taxable income", "Add deduction", "deductions"), this.tableCard([{ label: "Date", w: "14%" }, { label: "Category", w: "32%" }, { label: "Note" }, { label: "Receipt", align: "center", w: "10%" }, { label: "Amount", align: "right", w: "13%" }, { label: "", align: "right", w: "10%" }], rows.concat([cmeRow]), foot));
  }

  // ---------- CME ----------
  vCme() {
    const h = React.createElement;
    const list = this.state.cme;
    const hours = list.reduce((a, b) => a + b.hours, 0),
      cost = list.reduce((a, b) => a + b.cost, 0),
      target = this.state.settings.cmeTarget;
    const pct = Math.min(100, Math.round((hours / target) * 100));
    const banner = this.card(h("div", { style: { display: "flex", alignItems: "center", gap: "24px" } }, h("div", { style: { flex: "0 0 auto" } }, h("div", { style: { display: "flex", alignItems: "baseline", gap: "6px" } }, h("span", { style: { fontFamily: "var(--serif)", fontSize: "30px" } }, hours), h("span", { style: { color: "var(--muted)", fontSize: "14px" } }, "/ " + target + " hrs")), h("div", { style: { fontSize: "12px", color: "var(--muted)" } }, Math.max(0, target - hours) + " remaining this cycle")), h("div", { style: { flex: 1 } }, h("div", { style: { height: "9px", borderRadius: "6px", background: "var(--surface2)", overflow: "hidden" } }, h("div", { style: { width: pct + "%", height: "100%", background: "var(--acc-cme)", borderRadius: "6px", transformOrigin: "left", animation: "bvGrow .7s ease both" } }))), h("div", { style: { flex: "0 0 auto", textAlign: "right" } }, h("div", { style: { fontSize: "12px", color: "var(--muted)" } }, "Feeds deductions"), h("div", { style: { fontWeight: 700, color: "var(--acc-cme)", fontVariantNumeric: "tabular-nums" } }, this.fmt(cost)))), { marginBottom: "18px", borderColor: "color-mix(in srgb,var(--acc-cme) 22%,var(--border))" });
    const rows = list.map((x: any) => h("tr", { key: x.id }, this.td(h("span", { style: { color: "var(--soft)", fontVariantNumeric: "tabular-nums" } }, this.fdate(x.date))), this.td(h("span", { style: { fontWeight: 600 } }, x.activity)), this.td(h("span", { style: { fontWeight: 600, fontVariantNumeric: "tabular-nums" } }, x.hours), "center"), this.td(h("span", { style: { fontVariantNumeric: "tabular-nums", color: x.cost ? "var(--text)" : "var(--muted)" } }, x.cost ? this.fmt(x.cost) : "Free"), "right"), this.td(this.fileCell(x.receipt), "center"), this.td(this.rowActions("cme", x.id), "right")));
    const foot = h("tr", {}, h("td", { colSpan: 2, style: { padding: "16px 14px 4px", fontSize: "13px", fontWeight: 600, color: "var(--soft)", borderTop: "2px solid var(--border)" } }, "Totals"), h("td", { style: { padding: "16px 14px 4px", textAlign: "center", fontWeight: 700, fontVariantNumeric: "tabular-nums", borderTop: "2px solid var(--border)", color: "var(--acc-cme)" } }, hours), h("td", { style: { padding: "16px 14px 4px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", borderTop: "2px solid var(--border)", color: "var(--acc-cme)" } }, this.fmt(cost)), h("td", { colSpan: 2, style: { borderTop: "2px solid var(--border)" } }));
    return h("div", { style: { animation: "bvFade .4s ease both" } }, this.pageHead("Continuing Medical Education", "Log a course once — it counts toward your license and your deductions", "Add CME", "cme"), banner, this.tableCard([{ label: "Date", w: "14%" }, { label: "Activity" }, { label: "Hours", align: "center", w: "10%" }, { label: "Cost", align: "right", w: "12%" }, { label: "Receipt", align: "center", w: "10%" }, { label: "", align: "right", w: "10%" }], rows, foot));
  }

  // ---------- CREDENTIALS ----------
  vCredentials() {
    const h = React.createElement;
    const list = this.credData();
    const cards = list.map((x: any) => {
      const warn = x.days <= 90;
      return h(
        "div",
        { key: x.id, style: { background: "var(--surface)", border: "1px solid " + (warn ? "color-mix(in srgb,var(--warn) 40%,var(--border))" : "var(--border)"), borderRadius: "16px", padding: "20px 22px", position: "relative", overflow: "hidden" } },
        warn && h("div", { style: { position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", background: "var(--warn)" } }),
        h("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" } }, h("div", { style: { minWidth: 0 } }, h("div", { style: { display: "flex", alignItems: "center", gap: "9px", marginBottom: "4px" } }, h("span", { style: { display: "flex", color: "var(--acc-cred)" } }, this.iconFor("credentials")), h("span", { style: { fontSize: "15px", fontWeight: 700 } }, x.type)), h("div", { style: { fontSize: "12.5px", color: "var(--muted)", marginLeft: "25px" } }, x.label)), this.rowActions("credentials", x.id)),
        h(
          "div",
          { style: { display: "flex", gap: "26px", margin: "18px 0 0", marginLeft: "25px" } },
          h("div", {}, h("div", { style: { fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px" } }, "Expires"), h("div", { style: { fontSize: "13.5px", fontWeight: 600, marginTop: "3px" } }, this.fdate(x.exp))),
          x.number && h("div", {}, h("div", { style: { fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px" } }, "Number"), h("div", { style: { fontSize: "13.5px", fontWeight: 600, marginTop: "3px", fontFamily: "ui-monospace,monospace" } }, x.number)),
          h("div", {}, h("div", { style: { fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px" } }, "Document"), x.doc && typeof x.doc === "object" && x.doc.path ? h("button", { onClick: () => this.openViewer(x.doc), style: { border: "none", background: "transparent", padding: 0, cursor: "pointer", fontSize: "12.5px", fontWeight: 600, marginTop: "4px", color: "var(--primary)", display: "flex", alignItems: "center", gap: "5px" } }, this.ic(["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6"], { width: 13, height: 13 }), "View") : h("div", { style: { fontSize: "12.5px", fontWeight: 600, marginTop: "4px", color: x.doc ? "var(--primary)" : "var(--muted)", display: "flex", alignItems: "center", gap: "5px" } }, this.ic(["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6"], { width: 13, height: 13 }), x.doc ? "On file" : "None")),
          h("div", { style: { marginLeft: "auto", alignSelf: "center" } }, this.daysBadge(x.days))
        ),
        x.type === "NJ medical license" && warn && h("div", { style: { marginTop: "16px", marginLeft: "25px", padding: "10px 13px", background: "var(--warnbg)", borderRadius: "10px", fontSize: "12.5px", color: "var(--warn)", fontWeight: 500, display: "flex", gap: "8px", alignItems: "center" } }, this.iconFor("cme", { stroke: "var(--warn)" }), "Renewal needs 100 CME credits — you are " + Math.max(0, this.state.settings.cmeTarget - this.state.cme.reduce((a, b) => a + b.hours, 0)) + " short.")
      );
    });
    return h("div", { style: { animation: "bvFade .4s ease both" } }, this.pageHead("Credentials & Licenses", "Anything within 90 days is flagged for lead time", "Add credential", "credentials"), h("div", { style: { display: "grid", gridTemplateColumns: this.isMobile() ? "1fr" : "1fr 1fr", gap: "18px" } }, cards));
  }

  // ---------- SETTINGS ----------
  vSettings() {
    const h = React.createElement;
    const s = this.state.settings;
    const field = (label: string, node: any) => h("div", { style: { marginBottom: "20px" } }, h("label", { style: { display: "block", fontSize: "12.5px", fontWeight: 600, color: "var(--soft)", marginBottom: "8px" } }, label), node);
    const seg = (opts: any[], val: any, onPick: (v: any) => void) => h("div", { style: { display: "inline-flex", background: "var(--surface2)", borderRadius: "11px", padding: "4px", gap: "4px" } }, opts.map((o) => h("button", { key: o.v, onClick: () => onPick(o.v), style: { border: "none", padding: "9px 18px", borderRadius: "8px", fontSize: "13.5px", fontWeight: 600, background: val === o.v ? "var(--surface)" : "transparent", color: val === o.v ? "var(--pdark)" : "var(--soft)", boxShadow: val === o.v ? "0 1px 4px rgba(40,30,80,.12)" : "none" } }, o.label)));

    // ---- Account & security card ----
    const p = this.state.pwForm;
    const tinp = (val: any, onCh: (v: string) => void, ph: string, type?: string) => h("input", { type: type || "text", value: val, placeholder: ph, onChange: (e: any) => onCh(e.target.value), style: { width: "100%", padding: "11px 14px", border: "1px solid var(--border)", borderRadius: "11px", fontSize: "14px", background: "var(--surface)", color: "var(--text)", outline: "none" } });
    const accountCard = this.card(
      [
        h("div", { key: "h", style: { display: "flex", alignItems: "center", gap: "9px", margin: "0 0 4px" } }, h("span", { style: { display: "flex", color: "var(--primary)" } }, this.ic(["M6 10V7a6 6 0 0 1 12 0v3", "M5 10h14v10H5z"], { width: 16, height: 16 })), h("h3", { style: { margin: 0, fontSize: "15px", fontWeight: 700 } }, "Account & security")),
        h("p", { key: "p", style: { margin: "0 0 20px", fontSize: "13px", color: "var(--muted)", lineHeight: 1.55 } }, "Your sign-in email and password. These are the credentials used on the login screen."),
        field("Email / username", tinp(this.state.accountEmail, (v) => this.setAccountEmail(v), "you@practice.com", "email")),
        h("div", { key: "d", style: { borderTop: "1px solid var(--line)", margin: "4px 0 20px" } }),
        h("div", { key: "cp", style: { fontSize: "13px", fontWeight: 700, marginBottom: "14px" } }, "Change password"),
        field("New password", tinp(p.next, (v) => this.setPwField("next", v), "At least 6 characters", "password")),
        field("Confirm new password", tinp(p.confirm, (v) => this.setPwField("confirm", v), "Re-enter new password", "password")),
        p.err && h("div", { key: "e", style: { display: "flex", alignItems: "center", gap: "8px", background: "var(--warnbg)", color: "var(--warn)", borderRadius: "10px", padding: "10px 12px", fontSize: "12.5px", fontWeight: 500, marginBottom: "14px" } }, this.ic(["M12 9v4", "M12 17h.01", "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"], { width: 15, height: 15, stroke: "var(--warn)" }), p.err),
        p.msg && h("div", { key: "m", style: { display: "flex", alignItems: "center", gap: "8px", background: "var(--goodbg)", color: "var(--good)", borderRadius: "10px", padding: "10px 12px", fontSize: "12.5px", fontWeight: 500, marginBottom: "14px" } }, this.ic(["M20 6L9 17l-5-5"], { width: 15, height: 15, stroke: "var(--good)" }), p.msg),
        h("div", { key: "b", style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" } }, h("button", { onClick: () => this.changePassword(), style: { padding: "11px 20px", border: "none", borderRadius: "10px", background: "var(--primary)", color: "#fff", fontWeight: 600, fontSize: "13.5px", boxShadow: "0 6px 16px -8px var(--primary)" } }, "Update password"), h("button", { onClick: () => this.signOut(), style: { display: "flex", alignItems: "center", gap: "8px", padding: "11px 16px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--surface)", color: "var(--soft)", fontWeight: 600, fontSize: "13.5px" } }, this.ic(["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"], { width: 15, height: 15 }), "Sign out")),
      ],
      { marginBottom: "18px" }
    );

    // ---- Tax profile card ----
    const taxProfile = this.card(
      [
        h("h3", { key: "h", style: { margin: "0 0 4px", fontSize: "15px", fontWeight: 700 } }, "Tax profile"),
        h("p", { key: "p", style: { margin: "0 0 22px", fontSize: "13px", color: "var(--muted)" } }, "Set once. Used for standard deduction and bracket lookups."),
        field("Physician name", h("input", { type: "text", value: s.physicianName, onChange: (e: any) => this.setSetting("physicianName", e.target.value), placeholder: "Dr. Jane Doe", style: { width: "100%", maxWidth: "340px", padding: "11px 14px", border: "1px solid var(--border)", borderRadius: "11px", fontSize: "14px", background: "var(--surface)", color: "var(--text)", outline: "none" } })),
        field("Filing status", seg([{ v: "single", label: "Single" }, { v: "married", label: "Married filing jointly" }], s.filingStatus, (v) => this.setSetting("filingStatus", v))),
        field("State", h("div", { style: { display: "inline-flex", alignItems: "center", gap: "10px", padding: "11px 16px", border: "1px solid var(--border)", borderRadius: "11px", fontSize: "14px", fontWeight: 600 } }, this.ic(["M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z", "M12 10a2 2 0 1 0 0-.01"], { width: 15, height: 15, stroke: "var(--primary)" }), "New Jersey")),
        field("CME target (per renewal cycle)", h("div", { style: { display: "flex", alignItems: "center", gap: "10px" } }, h("input", { type: "number", value: s.cmeTarget, onChange: (e: any) => this.setSetting("cmeTarget", parseInt(e.target.value) || 0), style: { width: "110px", padding: "11px 14px", border: "1px solid var(--border)", borderRadius: "11px", fontSize: "14px" } }), h("span", { style: { color: "var(--muted)", fontSize: "13px" } }, "credit hours"))),
      ],
      { marginBottom: "18px" }
    );

    // ---- Household income card ----
    const money = (key: keyof Settings) => h("div", { style: { position: "relative", display: "inline-flex", alignItems: "center", width: "100%", maxWidth: "220px" } }, h("span", { style: { position: "absolute", left: "14px", color: "var(--muted)", fontSize: "14px" } }, "$"), h("input", { type: "number", value: s[key] as number, onChange: (e: any) => this.setSetting(key, parseInt(e.target.value) || 0), style: { width: "100%", padding: "11px 14px 11px 26px", border: "1px solid var(--border)", borderRadius: "11px", fontSize: "14px", outline: "none" } }));
    const c = this.calc();
    const mfj = s.filingStatus === "married";
    const half = (a: any, b: any) => h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", maxWidth: "460px" } }, a, b);
    const householdCard = this.card(
      [
        h("div", { key: "h", style: { display: "flex", alignItems: "center", gap: "9px", margin: "0 0 4px" } }, h("span", { style: { width: "9px", height: "9px", borderRadius: "3px", background: "var(--acc-inc)" } }), h("h3", { style: { margin: 0, fontSize: "15px", fontWeight: 700 } }, "Household income — spouse")),
        h("p", { key: "p", style: { margin: "0 0 20px", fontSize: "13px", color: "var(--muted)", lineHeight: 1.55 } }, "For married filing jointly, your spouse’s wages are taxed alongside your business income — lifting the bracket applied to your dollars. Their withholding is subtracted so you set aside only your share."),
        mfj
          ? h("div", { key: "m" }, field("Spouse’s annual wages (W-2)", money("spouseWages")), half(field("Spouse’s federal tax withheld", money("spouseFedWithheld")), field("Spouse’s NJ tax withheld", money("spouseStateWithheld"))), h("div", { style: { display: "flex", gap: "9px", marginTop: "2px", padding: "12px 14px", background: "var(--surface2)", borderRadius: "11px", fontSize: "12.5px", color: "var(--soft)", lineHeight: 1.5 } }, this.ic(["M12 16v-4", "M12 8h.01", "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"], { width: 15, height: 15, stroke: "var(--acc-inc)" }), h("span", {}, this.fmt(c.householdTaxable) + " household taxable income after deductions. Your share to set aside: " + this.fmt(c.fedTax) + " federal + " + this.fmt(c.stateTax) + " NJ, on top of " + this.fmt(c.seTax) + " self-employment tax.")))
          : h("div", { key: "s", style: { display: "flex", alignItems: "center", gap: "9px", padding: "13px 14px", background: "var(--surface2)", borderRadius: "11px", fontSize: "13px", color: "var(--soft)" } }, this.ic(["M12 16v-4", "M12 8h.01", "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"], { width: 15, height: 15, stroke: "var(--muted)" }), h("span", {}, "Set filing status to “Married filing jointly” above to enter a spouse’s income and withholding.")),
      ],
      { marginBottom: "18px" }
    );

    // ---- Retirement card ----
    const retirementCard = this.card(
      [
        h("div", { key: "h", style: { display: "flex", alignItems: "center", gap: "9px", margin: "0 0 4px" } }, h("span", { style: { width: "9px", height: "9px", borderRadius: "3px", background: "var(--acc-cred)" } }), h("h3", { style: { margin: 0, fontSize: "15px", fontWeight: 700 } }, "Retirement — Solo 401(k)")),
        h("p", { key: "p", style: { margin: "0 0 20px", fontSize: "13px", color: "var(--muted)", lineHeight: 1.55 } }, "A fixed contribution is posted to Deductions automatically each month. Change any single month’s amount on the Deductions page — edited months keep their value."),
        field("Monthly contribution", h("div", { style: { display: "flex", alignItems: "center", gap: "10px" } }, h("div", { style: { position: "relative", display: "inline-flex", alignItems: "center" } }, h("span", { style: { position: "absolute", left: "14px", color: "var(--muted)", fontSize: "14px" } }, "$"), h("input", { type: "number", value: s.solo401kMonthly, onChange: (e: any) => this.set401k(e.target.value), style: { width: "150px", padding: "11px 14px 11px 26px", border: "1px solid var(--border)", borderRadius: "11px", fontSize: "14px" } })), h("span", { style: { color: "var(--muted)", fontSize: "13px" } }, "per month"))),
        h("div", { key: "s", style: { display: "flex", alignItems: "center", gap: "9px", marginTop: "2px", padding: "11px 13px", background: "var(--surface2)", borderRadius: "11px", fontSize: "12.5px", color: "var(--soft)" } }, this.ic(["M20 12V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h6", "M4 9h16", "M15 16l2 2 4-4"], { width: 15, height: 15, stroke: "var(--acc-cred)" }), h("span", {}, this.fmt(c.k401) + " contributed year-to-date across " + this.state.deductions.filter((d) => d.k401).length + " months — this lowers your taxable income in the estimate.")),
      ],
      { marginBottom: "18px" }
    );

    return h("div", { style: { animation: "bvFade .4s ease both", maxWidth: "620px" } }, this.pageHead("Settings", "These settings drive every number on your dashboard"), accountCard, taxProfile, householdCard, retirementCard, this.calcMethodCard());
  }

  calcMethodCard() {
    const h = React.createElement;
    const c = this.calc();
    const s = this.state.settings;
    const fs = FED[s.filingStatus];
    const fsLabel = s.filingStatus === "married" ? "Married filing jointly" : "Single";
    const mfj = c.mfj;
    const njB = mfj ? NJ_M : NJ_S;
    const pct = (r: number) => (r * 100).toFixed(3).replace(/\.?0+$/, "") + "%";
    const mono = { fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", fontSize: "12px", lineHeight: 1.5, color: "var(--soft)" };
    const step = (n: number, title: string, formula: string, value: string, tint?: string) => h("div", { key: n, style: { display: "flex", gap: "14px", alignItems: "flex-start", padding: "15px 0", borderTop: n > 1 ? "1px solid var(--line)" : "none" } }, h("div", { style: { flexShrink: 0, width: "25px", height: "25px", borderRadius: "8px", background: "var(--psoft)", color: "var(--pdark)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "12.5px" } }, n), h("div", { style: { flex: 1, minWidth: 0 } }, h("div", { style: { fontSize: "13.5px", fontWeight: 600, marginBottom: "5px" } }, title), h("div", { style: mono }, formula)), h("div", { style: { flexShrink: 0, textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: tint || "var(--text)", fontSize: "15px", paddingTop: "1px" } }, value));
    const bracketTable = (label: string, b: [number, number][]) => h("div", { style: { flex: 1, minWidth: 0, background: "var(--surface2)", borderRadius: "12px", padding: "14px 16px" } }, h("div", { style: { fontSize: "12px", fontWeight: 700, marginBottom: "8px", color: "var(--soft)" } }, label), b.map((row, i) => {
      const lo = row[0],
        hi = i + 1 < b.length ? b[i + 1][0] : null,
        range = hi ? this.fmt(lo) + "–" + this.fmt(hi) : this.fmt(lo) + "+";
      return h("div", { key: i, style: { display: "flex", justifyContent: "space-between", gap: "10px", padding: "4px 0", fontSize: "11.5px", borderTop: i ? "1px solid var(--line)" : "none", fontVariantNumeric: "tabular-nums" } }, h("span", { style: { color: "var(--muted)" } }, range), h("span", { style: { fontWeight: 600 } }, pct(row[1])));
    }));
    const bullets = [
      "Annualization is a simple ratable projection of YTD actuals (the spirit of IRS Form 2210’s annualized-income method). If your income is uneven across the year, the projection — and installments — shift as real numbers replace it.",
      "SE tax models the real structure: 12.4% Social Security capped at the " + this.fmt(SS_WAGE_BASE) + " wage base, 2.9% Medicare uncapped, plus the 0.9% Additional Medicare surtax above " + this.fmt(MEDICARE_ADDL[s.filingStatus]) + (mfj ? " (joint threshold, spouse wages count toward it)" : "") + ".",
      "The Solo 401(k) reduces federal income tax as an above-the-line adjustment — it does NOT reduce SE tax, and New Jersey allows no deduction for it. NJ also allows no standard deduction and no ½-SE deduction, only a " + this.fmt(c.njExempt) + " personal exemption.",
      "Federal figures per IRS Rev. Proc. 2025-32 (tax year 2026): " + this.fmt(fs.std) + " standard deduction, " + fsLabel + " brackets. NJ statutory brackets by filing status.",
      mfj ? "Spouse wages (" + this.fmt(c.spouseWages) + ", annual) stack on top of your annualized business income, so your dollars are taxed at the joint marginal bracket. Spouse withholding (" + this.fmt(c.spouseFedWH + c.spouseStateWH) + ") is subtracted so you set aside only your share." : "Filing as Single — no spouse income is included. Switch to Married filing jointly above to model a household return.",
      "Excludes the QBI deduction (phases out for physicians as a specified-service business above ~" + this.fmt(mfj ? 403500 : 201775) + " taxable). Erring toward setting aside a little too much is the safer mistake.",
    ];
    return this.card([
      h("div", { key: "h", style: { display: "flex", alignItems: "center", gap: "9px", margin: "0 0 4px" } }, h("span", { style: { width: "9px", height: "9px", borderRadius: "3px", background: "var(--primary)" } }), h("h3", { style: { margin: 0, fontSize: "15px", fontWeight: 700 } }, "How your estimate is calculated")),
      h("p", { key: "p", style: { margin: "0 0 12px", fontSize: "13px", color: "var(--muted)", lineHeight: 1.55 } }, "A transparent walk-through of the model, with your current numbers plugged in. Updates live as you edit records and settings."),
      h("div", { key: "steps" }, step(1, "Annualize YTD actuals", "(" + this.fmt(c.ytd) + " income  −  " + this.fmt(c.totalDed - c.k401) + " business deductions)  ×  365 ÷ " + c.doy + " days elapsed", this.fmt(c.annNet)), step(2, "Self-employment tax", "12.4% × min(" + this.fmt(c.seBase) + " base, " + this.fmt(SS_WAGE_BASE) + " cap)  +  2.9% × base" + (c.addlMed > 0 ? "  +  0.9% surtax " + this.fmt(c.addlMed) : ""), this.fmt(c.seTax), "var(--acc-ded)"), step(3, mfj ? "Household taxable income (federal)" : "Taxable income (federal)", this.fmt(c.annNet) + "  −  ½ SE " + this.fmt(c.seTax / 2) + "  −  401(k) " + this.fmt(c.annK401) + (mfj ? "  +  " + this.fmt(c.spouseWages) + " spouse" : "") + "  −  " + this.fmt(fs.std) + " std deduction", this.fmt(c.householdTaxable)), step(4, "Federal income tax", "brackets(" + this.fmt(c.householdTaxable) + ") = " + this.fmt(c.fedTaxTotal) + (mfj ? "   −  " + this.fmt(c.spouseFedWH) + " spouse withheld" : ""), this.fmt(c.fedTax), "var(--acc-inc)"), step(5, "NJ state income tax", "brackets(" + this.fmt(c.njBase) + ") = " + this.fmt(c.stateTaxTotal) + (mfj ? "   −  " + this.fmt(c.spouseStateWH) + " spouse withheld" : "") + "   · no std deduction, ½-SE or 401(k) in NJ", this.fmt(c.stateTax), "var(--acc-cme)"), step(6, "Projected full-year tax", this.fmt(c.seTax) + "  +  " + this.fmt(c.fedTax) + "  +  " + this.fmt(c.stateTax), this.fmt(c.total), "var(--primary)"), step(7, "Level quarterly installment", this.fmt(c.total) + "  ÷  4  — equal installments; passing a deadline never raises the others", this.fmt(c.reqPer)), step(8, "Remaining deadlines", this.fmt(c.reqPer) + " installment  " + (c.shortfall >= 0 ? "+" : "−") + "  " + this.fmt(Math.abs(c.shortfall)) + " " + (c.shortfall >= 0 ? "catch-up" : "overpayment") + " ÷ " + c.remainingQ + " remaining", this.fmt(c.perRemaining))),
      h("div", { key: "brk", style: { display: "flex", gap: "14px", margin: "20px 0 4px", flexWrap: "wrap" } }, bracketTable("Federal brackets — " + fsLabel + " (" + YEAR + ")", fs.b), bracketTable("New Jersey brackets — " + fsLabel, njB)),
      h("div", { key: "ca", style: { marginTop: "18px", paddingTop: "16px", borderTop: "1px solid var(--line)" } }, h("div", { style: { fontSize: "12px", fontWeight: 700, color: "var(--soft)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".4px" } }, "Assumptions & caveats"), h("div", { style: { display: "flex", flexDirection: "column", gap: "9px" } }, bullets.map((b, i) => h("div", { key: i, style: { display: "flex", gap: "9px", fontSize: "12.5px", color: "var(--soft)", lineHeight: 1.5 } }, h("span", { style: { flexShrink: 0, color: "var(--primary)", marginTop: "1px" } }, this.ic(["M20 6L9 17l-5-5"], { width: 14, height: 14 })), h("span", {}, b))))),
    ]);
  }

  // ---------- MODAL ----------
  buildModal() {
    const h = React.createElement;
    if (!this.state.modal) return null;
    const { type, editId } = this.state.modal;
    const f = this.state.form;
    const titles: AnyRec = { income: "income", deductions: "deduction", cme: "CME activity", credentials: "credential" };

    if (type === "qpay") {
      const q = this.state.modal.q as string;
      const qd = QUARTERS.find((x) => x.q === q)!;
      const c = this.calc();
      return [
        h("div", { key: "hd", style: { padding: "22px 24px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" } }, h("h2", { style: { margin: 0, fontFamily: "var(--serif)", fontWeight: 400, fontSize: "22px" } }, "Set aside for " + q), h("button", { onClick: () => this.closeModal(), style: { border: "none", background: "var(--surface2)", borderRadius: "9px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--soft)" } }, this.ic(["M18 6L6 18", "M6 6l12 12"], { width: 16, height: 16 }))),
        h("div", { key: "bd", style: { padding: "22px 24px" } }, h("p", { style: { margin: "0 0 16px", fontSize: "13px", color: "var(--soft)", lineHeight: 1.55 } }, "Record what you actually moved to savings or paid toward the " + this.fdate(qd.d) + " deadline. The plan calls for " + this.fmt(c.reqPer) + " per quarter; any shortfall is spread over the remaining deadlines."), h("label", { style: { display: "block", fontSize: "12px", fontWeight: 600, color: "var(--soft)", marginBottom: "7px" } }, "Amount set aside"), h("div", { style: { position: "relative", display: "flex", alignItems: "center" } }, h("span", { style: { position: "absolute", left: "14px", color: "var(--muted)", fontSize: "14px" } }, "$"), h("input", { type: "number", value: f.amount ?? "", placeholder: "0", autoFocus: true, onChange: (e: any) => this.setField("amount", e.target.value), style: { width: "100%", padding: "12px 14px 12px 26px", border: "1px solid var(--border)", borderRadius: "11px", fontSize: "14px", background: "var(--surface)", color: "var(--text)", outline: "none" } }))),
        h("div", { key: "ft", style: { padding: "0 24px 22px", display: "flex", gap: "10px", justifyContent: "flex-end" } }, h("button", { onClick: () => this.closeModal(), style: { padding: "11px 18px", border: "1px solid var(--border)", background: "var(--surface)", borderRadius: "10px", fontWeight: 600, fontSize: "13.5px", color: "var(--soft)" } }, "Cancel"), h("button", { onClick: () => this.saveRecord(), style: { padding: "11px 22px", border: "none", background: "var(--primary)", color: "#fff", borderRadius: "10px", fontWeight: 600, fontSize: "13.5px", boxShadow: "0 6px 16px -8px var(--primary)" } }, "Save")),
      ];
    }

    const inp = (k: string, ph?: string, opts?: any) => {
      const base = { width: "100%", padding: "12px 14px", border: "1px solid var(--border)", borderRadius: "11px", fontSize: "14px", background: "var(--surface)", color: "var(--text)", outline: "none" };
      if (opts && opts.type === "select") return h("select", { value: f[k] ?? "", onChange: (e: any) => this.setField(k, e.target.value), style: base }, opts.options.map((o: string) => h("option", { key: o, value: o }, o)));
      return h("input", { type: (opts && opts.type) || "text", value: f[k] ?? "", placeholder: ph, onChange: (e: any) => this.setField(k, e.target.value), style: base });
    };
    const lbl = (t: string) => h("label", { style: { display: "block", fontSize: "12px", fontWeight: 600, color: "var(--soft)", marginBottom: "7px" } }, t);
    const fld = (label: string, node: any) => h("div", { style: { marginBottom: "16px" } }, lbl(label), node);
    const half = (a: any, b: any) => h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" } }, a, b);

    const uploader = (k: string) => {
      const v = f[k];
      const has = v && typeof v === "object" && v.path;
      const uploading = f["_" + k + "Uploading"];
      const preview = f["_" + k + "Preview"];
      const isPdf = has && ((v.type || "").includes("pdf") || /\.pdf$/i.test(v.name || ""));
      if (has)
        return h(
          "div",
          { style: { border: "1.5px solid var(--border)", borderRadius: "12px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "12px", background: "var(--surface)" } },
          isPdf || !preview
            ? h("div", { style: { width: "44px", height: "44px", borderRadius: "8px", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--acc-cred)", flexShrink: 0 } }, this.ic(["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6"], { width: 20, height: 20 }))
            : h("img", { src: preview, alt: v.name, style: { width: "44px", height: "44px", borderRadius: "8px", objectFit: "cover", flexShrink: 0, cursor: "pointer" }, onClick: () => this.openViewer(v) }),
          h("div", { style: { flex: 1, minWidth: 0 } }, h("div", { style: { fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, v.name), h("div", { style: { fontSize: "11.5px", color: "var(--good)" } }, v.size ? Math.round(v.size / 1024) + " KB · attached" : "attached")),
          h("button", { type: "button", onClick: () => this.openViewer(v), style: { border: "1px solid var(--border)", background: "var(--surface)", borderRadius: "8px", padding: "6px 10px", fontSize: "12px", fontWeight: 600, color: "var(--soft)" } }, "View"),
          h("button", { type: "button", onClick: () => this.setField(k, null), style: { border: "none", background: "transparent", color: "var(--muted)", display: "flex", padding: "4px" } }, this.ic(["M18 6L6 18", "M6 6l12 12"], { width: 16, height: 16 }))
        );
      return h(
        "label",
        { onDragOver: (e: any) => e.preventDefault(), onDrop: (e: any) => { e.preventDefault(); this.readFileTo(k, e.dataTransfer.files[0]); }, style: { border: "1.5px dashed var(--border)", borderRadius: "12px", padding: "18px", textAlign: "center", cursor: "pointer", color: "var(--muted)", background: "var(--surface2)", fontSize: "13px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" } },
        h("input", { type: "file", accept: "image/*,application/pdf", style: { display: "none" }, onChange: (e: any) => this.readFileTo(k, e.target.files[0]) }),
        this.ic(["M12 16V4", "M7 9l5-5 5 5", "M4 20h16"], { width: 20, height: 20, stroke: "currentColor" }),
        h("span", {}, uploading ? "Uploading…" : "Drop image or PDF, or click to upload")
      );
    };

    let body: any;
    if (type === "income") body = [fld("Date received", inp("date", "", { type: "date" })), fld("Amount", inp("amount", "0.00", { type: "number" })), fld("Source / payer", inp("source", "Facility, agency or client")), fld("Note (optional)", inp("note", "Optional context"))];
    if (type === "deductions") body = [half(fld("Date", inp("date", "", { type: "date" })), fld("Amount", inp("amount", "0.00", { type: "number" }))), fld("Category", inp("category", "", { type: "select", options: ["Malpractice insurance", "Licensing & registration fees", "Medical equipment & supplies", "Travel & mileage", "Professional dues & subscriptions", "Office / administrative", "Retirement — Solo 401(k)", "Other"] })), fld("Note (optional)", inp("note", "Optional context")), fld("Receipt (optional)", uploader("receipt"))];
    if (type === "cme") body = [fld("Date completed", inp("date", "", { type: "date" })), fld("Activity name", inp("activity", "Course or activity title")), half(fld("Credit hours", inp("hours", "0", { type: "number" })), fld("Cost", inp("cost", "0.00", { type: "number" }))), fld("Receipt (optional)", uploader("receipt"))];
    if (type === "credentials") body = [fld("Type / label", inp("type", "", { type: "select", options: ["NJ medical license", "DEA registration", "NJ CDS registration", "Board certification", "Malpractice insurance certificate", "BLS / ACLS", "Other"] })), half(fld("Issue date (optional)", inp("issue", "", { type: "date" })), fld("Expiration date", inp("exp", "", { type: "date" }))), fld("License / registration number (optional)", inp("number", "Stored encrypted")), fld("Document", uploader("doc")), fld("Note (optional)", inp("note", ""))];

    return [
      h("div", { key: "hd", style: { padding: "22px 24px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" } }, h("h2", { style: { margin: 0, fontFamily: "var(--serif)", fontWeight: 400, fontSize: "22px" } }, (editId ? "Edit " : "Add ") + titles[type]), h("button", { onClick: () => this.closeModal(), style: { border: "none", background: "var(--surface2)", borderRadius: "9px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--soft)" } }, this.ic(["M18 6L6 18", "M6 6l12 12"], { width: 16, height: 16 }))),
      h("div", { key: "bd", style: { padding: "22px 24px" } }, ...body),
      h("div", { key: "ft", style: { padding: "0 24px 22px", display: "flex", gap: "10px", justifyContent: "flex-end" } }, h("button", { onClick: () => this.closeModal(), style: { padding: "11px 18px", border: "1px solid var(--border)", background: "var(--surface)", borderRadius: "10px", fontWeight: 600, fontSize: "13.5px", color: "var(--soft)" } }, "Cancel"), h("button", { onClick: () => this.saveRecord(), style: { padding: "11px 22px", border: "none", background: "var(--primary)", color: "#fff", borderRadius: "10px", fontWeight: 600, fontSize: "13.5px", boxShadow: "0 6px 16px -8px var(--primary)" } }, editId ? "Save changes" : "Add " + titles[type])),
    ];
  }

  // ---------- SHELL ----------
  render() {
    const h = React.createElement;
    const S = this.state;
    const docName = S.settings.physicianName || "Physician";
    const docInitials =
      (S.settings.physicianName || "Physician").replace(/^dr\.?\s*/i, "").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "MD";
    const isSidebar = this.nav === "sidebar" && !this.isMobile();
    const isTopnav = this.nav === "top" && !this.isMobile();
    const isMobileNav = this.isMobile();
    const logoMark = this.logo("#F4C64B", "var(--primary)");

    const profileBlock = h("div", { style: { marginTop: "auto", padding: "12px 8px 4px", borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: "10px" } }, h("div", { style: { width: "34px", height: "34px", borderRadius: "50%", background: "var(--psoft)", color: "var(--pdark)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: "13px" } }, docInitials), h("div", { style: { lineHeight: 1.2 } }, h("div", { style: { fontSize: "13px", fontWeight: 600 } }, docName), h("div", { style: { fontSize: "11px", color: "var(--muted)" } }, "Emergency Medicine")));

    const sidebar = isSidebar && h("aside", { style: { width: "236px", flexShrink: 0, background: "var(--surface)", borderRight: "1px solid var(--border)", padding: "22px 16px", display: "flex", flexDirection: "column", gap: "4px", position: "sticky", top: 0, height: "100vh" } }, h("div", { style: { display: "flex", alignItems: "center", gap: "11px", padding: "6px 8px 20px" } }, h("div", { style: { width: "30px", height: "30px" } }, logoMark), h("div", {}, h("div", { style: { fontWeight: 700, fontSize: "14.5px", lineHeight: 1.1 } }, "Blue Violet"), h("div", { style: { fontSize: "11px", color: "var(--muted)" } }, "Physician Services"))), this.buildSideNav(), profileBlock);

    const topnav = isTopnav && h("header", { style: { background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "0 30px", display: "flex", alignItems: "center", gap: "8px", height: "62px", position: "sticky", top: 0, zIndex: 5 } }, h("div", { style: { display: "flex", alignItems: "center", gap: "10px", marginRight: "22px" } }, h("div", { style: { width: "28px", height: "28px" } }, logoMark), h("div", { style: { fontWeight: 700, fontSize: "14.5px" } }, "Blue Violet")), this.buildTopNav(), h("div", { style: { marginLeft: "auto", width: "32px", height: "32px", borderRadius: "50%", background: "var(--psoft)", color: "var(--pdark)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: "12.5px" } }, docInitials));

    const mobileHeader = isMobileNav && h("header", { style: { position: "sticky", top: 0, zIndex: 20, background: "var(--surface)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "12px", padding: "11px 15px" } }, h("button", { onClick: () => this.openDrawer(), "aria-label": "Menu", style: { border: "1px solid var(--border)", background: "var(--surface)", borderRadius: "10px", width: "38px", height: "38px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--soft)", flexShrink: 0 } }, this.ic(["M3 6h18", "M3 12h18", "M3 18h18"], { width: 20, height: 20 })), h("div", { style: { display: "flex", alignItems: "center", gap: "9px" } }, h("div", { style: { width: "25px", height: "25px" } }, logoMark), h("div", { style: { fontWeight: 700, fontSize: "14.5px" } }, "Blue Violet")), h("div", { style: { marginLeft: "auto", width: "32px", height: "32px", borderRadius: "50%", background: "var(--psoft)", color: "var(--pdark)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: "12.5px" } }, docInitials));

    const drawer = S.drawer && h("div", { onClick: () => this.closeDrawer(), style: { position: "fixed", inset: 0, background: "rgba(30,26,54,.42)", zIndex: 45, animation: "bvOverlay .18s ease both" } }, h("aside", { onClick: (e: any) => e.stopPropagation(), style: { position: "absolute", left: 0, top: 0, bottom: 0, width: "266px", maxWidth: "82vw", background: "var(--surface)", padding: "20px 16px", display: "flex", flexDirection: "column", gap: "4px", animation: "bvSlideIn .22s cubic-bezier(.2,.7,.3,1) both", overflow: "auto" } }, h("div", { style: { display: "flex", alignItems: "center", gap: "11px", padding: "6px 8px 18px" } }, h("div", { style: { width: "30px", height: "30px" } }, logoMark), h("div", {}, h("div", { style: { fontWeight: 700, fontSize: "14.5px", lineHeight: 1.1 } }, "Blue Violet"), h("div", { style: { fontSize: "11px", color: "var(--muted)" } }, "Physician Services"))), this.buildSideNav(), profileBlock));

    const modal = S.modal && h("div", { onClick: () => this.closeModal(), style: { position: "fixed", inset: 0, background: "rgba(30,26,54,.34)", backdropFilter: "blur(2px)", zIndex: 40, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "56px 20px", overflow: "auto", animation: "bvOverlay .18s ease both" } }, h("div", { onClick: (e: any) => e.stopPropagation(), style: { width: "100%", maxWidth: "460px", background: "var(--surface)", borderRadius: "18px", boxShadow: "0 24px 60px -20px rgba(40,30,80,.4)", animation: "bvSheet .22s cubic-bezier(.2,.7,.3,1) both", overflow: "hidden" } }, this.buildModal()));

    const viewer = S.viewer && h("div", { onClick: () => this.closeViewer(), style: { position: "fixed", inset: 0, background: "rgba(20,16,40,.74)", backdropFilter: "blur(3px)", zIndex: 60, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px 18px", animation: "bvOverlay .18s ease both" } }, this.buildViewer());

    return h(
      "div",
      { "data-palette": this.palette, "data-nav": this.nav, "data-mobile": isMobileNav ? "1" : "0", style: { minHeight: "100vh", background: "var(--bg)", color: "var(--text)" } },
      h("div", { className: "shell" }, sidebar, topnav, mobileHeader, h("main", { className: "bvscroll", style: { flex: 1, minWidth: 0, maxHeight: "100vh", overflow: "auto" } }, h("div", { className: "bvmain-inner" }, this.buildScreen()))),
      drawer,
      modal,
      viewer
    );
  }
}

export default function App(props: Omit<AppProps, "router">) {
  const router = useRouter();
  return <AppInner {...props} router={router} />;
}
