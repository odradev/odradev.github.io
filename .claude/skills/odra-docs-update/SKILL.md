---
name: odra-docs-update
description: >
  Bump the Odra documentation site to a new Odra release version. Use this skill whenever the user
  asks to "update the docs to X.Y.Z", "bump docs version", "prepare docs for a new Odra release",
  or "create a new docs version". Updates every versioned code snippet and URL across
  docusaurus/docs/, appends the version to versions.json, and snapshots the new version with
  `just docs-new-version`.
allowed-tools: Bash, Write
---

# Odra Docs Update Skill

Propagates a new Odra release version through the Docusaurus docs of this repo
(`odradev.github.io`).

## When to use

Trigger this skill whenever the user wants to update the docs for a new Odra release,
e.g. "update docs to 2.9.0", "bump docs for next release", "create new docs version 2.9.0".

## Inputs

Required: **target version** (e.g. `2.9.0`).
If the user did not provide one, ask before starting.

## Step 1 — Confirm working directory and current version

Run from the repo root:

- Read `docusaurus/versions.json` — the first entry is the current latest version (the one
  currently hardcoded into most docs).
- `ls docusaurus/docs/` to enumerate subdirectories to dispatch agents to.

Do **not** proceed if the target version is already the first entry in `versions.json`.

## Step 2 — Dispatch parallel agents, one per subdirectory

Launch Agent calls **in parallel** (single assistant message, multiple Agent tool blocks).
Subdirectories under `docusaurus/docs/` to cover:

- `basics/`
- `advanced/`
- `backends/`
- `examples/`
- `getting-started/`
- `tutorials/`
- `migrations/` — **read-only scan** (historical migration notes reference old versions on purpose)
- Top-level files in `docusaurus/docs/` such as `intro.md`

Do not spawn an agent for image files.

### Agent briefing template

Each agent is cold — brief it fully. Use this template (fill in `{OLD}`, `{NEW}`, `{SUBDIR}`):

> You are updating Odra documentation for a new release. Target version: `{NEW}`. Previous
> latest version: `{OLD}`. Scope: only files under `docusaurus/docs/{SUBDIR}/` of this repo.
>
> In every `.md` / `.mdx` file in scope, update these patterns from `{OLD}` to `{NEW}`:
>
> 1. **Cargo.toml snippets** — any line mentioning an `odra*` crate with a version string.
>    Examples to rewrite:
>    - `odra = "{OLD}"` → `odra = "{NEW}"`
>    - `odra-test = "{OLD}"`
>    - `odra-build = "{OLD}"`
>    - `odra-modules = "{OLD}"`
>    - `odra-casper-livenet-env = { version = "{OLD}", ... }`
>    - Any other `odra-*` crate with a pinned version.
> 2. **docs.rs links** — `https://docs.rs/odra/{OLD}/...` → `https://docs.rs/odra/{NEW}/...`
>    (also `odra-modules`, `odra-test`, etc.).
> 3. **GitHub release links** — `https://github.com/odradev/odra/blob/release/{OLD}/...`
>    → `.../release/{NEW}/...`.
> 4. **Prose mentions of "Odra {OLD}"** that clearly refer to the crate version — update to
>    `{NEW}`. Leave historical references alone if context makes clear they are historical.
>
> Rules:
> - **Do not touch** `migrations/` content — those files document past upgrades and must
>   keep their historical versions. (If you were assigned migrations, only scan and report.)
> - Do not rewrite version strings for non-odra crates.
> - Do not edit images, `_category_.json`, or `versions.json`.
> - If a snippet already uses `{NEW}`, leave it.
> - Preserve file formatting (line endings, indentation, code fence languages) exactly.
>
> When done, report a short summary: files edited, count of replacements, and any
> suspicious matches you chose **not** to rewrite (with a one-line reason each).

Run agents in parallel — they operate on disjoint subdirectories so there are no write
conflicts. Wait for all to finish before moving on.

## Step 3 — Review and commit version bump

Before snapshotting, pause and let the user review the changes so far:

- Run `git status` and `git diff --stat` to summarize what was touched.
- Surface the per-subdirectory edit counts from the agent reports and any
  suspicious matches that were skipped.
- Ask the user whether the changes look right. **Do not commit without explicit
  agreement.**

If the user agrees, create a single commit containing the version-string bumps update. Use a message like:

```
docs: bump Odra version to {NEW}
```

If the user wants to adjust something first, wait for their edits before
continuing to Step 4.

## Step 4 — Snapshot the version with `just`

From repo root, run:

```bash
just docs-new-version {NEW}
```

This wraps `cd docusaurus && npm run docusaurus docs:version {NEW}` which copies
`docusaurus/docs` into `docusaurus/versioned_docs/version-{NEW}/` and writes a matching
sidebar file.

If the command fails, surface the error verbatim — do not retry blindly. Common causes:
dependencies not installed (`just install` first), or the version already snapshotted.

## Step 5 — Update the Docusaurus config

Edit `docusaurus/docusaurus.config.js` and update the `lastVersion` field to `{NEW}` as well, 
so the "latest" badge on the site points to the new version.

## Step 6 — Verify and report

After the command succeeds:

- Confirm `docusaurus/versioned_docs/version-{NEW}/` exists.
- Confirm `docusaurus/versioned_sidebars/version-{NEW}-sidebars.json` exists.
- Run a final grep for the old version under `docusaurus/docs/` (excluding `migrations/`)
  to catch anything the agents missed. Report stragglers to the user for manual review
  rather than silently rewriting — they may be intentional historical references.

Report to the user:
- Target version applied
- Per-subdirectory edit counts (from agent reports)
- Any skipped/suspicious matches
- Confirmation that the snapshot was created

## Step 7 — Commit snapshot and open a PR

Once verification passes:

- Stage the snapshot artifacts (`docusaurus/versioned_docs/version-{NEW}/` and
  `docusaurus/versioned_sidebars/version-{NEW}-sidebars.json`) along with any
  other remaining changes.
- Create a follow-up commit, e.g.:

  ```
  docs: snapshot version {NEW}
  ```

- Push the branch to the remote (create one if the work is on `master`/`main`,
  e.g. `docs/bump-{NEW}`).
- Open a pull request against the default branch via `gh pr create`. Title:
  `docs: bump to Odra {NEW}`. Body should summarize:
  - Version bump applied across `docusaurus/docs/`
  - `versions.json` updated
  - Snapshot created under `versioned_docs/version-{NEW}/`
  - Any stragglers or manual-review items from Step 6

Confirm with the user before pushing or opening the PR if they haven't already
given blanket approval in this session.

## Notes

- The `justfile` target is defined as:
  ```
  docs-new-version version:
      cd docusaurus && npm run docusaurus docs:version {{version}}
  ```
- `versions.json` drives the version dropdown on the published site; the order matters
  (first = latest).
- Only commit after the user has reviewed and agreed in Step 4.
