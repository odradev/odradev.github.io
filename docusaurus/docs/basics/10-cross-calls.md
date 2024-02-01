---
sidebar_position: 10
description: Contracts calling contracts
---

# Cross calls

To show how to handle calls between contracts, first, let's implement two of them:

```rust title="examples/src/features/cross_calls.rs"
use odra::prelude::*;
use odra::{module::Module, Address, UnwrapOrRevert, Variable};

#[odra::module]
pub struct CrossContract {
    pub math_engine: Variable<Address>
}

#[odra::module]
impl CrossContract {
    pub fn init(&mut self, math_engine_address: Address) {
        self.math_engine.set(math_engine_address);
    }

    pub fn add_using_another(&self) -> u32 {
        let math_engine_address = self.math_engine.get().unwrap_or_revert(&self.env());
        MathEngineContractRef::new(self.env(), math_engine_address).add(3, 5)
    }
}

#[odra::module]
pub struct MathEngine {}

#[odra::module]
impl MathEngine {
    pub fn add(&self, n1: u32, n2: u32) -> u32 {
        n1 + n2
    }
}
```
`MathEngine` contract can add two numbers. `CrossContract` takes an `Address` in its init function and saves it in
storage for later use. If we deploy the `MathEngine` first and take note of its address, we can then deploy
`CrossContract` and use `MathEngine` to perform complicated calculations for us!

To call the external contract, we use the `Ref` that was created for us by Odra:

```rust title="examples/src/features/cross_calls.rs"
MathEngineContractRef::new(self.env(), math_engine_address).add(3, 5)
```

## Contract Ref
We mentioned `Ref` already in our [Testing](07-testing.md) article.
It is a reference to already deployed - running contract.
Here we are going to take a deeper look at it.

Similarly to a `Deployer`, the `Ref` is generated automatically, thanks to the `#[odra::module]` macro.
To get an instance of a reference, we can either deploy a contract (using `Deployer`) or by building it
directly, using `::at(address: Address)` method, as shown above.
The reference implements all the public endpoints to the contract (those marked as `pub` in `#[odra::module]`
impl), alongside couple methods:

- `at(Address) -> Self` - points the reference to an Address
- `address() -> Address` - returns the Address the reference is currently pointing at
- `with_tokens(Amount) -> Self` - attaches Amount of native tokens to the next call

# External Contracts
Sometimes in our contract, we would like to interact with a someone else's contract, already deployed onto the blockchain. The only thing we know about the contract is the ABI.

For that purpose, we use `#[odra:external_contract]` macro. This macro should be applied to a trait. The trait defines the part of the ABI we would like to take advantage of.

Let's pretend the `MathEngine` we defined is an external contract. There is a contract with `add()` function that adds two numbers somewhere.

```rust title="examples/src/features/cross_calls.rs"
#[odra::external_contract]
pub trait Adder {
    fn add(&self, n1: u32, n2: u32) -> u32;
}
```

Analogously to modules, Odra creates the `AdderRef` struct (but do not create the `AdderDeployer`). Having an address we can call:

```rust title="examples/src/features/cross_calls.rs"
AdderRef::new(self.env(), address).add(3, 5)
```

## Testing
Let's see how we can test our cross calls using this knowledge:

```rust title="examples/src/features/cross_calls.rs"
 use super::{CrossContractDeployer, MathEngineDeployer};

#[test]
fn test_cross_calls() {
    let test_env = odra_test::env();
    let math_engine_contract = MathEngineDeployer::init(&test_env);
    let cross_contract =
        CrossContractDeployer::init(&test_env, *math_engine_contract.address());

    assert_eq!(cross_contract.add_using_another(), 8);
}
```

Each test start with a fresh instance of blockchain - no contracts are deployed. To test an external contract we deploy a `MathEngine` contract first, but we are not going to use it directly. We take only its address. Let's keep pretending, there is a contract with the `add()` function we want to use.

```rust title="examples/src/features/cross_calls.rs"
#[cfg(test)]
mod tests {
    use odra::types::Address;
    use crate::features::cross_calls::{Adder, AdderHostRef};
    
    #[test]
    fn test_ext() {
        let adder = AdderHostRef::new(get_adder_address(), test_env).add(3, 5)
        assert_eq!(adder.add(1, 2), 3);
    }

    fn get_adder_address() -> Address {
        let contract = MathEngineDeployer::init(&odra_test::env());
        *contract.address()
    }
}
```
