"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logo, ic } from "./ui";

// Landing page for the password-reset email link. Supabase establishes a
// recovery session from the link, after which updateUser can set a new password.
export default function ResetForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // The recovery link creates a session; confirm one exists.
    supabase.auth.getSession().then(({ data }) => {
      setValid(!!data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setValid(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit() {
    setError(null);
    if (!pw || pw.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (pw !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) setError(error.message);
    else setDone(true);
  }

  const card = (children: React.ReactNode) => (
    <div data-palette="periwinkle" style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: "400px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "18px", padding: "34px 30px", boxShadow: "0 24px 60px -30px rgba(40,30,80,.3)", animation: "bvFade .4s ease both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "11px", marginBottom: "22px" }}>
          <div style={{ width: "32px", height: "32px" }}>{logo("#F4C64B", "var(--primary)")}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px", lineHeight: 1.1 }}>Blue Violet</div>
            <div style={{ fontSize: "11px", color: "var(--muted)" }}>Physician Services</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );

  const label = (t: string) => (
    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--soft)", marginBottom: "7px" }}>{t}</label>
  );
  const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 14px", border: "1px solid var(--border)", borderRadius: "11px", fontSize: "14px", background: "var(--surface)", color: "var(--text)", outline: "none" };

  if (!ready) return card(<p style={{ margin: 0, color: "var(--soft)", fontSize: "14px" }}>Loading…</p>);

  if (done)
    return card(
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "var(--goodbg)", color: "var(--good)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          {ic(["M20 6L9 17l-5-5"], { width: 26, height: 26, stroke: "var(--good)" })}
        </div>
        <h2 style={{ margin: "0 0 8px", fontFamily: "var(--serif)", fontWeight: 400, fontSize: "22px" }}>Password updated</h2>
        <p style={{ margin: "0 0 20px", fontSize: "14px", color: "var(--soft)", lineHeight: 1.55 }}>You can now sign in with your new password.</p>
        <button onClick={() => { router.push("/login"); router.refresh(); }} style={{ width: "100%", padding: "13px", border: "none", borderRadius: "11px", background: "var(--primary)", color: "#fff", fontWeight: 600, fontSize: "14.5px", boxShadow: "0 6px 16px -8px var(--primary)" }}>Go to sign in</button>
      </div>
    );

  if (!valid)
    return card(
      <div>
        <h2 style={{ margin: "0 0 8px", fontFamily: "var(--serif)", fontWeight: 400, fontSize: "22px" }}>Link expired</h2>
        <p style={{ margin: "0 0 20px", fontSize: "14px", color: "var(--soft)", lineHeight: 1.55 }}>This password-reset link is invalid or has expired. Request a new one from the sign-in page.</p>
        <button onClick={() => router.push("/login")} style={{ width: "100%", padding: "13px", border: "none", borderRadius: "11px", background: "var(--primary)", color: "#fff", fontWeight: 600, fontSize: "14.5px" }}>Back to sign in</button>
      </div>
    );

  return card(
    <div>
      <h2 style={{ margin: "0 0 6px", fontFamily: "var(--serif)", fontWeight: 400, fontSize: "24px" }}>Set a new password</h2>
      <p style={{ margin: "0 0 22px", fontSize: "13.5px", color: "var(--soft)", lineHeight: 1.55 }}>Choose a new password for your account.</p>
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--warnbg)", color: "var(--warn)", borderRadius: "10px", padding: "10px 12px", fontSize: "12.5px", fontWeight: 500, marginBottom: "16px" }}>
          {ic(["M12 9v4", "M12 17h.01", "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"], { width: 15, height: 15, stroke: "var(--warn)" })}
          {error}
        </div>
      )}
      {label("New password")}
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 6 characters" style={{ ...inputStyle, marginBottom: "16px" }} />
      {label("Confirm new password")}
      <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" onKeyDown={(e) => e.key === "Enter" && submit()} style={{ ...inputStyle, marginBottom: "22px" }} />
      <button onClick={submit} disabled={busy} style={{ width: "100%", padding: "13px", border: "none", borderRadius: "11px", background: "var(--primary)", color: "#fff", fontWeight: 600, fontSize: "14.5px", boxShadow: "0 6px 16px -8px var(--primary)", opacity: busy ? 0.7 : 1 }}>{busy ? "Updating…" : "Update password"}</button>
    </div>
  );
}
