---
sidebar_position: 6
description: Migration guide to v2.6.0
---

# Migration guide to v2.6.0 from 2.*

Odra v2.6.0 does not introduce any breaking changes in the smart contract code. However, upgrading requires bumping `cargo-odra` to **v0.1.7** in order to keep the build pipeline working with recent Rust toolchains.

## Update cargo-odra

Install the new version:

```bash
cargo install cargo-odra --version 0.1.7 --force --locked
```

Verify the installation:

```bash
cargo odra --version
```

## Why the update is required

`cargo-odra` runs `wasm-opt` (from Binaryen) as a post-processing step on every compiled contract. Starting with `nightly-2025-02-18` and stable `1.87.0`, Rust ships with LLVM 20, which enables the WebAssembly `bulk-memory` feature by default. This means `rustc` now emits `memory.copy` and `memory.fill` instructions directly, whereas older LLVM versions lowered them to inline loops or libc calls.

The version of `wasm-opt` bundled with `cargo-odra` does not accept these instructions unless it is told to both enable the `bulk-memory` feature and lower the LLVM-style memory intrinsics. As a result, building an Odra contract with a newer toolchain using an older `cargo-odra` fails during the `wasm-opt` step.

`cargo-odra` v0.1.7 detects the toolchain date and, when it is `2025-02-17` or later, automatically passes the following additional flags to `wasm-opt`:

- `--enable-bulk-memory`
- `--llvm-memory-copy-fill-lowering`

Older toolchains are unaffected — only `--signext-lowering` is applied, exactly as before.

## Do I need to change anything else?

No. There are no changes required in your contract code, tests, or `Odra.toml`. Once `cargo-odra` is updated, running `cargo odra build` and `cargo odra test` will work across both older and newer Rust toolchains without any further action.
