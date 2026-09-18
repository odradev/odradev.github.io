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
    let amount: U512 = self.env().attached_value();
    let current_block_time: u64 = self.env().get_block_time();

    // Multiple lock check
    if self.balances.get(&caller).is_some() {
        self.env().revert(Error::CannotLockTwice)
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
use odra::prelude::*;
use odra::ContractRef;

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
            NonReentrantCounterContractRef::new(self.env(), self.env().self_address())
                .count_ref_recursive(n - 1);
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
    use odra::host::{Deployer, NoArgs};

    #[test]
    fn ref_recursion_not_allowed() {
        let test_env = odra_test::env();
        let mut contract = NonReentrantCounter::deploy(&test_env, NoArgs);

        let result = contract.try_count_ref_recursive(11);
        assert_eq!(result.unwrap_err(), ExecutionError::ReentrantCall.into());
    }
}
```

## Offchain

Some functions are useful to have on a contract but should never be entry points: iterating a whole
list, aggregating many balances, building a report. On chain they would cost too much gas or not fit
in a transaction at all. `#[odra(offchain)]` keeps such a function in the module, but out of the
deployed contract: it is not a wasm entry point and not in the schema. It runs on the host instead,
reading the contract's state, so it costs nothing and has no size limit.

### Example

```rust title="examples/src/features/offchain.rs"
#[odra::module]
impl BalanceBook {
    pub fn deposit(&mut self, amount: U256) { /* .. */ }

    pub fn balance_of(&self, owner: &Address) -> U256 {
        self.balances.get_or_default(owner)
    }

    /// Every holder with its balance: a loop over the whole list, fine on the host.
    #[odra(offchain)]
    pub fn all_balances(&self) -> Vec<(Address, U256)> {
        self.holders
            .iter()
            .map(|holder| (holder, self.balance_of(&holder)))
            .collect()
    }
}
```

The function is on the `HostRef` like any getter (`book.all_balances()`, `book.try_all_balances()`),
so tests, deploy scripts and scenarios call it the usual way. OdraVM runs it directly, CasperVM runs
it on the host against the VM's storage, and livenet executes it offline against the chain state,
exactly as it does with every non-mutating entry point. odra-cli lists it under `contract <Name>`
marked as offchain.

The rules: it takes `&self` (it cannot change the state, emit events or transfer tokens), it lives in
a plain `impl` block of the module (not in a trait impl, since the trait is also implemented by the
`ContractRef`), and it cannot be `payable` or `non_reentrant`. It can call the contract's own
functions and non-mutating entry points of other contracts. Other contracts cannot call it: it does
not exist on chain, so it is not on the `ContractRef`.

## Mixing attributes

A function can accept more than one attribute, with one exception: a constructor cannot be payable.

:::caution
Since Odra 2.9.1, marking `init` or `upgrade` with `#[odra(payable)]` or `#[odra(non_reentrant)]` is a
compile error - those entrypoints are generated by a path that never applied the attributes, so
accepting them would mean silently ignoring them. There is no way to attach tokens to a deploy in the
first place, so fund the contract with a separate payable entrypoint called right after deployment.

In Odra 2.9.0 and earlier the same code compiles and the attribute is quietly dropped.
:::

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
