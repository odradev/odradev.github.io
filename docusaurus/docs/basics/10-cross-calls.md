---
sidebar_position: 11
description: Contracts calling contracts
---

# Cross calls

To show how to handle calls between contracts, first, let's implement two of them:

```rust title="examples/src/features/cross_calls.rs"
use odra::{prelude::*, Address, External};

#[odra::module]
pub struct CrossContract {
    pub math_engine: External<MathEngineContractRef>
}

#[odra::module]
impl CrossContract {
    pub fn init(&mut self, math_engine_address: Address) {
        self.math_engine.set(math_engine_address);
    }

    pub fn add_using_another(&self) -> u32 {
        self.math_engine.add(3, 5)
    }
}

#[odra::module]
pub struct MathEngine;

#[odra::module]
impl MathEngine {
    pub fn add(&self, n1: u32, n2: u32) -> u32 {
        n1 + n2
    }
}
```
`MathEngine` contract can add two numbers. `CrossContract` takes an `Address` in its `init` function and saves it in
storage for later use. If we deploy the `MathEngine` first and take note of its address, we can then deploy
`CrossContract` and use `MathEngine` to perform complicated calculations for us!

To perform a cross-contact call, we use the `External` module component and wrap the `{{ModuleName}}ContractRef` 
that was created for us by Odra:

```rust title="examples/src/features/cross_calls.rs"
pub struct CrossContract {
    pub math_engine: External<MathEngineContractRef>
}
```

and then we use the `math_engine` like any other contract/module:

```rust title="examples/src/features/cross_calls.rs"
self.math_engine.add(3, 5)
```

Alternatively, we could store a raw `Address`, then use the `{{ModuleName}}ContractRef` directly:

```rust title="examples/src/features/cross_calls.rs"
MathEngineContractRef::new(self.env(), math_engine_address).add(3, 5)
```

## Contract Ref
We mentioned `HostRef` already in our [Testing](07-testing.md) article - a host side reference to already deployed contract.

In the module context we use a `ContractRef` instead, to call other contracts.

Similarly to the `{{ModuleName}}HostRef`, the `{{ModuleName}}ContractRef` is generated automatically, 
by the `#[odra::module]` attribute.

The reference implements all the public endpoints to the contract (those marked as `pub` in `#[odra::module]`
impl), and the `{{ModuleName}}ContractRef::address()` function, which returns the address of the contract.

# External Contracts
Sometimes in our contract, we would like to interact with a someone else's contract, already deployed onto the blockchain. The only thing we know about the contract is the ABI.

For that purpose, we use `#[odra:external_contract]` attribute. This attribute should be applied to a trait. The trait defines the part of the ABI we would like to take advantage of.

Let's pretend the `MathEngine` we defined is an external contract. There is a contract with `add()` function that adds two numbers somewhere.

```rust
#[odra::external_contract]
pub trait Adder {
    fn add(&self, n1: u32, n2: u32) -> u32;
}
```

Analogously to modules, Odra creates the `AdderContractRef` struct (and `AdderHostRef` to be used in tests, but do not implement the `Deployer` trait). Having an address, in the module context we can call:

```rust
struct Contract {
    adder: External<AdderContractRef>
}
// in some function
self.adder.add(3, 5)

// or

struct Contract {
    adder: Var<Address>
}
// in some function
AdderContractRef::new(self.env(), address).add(3, 5)
```

### Loading the contract
Sometimes it is useful to load the deployed contract instead of deploying it by ourselves. This is especially useful when we want to test
our contracts in [Livenet](../backends/04-livenet.md) backend. We can load the contract using `load` method on the `Deployer`:

```rust title="examples/bin/erc20_on_livenet.rs"
fn _load(env: &HostEnv) -> Erc20HostRef {
    let address = "hash-d26fcbd2106e37be975d2045c580334a6d7b9d0a241c2358a4db970dfd516945";
    let address = Address::from_str(address).unwrap();
    <Erc20HostRef as HostRefLoader>::load(env, address)
}
```

## Testing
Let's see how we can test our cross calls using this knowledge:

```rust title="examples/src/features/cross_calls.rs"
#[cfg(test)]
mod tests {
    use super::{CrossContractHostRef, CrossContractInitArgs, MathEngineHostRef};
    use odra::host::{Deployer, HostRef, NoArgs};

    #[test]
    fn test_cross_calls() {
        let test_env = odra_test::env();
        let math_engine_contract = MathEngineHostRef::deploy(&test_env, NoArgs);
        let cross_contract = CrossContractHostRef::deploy(
            &test_env,
            CrossContractInitArgs {
                math_engine_address: *math_engine_contract.address()
            }
        );
        assert_eq!(cross_contract.add_using_another(), 8);
    }
}
```

Each test begins with a clean instance of the blockchain, with no contracts deployed. To test an external contract, we first deploy a `MathEngine` contract, although we won't directly utilize it. Instead, we only extract its address. Let's continue assuming there is a contract featuring the `add()` function that we intend to utilize.

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use odra::{Address, host::{Deployer, HostRef, NoArgs}};
    
    #[test]
    fn test_ext() {
        let test_env = odra_test::env();
        let adder = AdderHostRef::new(&test_env, get_adder_address(&test_env)).add(3, 5)
        assert_eq!(adder.add(1, 2), 3);
    }

    fn get_adder_address(test_env: &HostEnv) -> Address {
        let contract = MathEngineHostRef::deploy(test_env, NoArgs);
        *contract.address()
    }
}
```
