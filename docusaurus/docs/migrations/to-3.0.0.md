---
sidebar_position: 7
description: Migration guide to v3.0.0
---

# Migration guide to v3.0.0 from 2.*

Odra v3.0.0 moves to the Casper 2.x **addressable entity** stack: `casper-types` 7, `casper-storage` 5
and `casper-execution-engine` 9. That is what makes it a major release.

Most projects need no code changes — rebuild and carry on. Read on if you store a caller's raw `Key`,
or have upgradable contracts already deployed.

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
