---
sidebar_position: 7
description: Migration guide to v3.0.0
---

# Migration guide to v3.0.0 from 2.*

Odra v3.0.0 moves to the Casper 2.x **addressable entity** stack: `casper-types` 7, `casper-storage` 5
and `casper-execution-engine` 9. That is what makes it a major release.

Most projects need no code changes — rebuild and carry on. Read on if you store a caller's raw `Key`,
or have upgradable contracts already deployed. Two macro changes can also surface as compile errors,
see [Compile-time changes](#compile-time-changes).

## What changes

Casper 2.x replaces the separate `Account` and `Contract` records with a single **addressable
entity**. When a network switches the feature on, system contracts migrate during the protocol
upgrade; user accounts and contracts migrate **lazily**, each converting the first time it is used.

The visible consequence: a contract caller used to resolve to `Key::Hash(<package>)` and now resolves
to `Key::AddressableEntity(<entity>)` — a different key.

## Your contract addresses do not change

Odra normalises both forms to the **package hash**, so `self.env().caller()` returns the same
`Address` before and after the switch. Balances, allowances, roles and ownership keyed by `Address`
keep resolving.

:::caution
This is an Odra guarantee, not a Casper one. A contract storing the raw `Key` from
`get_immediate_caller()` instead of an Odra `Address` will key the same caller under two different
entries across the switch. The upstream CEP-18 reference implementation has exactly this bug: tokens
held **by a contract** stay recorded under the old key and become unspendable by it. Account-held
balances are fine, and Odra's own `Cep18` is unaffected because it keys by `Address`.
:::

## Upgrading contracts deployed with Odra 2.x

A package installed before the switch keeps its legacy record until something migrates it, and that
must happen **before** a new version is added — adding a version to an unmigrated package does not
take effect correctly.

**Any successful contract call performs the migration.** Nothing is special about how: the first call
that succeeds converts the package. Odra 3.0.0 installs a no-op entry point, `odra_noop`, on every
contract only so the upgrade flow always has a call it knows is free of side effects.

Contracts installed with Odra 2.9.x and earlier lack `odra_noop` but do not need it — **call any safe
entry point first, in a separate deploy, and the package migrates the same way.** Prefer a read-only
getter (`name()`, `total_supply()`, `get()`): the call really executes on-chain, so anything with
side effects will have them.

```bash
casper-client put-deploy \
  --session-package-hash "hash-<contract-package-hash>" \
  --session-entry-point "total_supply" \
  --node-address "$NODE_ADDRESS" --chain-name "$CHAIN_NAME" \
  --secret-key "$SECRET_KEY" --payment-amount "$PAYMENT"
```

:::caution
Pre-3.0.0 contracts hit a second obstacle after migrating. Odra tracks a package's current version in
an `odra_latest_version_<package-hash>` named key written at install time; pre-3.0.0 installs have
none, and a migrated package cannot be read from wasm, so the upgrade reverts with
`ContractNotFound`.

The reliable option today is to **upgrade with Odra 3.0.0 before the network switches**, so the
contract gains both `odra_noop` and the version key.
:::

## Testing across the switch

The test VM runs in addressable-entity mode by default. To span the migration, boot it in legacy mode
and flip it with `HostEnv::enable_addressable_entity`:

```bash
ODRA_CASPER_LEGACY_GENESIS=1 cargo odra test -b casper
```

```rust
#[test]
fn state_survives_the_switch() {
    let env = odra_test::env();
    let mut token = MyToken::deploy(&env, NoArgs);
    let alice = env.get_account(1);

    token.transfer(&alice, &100.into());

    // False when the switch is unavailable: the OdraVM backend, or a casper
    // backend already in addressable-entity mode.
    if !env.enable_addressable_entity() {
        return;
    }

    assert_eq!(token.balance_of(&alice), 100.into());
    token.transfer(&alice, &1.into());
    assert_eq!(token.balance_of(&alice), 101.into());
}
```

The switch reopens the chain state with an entity-enabled configuration and runs a protocol upgrade —
the same path a real network takes.

:::note
Because `enable_addressable_entity()` returns `false` on backends without the switch, such a test is
safe to run anywhere but only *proves* something on the casper backend with
`ODRA_CASPER_LEGACY_GENESIS=1`. Make sure your CI runs it that way, or it passes without executing.
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

### `Erc20::mint` and `Erc20::burn` are no longer entry points

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

### Block time is shifted with `Duration`

`HostEnv::advance_block_time` and `advance_with_auctions` take a `core::time::Duration` instead of
a number of milliseconds, and `auction_delay()` / `unbonding_delay()` return one. The old `u64`
calls fail to compile with *expected `Duration`, found integer*; wrap the value:

```rust
use core::time::Duration;

env.advance_block_time(60 * 60 * 1000);               // before
env.advance_block_time(Duration::from_secs(60 * 60)); // after

env.advance_with_auctions(env.auction_delay() * 2);   // unchanged: Duration * 2
```

Reading the block time is unchanged: `block_time()` / `block_time_millis()` / `block_time_secs()`
still return `u64`, as does `ContractEnv::get_block_time()` inside a contract.

### `#[odra::module(name = "..")]` names the package

Until now `name` only changed the contract's name in the schema. It now also decides the named key
the package hash is stored under when the contract is installed through Odra (`InstallConfig`,
`UpgradeConfig`, `load_or_deploy`): `<name>_package_hash` instead of `<StructName>_package_hash`.
A contract with a `name` that was installed with 2.x keeps its old key; a fresh install with 3.0
uses the new one, so scripts that look the package up by the named key have to follow. Modules
without `name` are unaffected.
