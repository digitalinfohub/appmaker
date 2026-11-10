"use client";

import { useState } from "react";
import { startSession, verifyPasscode } from "@/lib/local/auth";
import { Btn, Ico, Toaster, toast } from "./ui";

export default function LoginForm() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!(await verifyPasscode(passcode))) throw new Error("That passcode does not match this studio");
      startSession();
      window.dispatchEvent(new Event("am-auth"));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <form className="auth__card" onSubmit={submit}>
        <div className="auth__mark">
          <Ico name="sparkles" size={22} />
        </div>
        <div className="auth__title">App Maker</div>
        <p className="auth__sub">Your studio is locked. Enter your studio passcode to keep building.</p>
        {error && <div className="auth__error">{error}</div>}
        <div className="field">
          <label className="field__label" htmlFor="passcode">
            Studio passcode
          </label>
          <input
            id="passcode"
            className="input"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <Btn type="submit" variant="primary" block loading={busy} disabled={!passcode}>
          Unlock studio
        </Btn>
        <p className="auth__foot">One passcode protects every app in this studio. It is stored as a salted hash.</p>
      </form>
      <Toaster />
    </div>
  );
}
