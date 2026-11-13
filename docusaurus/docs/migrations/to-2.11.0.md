---
sidebar_position: 8
description: Migration guide to v2.11.0
---

# Migration guide to v2.11.0 from 2.10

Odra v2.11.0 needs no changes in contract code. Bump the version:

```toml
odra = "2.11.0"
```

and install the matching build tool. `cargo-odra` 0.2.1 goes with Odra 2.11:

```bash
cargo install cargo-odra --locked
```

Two things are worth a look:

- [`cargo odra test -- <args>`](#test-arguments) passes the arguments to the test binary. A command
  that passed arguments to `cargo test` itself needs a small change.
- [`odra::link_contract_crates!()`](#link-contract-crates) is one optional line that replaces the
  hand-written `use` of a dependency whose contracts you build.

## Arguments of `cargo odra test` {#test-arguments}

With `cargo-odra` 0.2.1 the arguments after `--` go to the test binary, as they do after
`cargo test --`:

```bash
cargo odra test -- --nocapture
```

Before, they were appended to the arguments of `cargo test`, so this command failed with
`unexpected argument '--nocapture'`. A name filter keeps working as it did: `cargo odra test -- two`.

Arguments for `cargo test` itself now go before a second `--`. If you passed such arguments, add the
second `--`:

```bash
# before
cargo odra test -- --release
# after
cargo odra test -- --release --
# both kinds
cargo odra test -- --release -- --nocapture
```

Without it, the test binary rejects the option (`Unrecognized option: 'release'`).

The name filter may now also be given before the `--`: `cargo odra test two -- --nocapture`.

## Contracts from dependency crates {#link-contract-crates}

A project that builds a contract of a dependency (`fqn = "odra_modules::erc20::Erc20"` in `Odra.toml`)
had to mention the crate in both build binaries, because Rust links a dependency only where it is
used:

```rust title="bin/build_contract.rs, bin/build_schema.rs"
use my_project;
use odra_modules;
```

That still works. With Odra 2.11.0 you can replace it with one line that follows `Odra.toml`:

```rust title="bin/build_contract.rs, bin/build_schema.rs"
use my_project;

odra::link_contract_crates!();
```

New projects have this line already. An optional dependency, or one from a
`[target.*.dependencies]` table, still needs its own `use`. See
[Odra.toml](../basics/03-odra-toml.md#linking-the-other-crate).

`cargo odra build` 0.2.1 also checks the wasm it built: if the contract's crate was not linked, it
stops with an error that names the crate. Before, it could save a wasm without entry points when the
crate's name appeared only in a comment.

## Faster builds

Nothing to do here. `cargo odra build`, `cargo odra schema` and `cargo odra test -b casper` no longer
rebuild crates that do not define the contract being built, such as `odra-modules` in a project that
depends on it. In Odra's own examples this takes a contract from about 7.3 s to 5.1 s. It needs both
Odra 2.11.0 and `cargo-odra` 0.2.1; either one with an older counterpart builds as before.

If you build contracts without `cargo odra`, see
[Building contracts manually](../advanced/06-building-manually.md) for the variables involved.
