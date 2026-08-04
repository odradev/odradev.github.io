# Odra.dev webiste

Source for:
- https://odra.dev
- https://odra.dev/blog 
- https://odra.dev/docs 
- https://odra.dev/llms.txt — generated documentation index for LLM agents

## Publishing
The code is automatically published after push to the `master` branch.

## Local development
```
$ just install
$ just develop
```
## Create new version

```
just docs-new-version version
```

## Related repositories

This repo holds the documentation only. The code it documents lives elsewhere:

- [odradev/odra](https://github.com/odradev/odra) — the framework itself, plus the project
  templates that `cargo odra new` generates from
- [odradev/cargo-odra](https://github.com/odradev/cargo-odra) — the `cargo odra` project
  generator and build tool (`cargo install cargo-odra --locked`)
- [odradev/odradev-plugins](https://github.com/odradev/odradev-plugins) — Claude Code plugin
  with skills for agentic Odra development

When a change lands in any of them, check whether
[getting-started/installation](docusaurus/docs/getting-started/installation.md) and the
[intro](docusaurus/docs/intro.md) still describe the setup correctly — those two pages are what
users and AI agents read first.

Note that docs are versioned: an edit to `docusaurus/docs/` usually needs the same edit in
`docusaurus/versioned_docs/version-<latest>/` to reach readers of the current release or release of the new version of the docs.

Adding, renaming or removing a page changes `static/llms.txt`, which is regenerated on every build
and is what AI agents read. The Claude Code plugin keeps an annotated copy at
`plugins/odra-plugin/reference/docs-map.md` in
[odradev/odradev-plugins](https://github.com/odradev/odradev-plugins) — update it in the same batch
so agents do not chase URLs that no longer exist.

## Contact
You can reach us at **contact@odra.dev**.
