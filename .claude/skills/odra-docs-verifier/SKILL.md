---
name: odra-docs-verifier
description: Verify that Rust code snippets in Odra Framework documentation actually compile. Use this skill whenever the user asks to check, verify, test, or audit code samples in Odra docs — phrases like "check the snippets in this md", "verify the examples", "make sure the tutorial compiles against v[X]", "find broken examples in the docs", or anything similar. Also use proactively when the user is updating Odra documentation or preparing a release.
---

# Odra Doc Verifier

This skill verifies that Rust code samples in Odra Framework documentation compile. Each `.md` file is treated as a standalone unit: extract every ```rust block, stitch them into one Odra contract, and build it inside a fresh sandbox project.

## Scope and assumptions

- Documentation lives in Markdown files. Only ```rust fenced blocks matter.
- Each `.md` file is **self-contained**. Never merge code across files.
- Code for one file may be **scattered across multiple blocks** in that file — concatenate them in document order before compiling.
- Snippets often have **gaps** (missing imports, undefined types, half-written functions). Fill these with the minimal code needed for `cargo odra build` to succeed. Don't invent business logic; add only the scaffolding the compiler needs.
- The target is the Odra Framework. Use `cargo odra` for scaffolding and building.

## Workflow

Do these steps in order, once per `.md` file the user wants verified.

### 1. Determine the Odra version

Ask the user which Odra version to verify against if they haven't said. The version is mandatory — `cargo odra new` needs it. If the docs themselves declare a version (in frontmatter, a heading, or a `Cargo.toml` snippet), prefer that and confirm with the user.

### 2. Scaffold a fresh sandbox project

Always work outside the user's repo. Create a throwaway directory and scaffold:

```bash
cargo odra new -n docs-verify -s {version-to-verify}
```

Replace `{version-to-verify}` with the actual version string. If a previous `docs-verify` directory exists from an earlier run, delete it first — a stale sandbox will mask new failures.

### 3. Extract all ```rust blocks from the file

Walk the Markdown in document order and pull out every fenced block tagged `rust`. Keep them in order and remember the source line number of each, so you can report failures precisely.

Skip blocks explicitly marked non-runnable: a `<!-- skip -->` HTML comment on the line above, or a tag like ```rust,ignore or ```rust,no_run. Respect those.

### 4. Stitch the snippets into one compilable unit

Concatenate the extracted blocks in document order. Then make the result compile by filling gaps with minimal code:

- **Missing imports** — add `use odra::prelude::*;` and any other `use` statements the snippets reference but don't declare.
- **Undefined types referenced by signatures** — define them as the simplest thing that satisfies the compiler. A struct mentioned only as a field type can be an empty `#[odra::module] pub struct Name;`. A trait used as a bound can be an empty trait.
- **Half-written functions** — if a function body is elided (e.g. `fn foo() { /* ... */ }` or just a signature), give it a body that returns a default value of the right type (`Default::default()`, `0`, `false`, `String::new()`, etc.).
- **Missing module wrapper** — if the snippets show methods but no enclosing `#[odra::module] impl Block { ... }`, wrap them in one. Pick a plausible module name from the file's title or filename.
- **Storage fields referenced but not declared** — add them to the module struct as `Var<T>` or `Mapping<K, V>` with a type the usage implies.

The principle: add the smallest amount of code that makes `cargo odra build` succeed without changing anything the docs actually wrote. Never edit lines that came from the snippets — only add new lines around them. If a snippet is internally contradictory (e.g. calls a method with the wrong arity), that's a real doc bug — leave it as-is and let the build fail so it gets reported.

Write the stitched result to `src/lib.rs` (or the appropriate module file) inside the sandbox, replacing whatever `cargo odra new` generated.

### 5. Build

From the sandbox directory:

```bash
cargo odra build
```

Capture stdout, stderr, and exit code.

### 6. Report

If the build succeeded, say so plainly with the file name and Odra version checked.

If it failed, produce a report with:

- The `.md` file checked and the Odra version used
- Each compiler error from `cargo odra build`, with:
  - The error message (trimmed to the relevant lines, not the whole cargo wall of text)
  - The line in the **stitched file** where it occurred
  - A best-effort mapping back to the **original `.md` file and line number** of the offending snippet
  - Whether the error is in original snippet code (a real doc bug) or in gap-filling code you added (means your scaffolding was wrong — try to fix and rebuild before reporting)
- A one-sentence diagnosis where the cause is obvious (renamed API, changed trait signature, missing `#[odra::module]` attribute, etc.)

If you had to add gap-filling code to make things compile, mention briefly what you added so the user can sanity-check that you didn't paper over a real bug.

## Iterating on gap-fills

Your first stitched version often won't compile because you guessed wrong about a missing type. That's expected. Read the compiler errors, adjust the gap-fills, rebuild. Two or three passes is normal. Stop iterating when either (a) the build succeeds, or (b) the remaining errors are clearly inside original snippet code rather than your scaffolding — at that point the failures are the report.

Don't loop forever. If you're past five rebuild attempts and still fighting your own scaffolding, stop and tell the user what you tried; the doc might be structured in a way this skill doesn't handle well.

## Output format

Default to a short Markdown report:

```markdown
# Odra doc verification: `docs/erc20.md`

**Odra version:** 1.4.0
**Result:** ❌ build failed (2 errors)

## Errors

### `docs/erc20.md:88` — unknown method
`Mapping::set` takes 2 arguments but the snippet passes 3. Likely the docs predate the v1.2 signature change.

### `docs/erc20.md:142` — type mismatch
`transfer` returns `Result<(), Error>` but the snippet assigns it to `bool`.

## Gap-fills added
- `use odra::prelude::*;`
- Empty `#[odra::module] pub struct Erc20 { balances: Mapping<Address, U256> }` wrapper around the scattered method blocks.
```

Keep it scannable. The user wants a verdict and a list of broken lines, not a wall of cargo output.