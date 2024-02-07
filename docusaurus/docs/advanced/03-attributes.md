# Attributes

Smart contract developers with Ethereum background are familiar with Solidity's concept of modifiers in Solidity - a feature that 
allows developers to embed common checks into function definitions in a readable and reusable manner. 
These are essentially prerequisites for function execution.

Odra defines a few attributes that can be applied to functions to equip them with superpowers.

## Payable

When writing a smart contract, you need to make sure that money can be both sent to and extracted from the contract. The 'payable' attribute helps wit this. Any function, except for a constructor, with the `#[odra(payable)]` attribute can send and take money in the form of native tokens. 

### Example

```rust title=examples/src/contracts/tlw.rs
#[odra(payable)]
pub fn deposit(&mut self) {
    // Extract values
    let caller: Address = self.env().caller();
    let amount: U256 = self.env().attached_value();
    let current_block_time: u64 = self.env().get_block_time();

    // Multiple lock check
    if self.balances.get(&caller).is_some() {
        self.env.revert(Error::CannotLockTwice)
    }

    // Update state, emit event
    self.balances.set(&caller, amount);
    self.lock_expiration_map
        .set(&caller, current_block_time + self.lock_duration());
    self.env()
      .emit_event(Deposit {
        address: caller,
        amount
    });
}
```

If you try to send tokens to a non-payable function, the transaction will be automatically rejected.


## Non Reentrant

Reentrancy attacks in smart contracts exploit the possibility of a function being called multiple times before its initial execution is completed, leading to the repeated unauthorized withdrawal of funds. 

To prevent such attacks, developers should ensure that all effects on the contract's state and balance checks occur before calling external contracts. 

They can also use reentrancy guards to block recursive calls to sensitive functions.

In Odra you can just apply the `#[odra(non_reentrant)]` attribute to your function.

### Example

```rust
#[odra::module]
pub struct NonReentrantCounter {
    counter: Var<u32>
}

#[odra::module]
impl NonReentrantCounter {
    #[odra(non_reentrant)]
    pub fn count_ref_recursive(&mut self, n: u32) {
        if n > 0 {
            self.count();
            ReentrancyMockRef::new(self.env(), self.env().self_address()).count_ref_recursive(n - 1);
        }
    }
}

impl NonReentrantCounter {
    fn count(&mut self) {
        let c = self.counter.get_or_default();
        self.counter.set(c + 1);
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use odra::{host::Deployer, ExecutionError};

    #[test]
    fn ref_recursion_not_allowed() {
        let test_env = odra_test::env();
        let mut contract = NonReentrantCounterHostRef::deploy(&test_env, NoArgs);

        let result = contract.count_ref_recursive(11);
        assert_eq!(result, ExecutionError::ReentrantCall.into());
    }
}
```

## Mixing attributes

A function can accept more than one attribute. The only exclusion is a constructor cannot be payable.
To apply multiple attributes, you can write:

```rust
#[odra(payable, non_reentrant)]
fn deposit() {
  // your logic...
}
```

or 

```rust
#[odra(payable)]
#[odra(non_reentrant)]
fn deposit() {
  // your logic...
}
```

In both cases attributes order does not matter.
