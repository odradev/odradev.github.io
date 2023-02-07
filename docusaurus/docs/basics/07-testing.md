---
sidebar_position: 7
---

# Testing
Thanks to Odra framework, you can test your code in any way you are used to. This means you can write
regular Rust unit and integration tests. Have a look how we test the Dog Contract we created in the
previous article:

```rust title="examples/src/docs/list.rs"
use odra::{Variable, List};

#[cfg(test)]
mod tests {
    use super::DogContract3Deployer;

    #[test]
    fn init_test() {
        let mut dog_contract = DogContract3Deployer::init("Mantus".to_string());
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

```rust title="examples/src/docs/list.rs"
let mut dog_contract = DogContract3Deployer::init("Mantus".to_string());
```

From now on, we can use `dog_contract` to interact with our deployed contract - in particular, all
`pub` functions from the impl section that was annotated with a macro are available to us:

```rust title="examples/src/docs/list.rs"
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
article about the host communication and implement the tests that prove it really works:

```rust title="examples/src/docs/testing.rs"
#[cfg(test)]
mod tests {
    use odra::types::Address;
    use super::MyContractDeployer;

    #[test]
    fn test_env() {
        let my_contract = MyContractDeployer::init("MyContract".to_string());
        let creator = my_contract.created_by();
        odra::test_env::set_caller(odra::test_env::get_account(1));
        let my_contract2 = MyContractDeployer::init("MyContract2".to_string());
        let creator2 = my_contract2.created_by();
        assert!(creator != creator2);
    }
}
```

In the code above, we are deploying two instances of the same contract, but we're using `odra::test_env::set_caller`
to change the caller - so the Address which is deploying the contract. This changes the result of the `odra::contract_env::caller()`
function we are calling inside the contract.

Each test env comes with a set of functions that will let you write better tests:

- `fn set_caller(address: Address)` - you've seen it in action just now
- `fn token_balance(address: Address) -> Balance` - it returns the balance of the account associated with the given address
- `fn advance_block_time_by(seconds: BlockTime)` - it increases the current value of block_time
- `fn get_account(n: usize) -> Address` - it returns a nth address that was prepared for you by Odra in advance;
by default you start with 0th account 
- `fn assert_exception<F, E>(err: E, block: F)` - it executes the `block` code and expects `err` to happen
- `fn get_event<T: MockVMType + OdraEvent>(address: Address, index: i32) -> Result<T, EventError>` - returns
the event emitted by the contract

Again, we'll see those used in next articles.

## What's next
We take a look at how Odra handles errors!