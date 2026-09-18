---
sidebar_position: 7
description: How to write tests in Odra
---

# Testing
Thanks to the Odra framework, you can test your code in any way you are used to. This means you can write
regular Rust unit and integration tests. Have a look at how we test the Dog Contract we created in the
previous article:

```rust title="examples/src/features/storage/list.rs"
use odra::prelude::*;

#[cfg(test)]
mod tests {
    use super::{DogContract3, DogContract3InitArgs};
    use odra::{host::Deployer, prelude::*};

    #[test]
    fn init_test() {
        let test_env = odra_test::env();
        let init_args = DogContract3InitArgs {
            name: "DogContract".to_string()
        };
        let mut dog_contract = DogContract3::deploy(&test_env, init_args);
        assert_eq!(dog_contract.walks_amount(), 0);
        assert_eq!(dog_contract.walks_total_length(), 0);
        dog_contract.walk_the_dog(5);
        dog_contract.walk_the_dog(10);
        assert_eq!(dog_contract.walks_amount(), 2);
        assert_eq!(dog_contract.walks_total_length(), 15);
    }
}
```

The first interesting thing you may notice is placed the import section.

```rust
use super::{DogContract3, DogContract3InitArgs};
use odra::{host::Deployer, prelude::*};
```

We are using `super` to import the `DogContract3` and `DogContract3InitArgs` from the parent module.
`{{ModuleName}}InitArgs` is a type that was generated for us by Odra, alongside with the code in the 
code inside `{{ModuleName}}`.


`DogContract3InitArgs` is a struct that we use to initialize the contract and implements [`InitArgs`] trait.
Considering the contract initialization, there three possible scenarios:
1. The contract has a constructor with arguments, then Odra creates a struct named `{{ModuleName}}InitArgs`.
2. The contract has a constructor with no arguments, then you can use `odra::host::NoArgs`.
3. The contract does not have a constructor, then you can use `odra::host::NoArgs`.
All of those structs implement the `odra::host::InitArgs` trait, required to conform to the
`Deployer::deploy` method signature. 

The other import is `odra::host::Deployer`. This is a trait is used to deploy the contract and give us a reference to it.

Let's take a look at the test itself. How to obtain a reference to the contract?
 `{{ModuleName}}` implements the [`Deployer`] trait, which provides the `deploy` method:

```rust title="examples/src/features/storage/list.rs"
let mut dog_contract = DogContract3::deploy(&test_env, init_args);
```

From now on, we can use `dog_contract` to interact with our deployed contract.
Its type is `DogContract3HostRef`, which is a reference to the contract that we can use to interact with it (call entrypoints)
and implements [`HostRef`] trait.
In particular, all
`pub` functions from the impl section
that was annotated with the `odra::module` attribute are available to us in this type:

```rust title="examples/src/features/storage/list.rs"
// Impl
pub fn walk_the_dog(&mut self, length: u32) {
    self.walks.push(length);
}

...

// Test
dog_contract.walk_the_dog(5);
```

## HostEnv

Odra gives us some additional functions that we can use to communicate with the host (outside the contract context)
and to configure how the contracts are deployed and called. Let's revisit the example from the previous
article about host communication and implement the tests that prove it works:

```rust title="examples/src/features/host_functions.rs"
#[cfg(test)]
mod tests {
    use super::{HostContract, HostContractInitArgs};
    use odra::{host::{Deployer, HostEnv}, prelude::*};

    #[test]
    fn env() {
        let test_env: HostEnv = odra_test::env();
        test_env.set_caller(test_env.get_account(0));
        let init_args = HostContractInitArgs {
            name: "MyContract".to_string()
        };
        let host_contract = HostContract::deploy(&test_env, init_args);
        let creator = host_contract.created_by();
        test_env.set_caller(test_env.get_account(1));
        let init_args = HostContractInitArgs {
            name: "MyContract2".to_string()
        };
        let host_contract2 = HostContract::deploy(&test_env, init_args);
        let creator2 = host_contract2.created_by();
        assert_ne!(creator, creator2);
    }
}
```
In the code above, at the beginning of the test, we are obtaining a `HostEnv` instance using `odra_test::env()`.
Next, we are deploying two instances of the same contract, but we're using `HostEnv::set_caller`
to change the caller - so the Address which is deploying the contract. This changes the result of the `odra::ContractEnv::caller()`
the function we are calling inside the contract.

`HostEnv` comes with a set of functions that will let you write better tests:

- `fn set_caller(&self, address: Address)` - you've seen it in action just now
- `fn balance_of<T: Addressable>(&self, addr: &T) -> U512` - returns the balance of the account associated with the given address
- `fn block_time(&self) -> u64` - returns the current value of `block_time` in milliseconds, alias: `block_time_millis`
- `fn block_time_secs(&self) -> u64` - retuns the current value of `block_time` in seconds
- `fn advance_block_time(&self, time_diff: Duration)` - increases the current value of `block_time` by `time_diff`
  (`core::time::Duration`; block time has millisecond resolution)
- `fn get_account(&self, n: usize) -> Address` - returns an n-th address that was prepared for you by Odra in advance;
  by default, you start with the 0-th account
- `fn emitted_event<T: ToBytes + EventInstance, R: Addressable>(&self, contract_address: &R, event: T) -> bool` - verifies if the event was emitted by the contract
- `fn take_snapshot(&self)` / `fn restore_snapshot(&self)` - remember the state of the test VM and bring
  it back, see [Snapshots](#snapshots) below
- `fn concurrently<T, R>(&self, items: Vec<T>, f: impl Fn(&HostEnv, T) -> R) -> Vec<R>` - runs `f` once
  per item; one after another here, on worker threads on [livenet](../backends/04-livenet.md#doing-several-things-at-once)
- `fn enable_addressable_entity(&self) -> bool` - switches the backend from legacy mode to
  addressable-entity mode, migrating the chain state like a real network upgrade would; returns
  `false` if the backend does not support the switch or already runs in that mode (see the
  [v3.0.0 migration guide](../migrations/to-3.0.0.md))

Full list of functions can be found in the [`HostEnv`] documentation.

## Snapshots

A test often needs one expensive setup (deploy a few contracts, mint, approve, wire them together)
and then several scenarios branching off it. Instead of repeating the setup, take a snapshot of
the VM and go back to it:

```rust title="examples/src/features/testing.rs"
let env = odra_test::env();
let token = OwnedToken::deploy(&env, /* .. */);
// ... configure the contracts ...

env.take_snapshot();

// Scenario A
token.transfer(&alice, &U256::from(100));
env.advance_block_time(Duration::from_secs(60 * 60));
assert_eq!(token.balance_of(&alice), U256::from(100));

// Back to the starting point: scenario A never happened.
env.restore_snapshot();
assert_eq!(token.balance_of(&alice), U256::zero());

// Scenario B starts from the same point; the snapshot can be restored again and again.
```

A snapshot covers the contract storage, CSPR balances, events and the block time. Only the last
snapshot is kept: taking a new one replaces it. The caller chosen with `set_caller` and the gas
report are not part of it. Snapshots work on OdraVM and on CasperVM (where restoring is only a
pointer back to an older state root); on livenet the state lives on a real chain, so
`take_snapshot` panics there.

## Choosing the backend

`odra_test::env()` returns the backend selected by the `ODRA_BACKEND` environment variable:
`cargo odra test` runs your tests on OdraVM, `cargo odra test -b casper` sets the variable and runs
them against the Casper execution engine, using the wasm files built from the contracts listed in
`Odra.toml`.

Sometimes a test should not follow that switch. A typical case is a module that is used only as a
building block of other contracts and is not registered in `Odra.toml` - there is no wasm file for
it, so under `-b casper` `deploy` would fail. Such a test can be pinned to OdraVM with
`odra_test::odra_env()`:

```rust title="examples/src/features/testing.rs"
#[test]
fn odra_vm_only() {
    let test_env = odra_test::odra_env();
    let owner = test_env.get_account(0);
    let ownable = Ownable::deploy(&test_env, OwnableInitArgs { owner });
    assert_eq!(ownable.get_owner(), owner);
}
```

`odra_test::casper_env()` does the opposite and always uses the Casper backend.

## What's next
We take a look at how Odra handles errors!

[`HostRef`]: https://docs.rs/odra/2.9.0/odra/host/trait.HostRef.html
[`InitArgs`]: https://docs.rs/odra/2.9.0/odra/host/trait.InitArgs.html
[`HostEnv`]: https://docs.rs/odra/2.9.0/odra/host/struct.HostEnv.html
[`Deployer`]: https://docs.rs/odra/2.9.0/odra/host/trait.Deployer.html
