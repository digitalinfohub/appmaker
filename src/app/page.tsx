"use client";

import { useCallback, useEffect, useState } from "react";
import Builder from "@/components/Builder";
import Dashboard from "@/components/Dashboard";
import LoginForm from "@/components/LoginForm";
import SetupForm from "@/components/SetupForm";
import { installLocalApi } from "@/lib/local/api";
import { isAuthed, studioConfigured } from "@/lib/local/auth";
import { hydrateMedia } from "@/lib/local/media";
import { useHashRoute } from "@/lib/local/router";

export default function StudioPage() {
  const route = useHashRoute();
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [authed, setAuthed] = useState(false);

  const refresh = useCallback(() => {
    void Promise.all([studioConfigured(), Promise.resolve(isAuthed())]).then(([hasStudio, signedIn]) => {
      setConfigured(hasStudio);
      setAuthed(signedIn);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    installLocalApi();
    void hydrateMedia().then(refresh);
    refresh();
    const onChange = () => refresh();
    window.addEventListener("am-auth", onChange);
    window.addEventListener("hashchange", onChange);
    return () => {
      window.removeEventListener("am-auth", onChange);
      window.removeEventListener("hashchange", onChange);
    };
  }, [refresh]);

  if (!ready) {
    return (
      <div className="boot">
        <span className="spinner" aria-hidden />
        <p>Opening App Maker…</p>
      </div>
    );
  }

  if (!configured) return <SetupForm />;
  if (!authed) return <LoginForm />;

  const match = route.match(/^\/apps\/([^/]+)$/);
  const appId = match?.[1];
  if (appId) return <Builder key={appId} appId={appId} />;
  return <Dashboard />;
}
