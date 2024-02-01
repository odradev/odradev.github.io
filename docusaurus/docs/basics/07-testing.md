---
sidebar_position: 7
description: How to write tests in Odra
---

# Testing
Thanks to the Odra framework, you can test your code in any way you are used to. This means you can write
regular Rust unit and integration tests. Have a look at how we test the Dog Contract we created in the
previous article:

```rust title="examples/src/features/storage/list.rs"
use odra::{Variable, List};

#[cfg(test)]
mod tests {
    use super::DogContract3Deployer;

    #[test]
    fn init_test() {
        let mut dog_contract = DogContract3Deployer::init(&odra_test::env(), "Mantus".to_string());
        assert_eq!(dog_contract.walks_amount(), 0);
        assert_eq!(dog_contract.walks_total_length(), 0);
        dog_contract.walk_the_dog(5);
        dog_contract.walk_the_dog(10);
        assert_eq!(dog_contract.walks_amount(), 2);
        assert_eq!(dog_contract.walks_total_length(), 15);
    }
}
```

The `#[odra(module)]` macro created a Deployer code for us, which will deploy the contract on the
VM:

```rust title="examples/src/features/storage/list.rs"
let mut dog_contract = DogContract3Deployer::init(&odra_test::env(), "Mantus".to_string());
```

From now on, we can use `dog_contract` to interact with our deployed contract - in particular, all
`pub` functions from the impl section that was annotated with a macro are available to us:

```rust title="examples/src/features/storage/list.rs"
// Impl
pub fn walk_the_dog(&mut self, length: u32) {
    self.walks.push(length);
}

...

// Test
dog_contract.walk_the_dog(5);
```

## Test env

Odra gives us some additional functions that we can use to communicate with the host (outside the contract context)
and to configure how the contracts are deployed and called. Let's revisit the example from the previous
article about host communication and implement the tests that prove it works:

```rust title="examples/src/features/testing.rs"
#[cfg(test)]
mod tests {
    use super::TestingContractDeployer;
    use odra::prelude::*;

    #[test]
    fn env() {
        let test_env = odra_test::env();
        test_env.set_caller(test_env.get_account(0));
        let testing_contract = TestingContractDeployer::init(&test_env, "MyContract".to_string());
        let creator = testing_contract.created_by();
        test_env.set_caller(test_env.get_account(1));
        let testing_contract2 = TestingContractDeployer::init(&test_env, "MyContract2".to_string());
        let creator2 = testing_contract2.created_by();
        assert_ne!(creator, creator2);
    }
}
```

In the code above, we are deploying two instances of the same contract, but we're using `odra::test_env::set_caller`
to change the caller - so the Address which is deploying the contract. This changes the result of the `odra::contract_env::caller()`
the function we are calling inside the contract.

Each test env comes with a set of functions that will let you write better tests:

- `fn set_caller(address: Address)` - you've seen it in action just now
- `fn token_balance(address: Address) -> Balance` - it returns the balance of the account associated with the given address
- `fn advance_block_time_by(seconds: BlockTime)` - it increases the current value of block_time
- `fn get_account(n: usize) -> Address` - it returns an nth address that was prepared for you by Odra in advance;
  by default, you start with the 0th account
- `fn assert_exception<F, E>(err: E, block: F)` - it executes the `block` code and expects `err` to happen
- `fn get_event<T: MockVMType + OdraEvent>(address: Address, index: i32) -> Result<T, EventError>` - returns
  the event emitted by the contract

Again, we'll see those used in the next articles.

## Deployer
You may be wondering what is the `TestingContractDeployer` and where did it come from.
It is a piece of code generated automatically for you, thanks to the `#[odra::module]` macro.
If you used the `#[odra(init)]` on one of the methods, it will be the constructor of your contract.
Odra will make sure that it is called only once, so you can use it to initialize your data structures etc.

If you do not provide the init method, you can deploy the contract using `::default()` method.
In the end, you will get a `Ref` instance (in our case the `TestingContractRef`) which reimplements all
the methods you defined in the contract, but executes them on a blockchain!

To learn more about the `Ref` contract, visit the [Cross calls](10-cross-calls.md) article.

## What's next
We take a look at how Odra handles errors!
