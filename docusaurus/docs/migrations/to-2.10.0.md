---
sidebar_position: 7
description: Migration guide to v2.10.0
---

# Migration guide to v2.10.0 from 2.9

Odra v2.10.0 is a feature release on the same Casper stack as 2.9. Most projects only bump the
version:

```toml
odra = "2.10.0"
```

A few changes can still need attention:

- [Compile-time changes](#compile-time-changes): arguments of `#[odra::module]` on an `impl` block
  and a duplicated `#[odra::external_contract]` trait.
- [`Erc20::mint` and `Erc20::burn`](#erc20-mint-burn) are no longer entry points (a security fix).
- [`#[odra::module(name = "..")]`](#module-name) also names the package-hash key.
- [Livenet client and error codes](#livenet-client-and-error-codes), for code that uses
  `CasperClient` directly or matches on error codes.
- [Custom backends](#custom-backends).

:::tip
`HostEnv::advance_block_time` and `advance_with_auctions` now also accept a `core::time::Duration`,
so `env.advance_block_time(Duration::from_secs(60))` states the unit itself. A number still means
milliseconds, so existing calls keep working.
:::

## Compile-time changes

Both are things that used to compile and silently did the wrong thing. If your project builds, you
are not affected.

### `#[odra::module(...)]` arguments on an `impl` block are an error

`events`, `errors`, `name`, `version` and `layout` belong to the module struct. Put on an `impl`
block they were parsed and ignored - the events never made it into the contract schema. Now the
compiler points at the misplaced argument:

```rust
#[odra::module(events = [Transfer])] // error: `events` is not allowed on an impl block
impl Token { ... }
```

Move the argument to the struct:

```rust
#[odra::module(events = [Transfer])]
pub struct Token { ... }

#[odra::module]
impl Token { ... }
```

Only `factory = on` is accepted on an `impl` block, and `#[odra::module]` on a trait takes no
arguments.

### `#[odra::external_contract]` keeps the trait

The annotated trait is now emitted as written, and both `XxxContractRef` and `XxxHostRef`
implement it. Previously the trait disappeared, so a common workaround was to declare it twice:

```rust
#[odra::external_contract]
pub trait Adapter { fn owner_of(&self, token_id: TokenId) -> Option<Address>; }

pub trait Adapter { fn owner_of(&self, token_id: TokenId) -> Option<Address>; } // remove this copy
```

That copy now fails with *the name `Adapter` is defined multiple times* - delete it. The trait can
be used as a bound (`fn check<T: Adapter>(a: &T)`) or implemented by one of your modules.

## `Erc20::mint` and `Erc20::burn` are no longer entry points {#erc20-mint-burn}

In `odra-modules`, `Erc20::mint`, `Erc20::burn` and `Ownable::unchecked_transfer_ownership` moved out
of the `#[odra::module]` impl blocks. A contract built directly from `Erc20` had an unprotected `mint`
entry point; now these functions exist only in Rust, for a wrapping module to call behind its own
check (as `OwnedToken` in the examples does):

```rust
#[odra::module]
impl OwnedToken {
    pub fn mint(&mut self, address: &Address, amount: &U256) {
        self.ownable.assert_owner(&self.env().caller());
        self.erc20.mint(address, amount);
    }
}
```

`Erc20HostRef::mint` / `try_mint` and `burn` / `try_burn` are gone; if a test relied on them, mint
through your wrapping contract or use `initial_supply` in `init`.

## `#[odra::module(name = "..")]` names the package {#module-name}

Until now `name` only changed the contract's name in the schema. It now also decides the named key
the package hash is stored under when the contract is installed through Odra (`InstallConfig`,
`UpgradeConfig`, `load_or_deploy`): `<name>_package_hash` instead of `<StructName>_package_hash`.
A contract with a `name` that was installed with 2.9 or earlier keeps its old key; a fresh install with 2.10
uses the new one, so scripts that look the package up by the named key have to follow. Modules
without `name` are unaffected.

Upgrades are not affected: the package is found by its address and authorized by the access URef
the account holds, so an upgrade of a 2.9 deployment simply stores the package hash under the new
key as well. One thing to watch: the "already installed" guard (`allow_key_override = false`)
checks the *new* key name, so it no longer stops a fresh install next to a 2.9 deployment of the
same contract - use `load_or_deploy` or check `contracts.toml` rather than relying on the revert.

## Livenet client and error codes

Only code that uses `odra-casper-rpc-client` directly, or matches on error codes, is affected.

- `CasperClient::get_value`, `get_named_value`, `get_dictionary_value` and `events_count` return
  `Result<Option<_>>`: `Ok(None)` is a value the node does not have, `Err` is a node that could not be
  asked. Handle both cases where you used to get the value directly.
- `CasperClient::deploy_wasm` takes `&self` instead of `&mut self`.
- The blocking `CasperClient` calls panic inside a current-thread Tokio runtime and point to the new
  `xxx_async` methods. Use those, or a multi-thread runtime (`#[tokio::main]`).
- Reading a stored value as the wrong type reverts with the concrete `bytesrepr` error
  (`LeftOverBytes`, `EarlyEndOfStream`, ...) instead of `Formatting`. A named argument that exists but
  has the wrong type reverts with `ExecutionError::InvalidArg` (138) instead of `MissingArg`.

## Custom backends

`ContractContext` gained `call_stack` and `debug`, and `HostContext` gained `take_snapshot`,
`restore_snapshot` and `thread_env_factory`. All of them have default implementations, so an existing
backend keeps compiling; override them to support the new features.

`odra::entry_point_callback::EntryPoint` has a new `is_offchain` field. If you build entry points
with a struct literal, switch to `EntryPoint::new`, `new_payable` or `new_offchain`.
