"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logo, ic } from "./ui";

type ForgotState =
  | null
  | { step: "email"; email: string; error: string | null; busy: boolean }
  | { step: "sent"; email: string };

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState<ForgotState>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pw,
    });
    setBusy(false);
    if (error) {
      setError("Incorrect email or password. Use “Forgot?” to reset it.");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  const iconLock = ic(["M6 10V7a6 6 0 0 1 12 0v3", "M5 10h14v10H5z"], {
    width: 14,
    height: 14,
  });
  const iconShield = ic(["M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"], {
    width: 14,
    height: 14,
  });

  return (
    <div data-palette="periwinkle" style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <div className="bvlogin">
        <div
          className="bvbrand"
          style={{
            position: "relative",
            overflow: "hidden",
            background: "linear-gradient(150deg,var(--grad1),var(--grad2))",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 60px",
            color: "#fff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "13px" }}>
            <div style={{ width: "38px", height: "38px" }}>{logo("#fff", "#fff")}</div>
            <div style={{ fontWeight: 600, fontSize: "16px", letterSpacing: ".2px" }}>Blue Violet</div>
          </div>
          <div style={{ position: "absolute", right: "-90px", top: "-40px", width: "340px", height: "340px", opacity: 0.16 }}>{logo("#fff", "#fff")}</div>
          <div style={{ position: "absolute", left: "-70px", bottom: "-90px", width: "300px", height: "300px", opacity: 0.1 }}>{logo("#fff", "#fff")}</div>
          <div style={{ position: "relative" }}>
            <div style={{ fontFamily: "var(--serif)", fontWeight: 300, fontSize: "44px", lineHeight: 1.12, letterSpacing: "-.5px", maxWidth: "15ch", textWrap: "balance" }}>
              Your practice&apos;s numbers, quietly in order.
            </div>
            <p style={{ margin: "20px 0 0", fontSize: "15px", lineHeight: 1.6, maxWidth: "34ch", color: "rgba(255,255,255,.86)" }}>
              Income, deductions, CME and credentials — one calm place to track what you owe and when things expire.
            </p>
          </div>
          <div style={{ position: "relative", display: "flex", gap: "22px", fontSize: "12.5px", color: "rgba(255,255,255,.82)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>{iconLock} Encrypted storage</span>
            <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>{iconShield} No patient data</span>
          </div>
        </div>

        <div className="bvloginform" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }}>
          <div style={{ width: "100%", maxWidth: "372px", animation: "bvFade .5s ease both" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--primary)", letterSpacing: ".5px", textTransform: "uppercase" }}>Welcome back</div>
            <h1 style={{ margin: "10px 0 6px", fontFamily: "var(--serif)", fontWeight: 400, fontSize: "32px", letterSpacing: "-.3px" }}>Sign in to your practice</h1>
            <p style={{ margin: "0 0 28px", color: "var(--soft)", fontSize: "14px" }}>Blue Violet Physician Services, LLC</p>

            <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "var(--soft)", marginBottom: "7px" }}>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@practice.com"
              onKeyDown={(e) => e.key === "Enter" && signIn()}
              style={{ width: "100%", padding: "13px 15px", border: "1px solid var(--border)", borderRadius: "11px", fontSize: "14.5px", background: "var(--surface)", color: "var(--text)", marginBottom: "18px", outline: "none" }}
            />
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "var(--soft)", marginBottom: "7px" }}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                type="password"
                placeholder="••••••••••"
                onKeyDown={(e) => e.key === "Enter" && signIn()}
                style={{ width: "100%", padding: "13px 15px", border: "1px solid var(--border)", borderRadius: "11px", fontSize: "14.5px", background: "var(--surface)", color: "var(--text)", outline: "none" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "16px 0 20px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--soft)" }}>
                <input type="checkbox" defaultChecked style={{ accentColor: "var(--primary)", width: "15px", height: "15px" }} /> Keep me signed in
              </label>
              <button
                onClick={() => setForgot({ step: "email", email: email, error: null, busy: false })}
                style={{ border: "none", background: "transparent", fontSize: "13px", color: "var(--primary)", fontWeight: 600, cursor: "pointer", padding: 0 }}
              >
                Forgot?
              </button>
            </div>

            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--warnbg)", color: "var(--warn)", borderRadius: "11px", padding: "11px 13px", fontSize: "12.5px", fontWeight: 500, marginBottom: "14px" }}>
                {ic(["M12 9v4", "M12 17h.01", "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"], { width: 15, height: 15, stroke: "var(--warn)" })}
                {error}
              </div>
            )}

            <button
              onClick={signIn}
              disabled={busy}
              style={{ width: "100%", padding: "14px", border: "none", borderRadius: "11px", background: "var(--primary)", color: "#fff", fontSize: "15px", fontWeight: 600, boxShadow: "0 6px 18px -6px var(--primary)", opacity: busy ? 0.7 : 1 }}
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "9px", marginTop: "22px", color: "var(--muted)", fontSize: "12px", justifyContent: "center" }}>
              {iconLock} Protected by encrypted, HIPAA-out-of-scope storage
            </div>
          </div>
        </div>
      </div>

      {forgot && <ForgotModal state={forgot} setState={setForgot} />}
    </div>
  );
}

function ForgotModal({
  state,
  setState,
}: {
  state: NonNullable<ForgotState>;
  setState: (s: ForgotState) => void;
}) {
  async function sendLink() {
    if (state.step !== "email") return;
    if (!/.+@.+\..+/.test(state.email || "")) {
      setState({ ...state, error: "Enter a valid email address." });
      return;
    }
    setState({ ...state, busy: true, error: null });
    const supabase = createClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const { error } = await supabase.auth.resetPasswordForEmail(state.email.trim(), {
      redirectTo: `${siteUrl}/reset`,
    });
    if (error) {
      setState({ step: "email", email: state.email, error: error.message, busy: false });
    } else {
      setState({ step: "sent", email: state.email });
    }
  }

  const header = (title: string) => (
    <div style={{ padding: "22px 24px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <h2 style={{ margin: 0, fontFamily: "var(--serif)", fontWeight: 400, fontSize: "22px" }}>{title}</h2>
      <button onClick={() => setState(null)} style={{ border: "none", background: "var(--surface2)", borderRadius: "9px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--soft)" }}>
        {ic(["M18 6L6 18", "M6 6l12 12"], { width: 16, height: 16 })}
      </button>
    </div>
  );

  return (
    <div
      onClick={() => setState(null)}
      style={{ position: "fixed", inset: 0, background: "rgba(30,26,54,.34)", backdropFilter: "blur(2px)", zIndex: 55, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "56px 20px", overflow: "auto", animation: "bvOverlay .18s ease both" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: "430px", background: "var(--surface)", borderRadius: "18px", boxShadow: "0 24px 60px -20px rgba(40,30,80,.4)", animation: "bvSheet .22s cubic-bezier(.2,.7,.3,1) both", overflow: "hidden" }}
      >
        {state.step === "email" ? (
          <>
            {header("Reset your password")}
            <div style={{ padding: "22px 24px" }}>
              {state.error && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--warnbg)", color: "var(--warn)", borderRadius: "10px", padding: "10px 12px", fontSize: "12.5px", fontWeight: 500, marginBottom: "14px" }}>
                  {ic(["M12 9v4", "M12 17h.01", "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"], { width: 15, height: 15, stroke: "var(--warn)" })}
                  {state.error}
                </div>
              )}
              <p style={{ margin: "0 0 18px", fontSize: "13.5px", color: "var(--soft)", lineHeight: 1.55 }}>
                Enter the email on your account and we&apos;ll send you a secure link to set a new password.
              </p>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--soft)", marginBottom: "7px" }}>Email</label>
              <input
                type="email"
                value={state.email}
                onChange={(e) => setState({ ...state, email: e.target.value, error: null })}
                placeholder="you@practice.com"
                style={{ width: "100%", padding: "12px 14px", border: "1px solid var(--border)", borderRadius: "11px", fontSize: "14px", background: "var(--surface)", color: "var(--text)", outline: "none" }}
              />
            </div>
            <div style={{ padding: "0 24px 22px" }}>
              <button
                onClick={sendLink}
                disabled={state.busy}
                style={{ width: "100%", padding: "13px", border: "none", borderRadius: "11px", background: "var(--primary)", color: "#fff", fontWeight: 600, fontSize: "14.5px", boxShadow: "0 6px 16px -8px var(--primary)", opacity: state.busy ? 0.7 : 1 }}
              >
                {state.busy ? "Sending…" : "Send recovery link"}
              </button>
            </div>
          </>
        ) : (
          <>
            {header("Check your email")}
            <div style={{ padding: "26px 24px", textAlign: "center" }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "var(--psoft)", color: "var(--pdark)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                {ic(["M4 4h16v16H4z", "M4 6l8 6 8-6"], { width: 26, height: 26, stroke: "var(--pdark)" })}
              </div>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--soft)", lineHeight: 1.55 }}>
                We sent a password-reset link to <strong style={{ color: "var(--text)" }}>{state.email}</strong>. Open it to choose a new password.
              </p>
            </div>
            <div style={{ padding: "0 24px 24px" }}>
              <button onClick={() => setState(null)} style={{ width: "100%", padding: "13px", border: "none", borderRadius: "11px", background: "var(--primary)", color: "#fff", fontWeight: 600, fontSize: "14.5px", boxShadow: "0 6px 16px -8px var(--primary)" }}>
                Back to sign in
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
