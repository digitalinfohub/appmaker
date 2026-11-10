"use client";

import { getSetting, setSetting } from "./idb";

/**
 * The passcode is a convenience lock, not real security: the studio runs
 * entirely in the browser, so anyone holding the built files can read the
 * local database. The real credential is the GitHub token, kept by the owner.
 */
type StudioCred = { passcodeHash: string; salt: string; createdAt: string };

const SETTING_KEY = "studio";
const SESSION_KEY = "am-session";
const encoder = new TextEncoder();
const bs = (bytes: Uint8Array): BufferSource => bytes as unknown as BufferSource;

function toB64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromB64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

async function derive(passcode: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey("raw", bs(encoder.encode(passcode)), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: bs(salt), iterations: 150_000, hash: "SHA-256" },
    key,
    256,
  );
  return toB64(new Uint8Array(bits));
}

function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function studioConfigured(): Promise<boolean> {
  try {
    return Boolean(await getSetting<StudioCred>(SETTING_KEY));
  } catch {
    return false;
  }
}

export async function setupStudio(passcode: string): Promise<void> {
  if (passcode.trim().length < 6) {
    throw new Error("Use at least 6 characters so the passcode is worth having");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  await setSetting<StudioCred>(SETTING_KEY, {
    passcodeHash: await derive(passcode, salt),
    salt: toB64(salt),
    createdAt: new Date().toISOString(),
  });
  startSession();
}

export async function verifyPasscode(passcode: string): Promise<boolean> {
  const cred = await getSetting<StudioCred>(SETTING_KEY);
  if (!cred) return false;
  return equal(await derive(passcode, fromB64(cred.salt)), cred.passcodeHash);
}

export function startSession(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, String(Date.now()));
  } catch {
    /* private mode */
  }
}

export function endSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* private mode */
  }
}

export function isAuthed(): boolean {
  try {
    return Boolean(sessionStorage.getItem(SESSION_KEY));
  } catch {
    return false;
  }
}
