---
sidebar_position: 13
---

# Dapp Registry

A dapp on Casper is usually more than one contract: a token, a vault, a governance contract, a few
contracts deployed later by a factory. Wallets, explorers and other tools see them as unrelated
package hashes. The `dapp` modules of `odra-modules` group them: a **registry** contract describes the
dapp and lists the contracts that belong to it, and every **member** contract points back to its
registry, so the membership can be verified from both sides.

## Overview

The modules live in `odra_modules::dapp`:

| Item | Kind | Purpose |
|---|---|---|
| `DappRegistryBase` | module | Stores the dapp metadata and the list of member contracts. |
| `DappContractBase` | module | Stores the address of the registry a contract belongs to. |
| `OwnedDappRegistry` | contract | A ready-to-deploy registry: `DappRegistryBase` guarded by `Ownable`. |
| `DappRegistry` | external contract trait | The registry interface, used to call a registry by address. |
| `DappContract` | external contract trait | The member interface, used to call a member by address. |
| `DappMetadata` | type | Name, description, website URL and icon URL of the dapp. |

The registry itself always belongs to the dapp: `get_dapp_contracts` returns it first, and
`is_dapp_contract` is `true` for its own address.

### Verification

When a contract is added, the registry calls `get_dapp_registry` on it and reverts with
`DappRegistryMismatch` unless the contract returns the registry's address. Nobody can list a contract
in a dapp it does not belong to, and a member cannot claim a registry that has not accepted it.

Every contract you add must therefore expose a `get_dapp_registry` entry point. Adding an account
address reverts with `NotAContract`; adding a contract without that entry point fails with a VM error.

### Factories

A contract added with `is_factory = true` may register the contracts it deploys. `OwnedDappRegistry`
lets the owner add any contract, and a registered factory add contracts that are not factories
themselves. Removing a contract also removes its factory permission.

### Authorization

`DappRegistryBase` and `DappContractBase` do not check who calls them. Their read-only functions
are entry points; the functions that change state (`set_dapp_metadata`, `add_dapp_contract`,
`remove_dapp_contract` and `set_dapp_registry`) are plain Rust methods that are not exposed by the
module. The contract that composes the module decides who may call them, with `Ownable`,
`AccessControl` or its own rules.

## Deploying a registry

`OwnedDappRegistry` is the quickest way to start. The deployer becomes the owner.

```rust
use odra::host::{Deployer, HostRef, NoArgs};
use odra_modules::dapp::{DappMetadata, OwnedDappRegistry};

let mut registry = OwnedDappRegistry::deploy(&env, NoArgs);
registry.set_dapp_metadata(DappMetadata {
    name: "My Dapp".to_string(),
    description: "Lending on Casper".to_string(),
    website_url: "https://mydapp.io".to_string(),
    icon_url: "https://mydapp.io/icon.png".to_string()
});
```

It exposes:

- `set_dapp_metadata`, `remove_dapp_contract`: owner only.
- `add_dapp_contract`: the owner, or a registered factory adding a contract that is not a factory.
- `get_dapp_metadata`, `get_dapp_contracts`, `is_dapp_contract`, `is_dapp_factory`, `get_dapp_registry`.
- `get_owner`, `transfer_ownership`, `renounce_ownership` from `Ownable`.

## Writing a member contract

Compose `DappContractBase` and set the registry in `init`. Delegate `get_dapp_registry` so the
registry can verify the contract. Exposing `set_dapp_registry` is optional; if you do, guard it.

```rust
use odra::prelude::*;
use odra_modules::access::Ownable;
use odra_modules::dapp::DappContractBase;

#[odra::module]
pub struct Vault {
    ownable: SubModule<Ownable>,
    dapp: SubModule<DappContractBase>
}

#[odra::module]
impl Vault {
    pub fn init(&mut self, registry: Address) {
        let owner = self.env().caller();
        self.ownable.init(owner);
        self.dapp.set_dapp_registry(&registry);
    }

    pub fn set_dapp_registry(&mut self, registry: &Address) {
        self.ownable.assert_owner(&self.env().caller());
        self.dapp.set_dapp_registry(registry);
    }

    delegate! {
        to self.dapp {
            fn get_dapp_registry(&self) -> Address;
        }
    }
}
```

Then deploy the member with the registry address and add it:

```rust
let vault = Vault::deploy(&env, VaultInitArgs { registry: registry.address() });
registry.add_dapp_contract(&vault.address(), false);

assert_eq!(registry.get_dapp_contracts(), vec![registry.address(), vault.address()]);
```

## Building your own registry

To use other rules than a single owner, compose `DappRegistryBase` with another access module.
Here, only accounts with a curator role manage the dapp:

```rust
use odra::prelude::*;
use odra_modules::access::{AccessControl, Role, DEFAULT_ADMIN_ROLE};
use odra_modules::dapp::{DappMetadata, DappRegistryBase};

/// Accounts with this role may add and remove contracts.
pub const CURATOR_ROLE: Role = [1u8; 32];

#[odra::module]
pub struct CuratedDappRegistry {
    access_control: SubModule<AccessControl>,
    dapp: SubModule<DappRegistryBase>
}

#[odra::module]
impl CuratedDappRegistry {
    pub fn init(&mut self, metadata: DappMetadata) {
        let admin = self.env().caller();
        self.access_control.unchecked_grant_role(&DEFAULT_ADMIN_ROLE, &admin);
        self.access_control.unchecked_grant_role(&CURATOR_ROLE, &admin);
        self.dapp.set_dapp_metadata(metadata);
    }

    pub fn add_dapp_contract(&mut self, dapp_contract: &Address, is_factory: bool) {
        self.access_control.check_role(&CURATOR_ROLE, &self.env().caller());
        self.dapp.add_dapp_contract(dapp_contract, is_factory);
    }

    pub fn remove_dapp_contract(&mut self, dapp_contract: &Address) {
        self.access_control.check_role(&CURATOR_ROLE, &self.env().caller());
        self.dapp.remove_dapp_contract(dapp_contract);
    }

    delegate! {
        to self.dapp {
            fn get_dapp_metadata(&self) -> DappMetadata;
            fn get_dapp_contracts(&self) -> Vec<Address>;
            fn is_dapp_contract(&self, dapp_contract: &Address) -> bool;
            fn is_dapp_factory(&self, dapp_contract: &Address) -> bool;
            fn get_dapp_registry(&self) -> Address;
        }
        to self.access_control {
            fn has_role(&self, role: &Role, address: &Address) -> bool;
            fn grant_role(&mut self, role: &Role, address: &Address);
            fn revoke_role(&mut self, role: &Role, address: &Address);
        }
    }
}
```

To let factories register contracts in such a registry, call `self.dapp.assert_dapp_factory(&caller)`
for callers without the role, as `OwnedDappRegistry` does.

## Registering contracts deployed by a factory

A contract that deploys other contracts can register them right away, once the registry lists it as a
factory. The flow, using [Odra factories](../advanced/09-factory.md):

1. The admin adds the spawning contract with `add_dapp_contract(&spawner, true)`.
2. The spawner calls `new_contract` on a factory and passes the registry address to the new contract's `init`.
3. The spawner calls `add_dapp_contract(&new_contract, false)` on the registry through
   `DappRegistryContractRef`.
4. The registry checks that the caller is a registered factory, calls `get_dapp_registry` on the new
   contract and adds it.

```rust
use odra::{prelude::*, ContractRef};
use odra_modules::dapp::{DappContractBase, DappRegistryContractRef};

#[odra::module]
pub struct DappCounterSpawner {
    dapp: SubModule<DappContractBase>,
    factory: Var<Address>,
    spawned: Var<u32>
}

#[odra::module]
impl DappCounterSpawner {
    // `init` and `get_dapp_registry` omitted.

    pub fn spawn(&mut self) -> Address {
        let registry = self.dapp.get_dapp_registry();
        let factory = self.factory.get().unwrap_or_revert(self);
        let n = self.spawned.get_or_default();
        // The name keys the child in the factory, so each child gets its own.
        let mut factory = DappCounterFactoryContractRef::new(self.env(), factory);
        let (address, _) = factory.new_contract(format!("DappCounter{}", n), registry);
        self.spawned.set(n + 1);

        DappRegistryContractRef::new(self.env(), registry).add_dapp_contract(&address, false);
        address
    }
}
```

The whole example, with the `DappCounter` contract and a test, is in
[`examples/src/factory/dapp.rs`](https://github.com/odradev/odra/blob/release/2.10.0/examples/src/factory/dapp.rs).

:::note
Factories work on the Casper VM only, so run such tests with `cargo odra test -b casper`.
:::

## Events and errors

Events:

| Event | Emitted by | Fields |
|---|---|---|
| `DappMetadataChanged` | registry | `name`, `description`, `website_url`, `icon_url` |
| `DappContractAdded` | registry | `contract`, `is_factory`, `registrar` (the caller) |
| `DappContractRemoved` | registry | `contract`, `registrar` |
| `DappRegistryChanged` | member | `previous_registry`, `new_registry` |

Errors (`odra_modules::dapp::errors::Error`):

| Error | Code | When |
|---|---|---|
| `NotAContract` | 22000 | An account address is added, or set as a registry. |
| `DappContractAlreadyRegistered` | 22001 | The contract, or the registry itself, is already in the dapp. |
| `DappContractNotRegistered` | 22002 | Removing a contract that is not in the dapp. |
| `DappRegistryMismatch` | 22003 | The contract's `get_dapp_registry` returns a different address. |
| `CallerNotDappFactory` | 22004 | A contract that is not a registered factory tries to add a contract. |
| `DappRegistryNotSet` | 22005 | `get_dapp_registry` is called on a member before its registry is set. |
| `CannotRemoveDappRegistry` | 22006 | Removing the registry itself. |

## Things to know

- Removing a contract moves the last contract into its place, so the order of `get_dapp_contracts`
  changes.
- `get_dapp_contracts` reads every member from storage. For a dapp with many contracts, prefer
  `is_dapp_contract` in contract code.
