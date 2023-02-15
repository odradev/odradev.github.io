---
sidebar_position: 10
description: Contracts calling contracts
---

# Cross calls

To show how to handle calls between contracts, first, let's implement two of them:

```rust title="examples/src/docs/cross_calls.rs"
use odra::Variable;
use odra::types::{Address};

#[odra::module]
pub struct CrossContract {
    pub math_engine: Variable<Address>,
}

#[odra::module]
impl CrossContract {
    #[odra(init)]
    pub fn init(&mut self, math_engine_address: Address) {
        self.math_engine.set(math_engine_address);
    }

    pub fn add_using_another(&self) -> u32 {
        let math_engine_address = self.math_engine.get().unwrap();
        MathEngineRef::at(math_engine_address).add(3, 5)
    }
}

#[odra::module]
pub struct MathEngine {
}

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

```rust title="examples/src/docs/cross_calls.rs"
MathEngineRef::at(math_engine_address).add(3, 5)
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

## Testing
Let's see how we can test our cross calls using this knowledge:

```rust title="examples/src/docs/cross_calls.rs"
use super::{CrossContractDeployer, MathEngineDeployer};

#[test]
fn test_cross_calls() {
    let math_engine_contract = MathEngineDeployer::default();
    let cross_contract = CrossContractDeployer::init(math_engine_contract.address());

    assert_eq!(cross_contract.add_using_another(), 8);
}
```