"use client";

import { useState } from "react";
import { setupStudio } from "@/lib/local/auth";
import { Btn, Ico } from "./ui";

export default function SetupForm() {
  const [passcode, setPasscode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (passcode.length < 6) return setError("Use at least 6 characters");
    if (passcode !== confirm) return setError("The two passcodes do not match");
    setBusy(true);
    try {
      await setupStudio(passcode);
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
        <div className="auth__title">Welcome to App Maker</div>
        <p className="auth__sub">
          Create your studio passcode. It protects every app, notification and message in this studio — keep it somewhere safe.
        </p>
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
            autoComplete="new-password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="At least 6 characters"
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="confirm">
            Confirm passcode
          </label>
          <input
            id="confirm"
            className="input"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Type it again"
          />
        </div>
        <Btn type="submit" variant="primary" block loading={busy}>
          Create my studio
        </Btn>
        <p className="auth__foot">
          The passcode is hashed with PBKDF2 and checked in this browser only — it is a lock screen, not server security. The
          real protection for your site is your GitHub account, so keep that password safe.
        </p>
      </form>
    </div>
  );
}
