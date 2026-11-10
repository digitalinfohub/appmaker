"use client";

import { getSetting, setSetting } from "./idb";

/**
 * Publishing without a server: the studio commits the generated app straight
 * into the owner's GitHub repository with the Git Trees API. GitHub Pages then
 * serves it from its own folder, so each app has a real, installable URL.
 *
 * The token is the real credential in this edition. It is stored locally in
 * the browser and only ever sent to api.github.com.
 */
export type GitHubConfig = {
  owner: string;
  repo: string;
  branch: string;
  token: string;
  pagesUrl: string;
};

const SETTING_KEY = "github";
const API = "https://api.github.com";

export async function loadGitHubConfig(): Promise<GitHubConfig | null> {
  return getSetting<GitHubConfig>(SETTING_KEY);
}

export async function saveGitHubConfig(config: GitHubConfig | null): Promise<void> {
  await setSetting<GitHubConfig | null>(SETTING_KEY, config);
}

export function parseRepoInput(value: string): { owner: string; repo: string } | null {
  const trimmed = value.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/i, "");
  const match = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/?$/);
  if (!match) return null;
  return { owner: match[1]!, repo: match[2]! };
}

export function defaultPagesUrl(owner: string, repo: string): string {
  const site = repo.toLowerCase() === `${owner.toLowerCase()}.github.io` ? "" : `/${repo}`;
  return `https://${owner.toLowerCase()}.github.io${site}/`;
}

type GitHubError = { message?: string };

async function call<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const data = (await response.json()) as GitHubError;
      if (data?.message) detail = data.message;
    } catch {
      /* non-JSON error */
    }
    if (response.status === 401) throw new Error("GitHub rejected the token — check that it has not expired");
    if (response.status === 403) throw new Error(`GitHub refused the request: ${detail}`);
    if (response.status === 404) throw new Error("Repository not found, or the token cannot see it");
    throw new Error(detail);
  }
  if (response.status === 204) return {} as T;
  return (await response.json()) as T;
}

function toBase64(data: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < data.length; i += chunk) {
    binary += String.fromCharCode(...data.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export type PublishFile = { path: string; data: Uint8Array };

export type PublishOutcome = {
  commitSha: string;
  commitUrl: string;
  files: number;
  bytes: number;
  warnings: string[];
};

/**
 * Commits `files` (repo-relative paths) to the branch in one commit, and
 * deletes `remove` paths that no longer exist.
 */
export async function commitFiles(opts: {
  config: GitHubConfig;
  files: PublishFile[];
  remove?: string[];
  message: string;
}): Promise<PublishOutcome> {
  const { config, files, message } = opts;
  const remove = (opts.remove ?? []).filter((path) => !files.some((file) => file.path === path));
  const repoPath = `/repos/${config.owner}/${config.repo}`;

  let headSha: string | null = null;
  let baseTree: string | null = null;
  try {
    const ref = await call<{ object: { sha: string } }>(
      config.token,
      `${repoPath}/git/ref/heads/${encodeURIComponent(config.branch)}`,
    );
    headSha = ref.object.sha;
    const commit = await call<{ tree: { sha: string } }>(config.token, `${repoPath}/git/commits/${headSha}`);
    baseTree = commit.tree.sha;
  } catch (error) {
    // A brand-new repository has no commits yet: start with an empty tree.
    if (!/not found|Git repository is empty/i.test((error as Error).message)) throw error;
  }

  const warnings: string[] = [];
  let bytes = 0;
  const tree: { path: string; mode: "100644"; type: "blob"; sha: string | null }[] = [];

  const queue = [...files];
  const workers = Array.from({ length: Math.min(6, queue.length) }, async () => {
    for (;;) {
      const file = queue.shift();
      if (!file) return;
      try {
        const blob = await call<{ sha: string }>(config.token, `${repoPath}/git/blobs`, {
          method: "POST",
          body: JSON.stringify({ content: toBase64(file.data), encoding: "base64" }),
        });
        bytes += file.data.length;
        tree.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
      } catch (error) {
        warnings.push(`${file.path}: ${(error as Error).message}`);
      }
    }
  });
  await Promise.all(workers);

  for (const path of remove) tree.push({ path, mode: "100644", type: "blob", sha: null });

  if (!tree.length) throw new Error("There was nothing to publish");

  const newTree = await call<{ sha: string }>(config.token, `${repoPath}/git/trees`, {
    method: "POST",
    body: JSON.stringify(baseTree ? { base_tree: baseTree, tree } : { tree }),
  });

  const commit = await call<{ sha: string; html_url: string }>(config.token, `${repoPath}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: newTree.sha, parents: headSha ? [headSha] : [] }),
  });

  if (headSha) {
    try {
      await call(config.token, `${repoPath}/git/refs/heads/${encodeURIComponent(config.branch)}`, {
        method: "PATCH",
        body: JSON.stringify({ sha: commit.sha, force: false }),
      });
    } catch (error) {
      throw new Error(
        `GitHub would not move ${config.branch}: ${(error as Error).message}. Pull the latest changes in the repo, then publish again.`,
      );
    }
  } else {
    await call(config.token, `${repoPath}/git/refs`, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${config.branch}`, sha: commit.sha }),
    });
  }

  return { commitSha: commit.sha, commitUrl: commit.html_url, files: tree.length, bytes, warnings };
}

/** Verifies the token and repository without writing anything. */
export async function checkRepository(config: GitHubConfig): Promise<{ private: boolean; defaultBranch: string }> {
  const repo = await call<{ private: boolean; default_branch: string }>(
    config.token,
    `/repos/${config.owner}/${config.repo}`,
  );
  return { private: repo.private, defaultBranch: repo.default_branch };
}
