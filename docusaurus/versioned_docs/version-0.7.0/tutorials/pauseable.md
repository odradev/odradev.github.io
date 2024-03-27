---
sidebar_position: 5
---

# Pausable

The `Pausable` module is like your smart contract's safety switch. It lets authorized users temporarily pause certain features if needed. It's a great way to boost security, but it's not meant to be used on its own. Think of it as an extra tool in your access control toolbox, giving you more control to manage your smart contract safely and efficiently.

## Code

As always, we will start with defining functionalities of our module.

1. Check the state - is it paused or not.
2. State guards - a contract should stop execution if is in a state we don't expect.
3. Switch the state.
   
### Events and Error

There just two errors that may occur: `PausedRequired`, `UnpausedRequired`. We define them in a standard Odra way.

Events definition is highly uncomplicated: `Paused` and `Unpaused` events holds only the address of the pauser.

```rust showLineNumbers
use odra::{Event, types::Address};

odra::execution_error! {
    pub enum Error {
        PausedRequired => 1_000,
        UnpausedRequired => 1_001,
    }
}

#[derive(Event, PartialEq, Eq, Debug)]
pub struct Paused {
    pub account: Address
}

#[derive(Event, PartialEq, Eq, Debug)]
pub struct Unpaused {
    pub account: Address
}
```

### Module definition

The module storage is extremely simple - has a single `Variable` of type bool, that indicates if a contract is paused.

```rust showLineNumbers
#[odra::module]
pub struct Pausable {
    is_paused: Variable<bool>
}
```

### Checks and guards

Now, let's move to state checks and guards.

```rust title=pauseable.rs showLineNumbers
impl Pausable {
    pub fn is_paused(&self) -> bool {
        self.is_paused.get_or_default()
    }

    pub fn require_not_paused(&self) {
        if self.is_paused() {
            contract_env::revert(Error::UnpausedRequired);
        }
    }

    pub fn require_paused(&self) {
        if !self.is_paused() {
            contract_env::revert(Error::PausedRequired);
        }
    }
}
```
* **L1** - as mentioned in the intro, the module is not intended to be a standalone contract, so the only `impl` block is not annotated with `odra::module` and hence does not expose any entrypoint.
* **L2** - `is_paused()` checks the contract state, if the Variable `is_paused` has not been initialized, the default value (false) is returned.
* **L6** - to guarantee the code is executed when the contract is not paused, `require_not_paused()` function reads the state and reverts if the contract is paused. 
* **L12** - `require_paused()` is a mirror function - stops the contract execution if the contract is not paused.

### Actions

Finally, we will add the ability to switch the module state.

```rust showLineNumbers
impl Pausable {
    pub fn pause(&mut self) {
        self.require_not_paused();
        self.is_paused.set(true);

        Paused {
            account: contract_env::caller()
        }
        .emit();
    }

    pub fn unpause(&mut self) {
        self.require_paused();
        self.is_paused.set(false);

        Unpaused {
            account: contract_env::caller()
        }
        .emit();
    }
}
```

`pause()` and `unpause()` functions do three things: ensure the contract is the right state (unpaused for `pause()`, not paused for `unpause()`), updates the state, and finally emits events (`Paused`/`Unpaused`).


## Pausable counter

In the end, let's use the module in a contract. For this purpose, we will implement a mock contract called `PausableCounter`. The contract consists of a Variable `value` and a `Pausable` module. The counter can only be incremented if the contract is in a normal state (is not paused).

```rust showLineNumbers
use odra::Variable;
use odra_modules::security::Pausable;

#[odra::module]
pub struct PausableCounter {
    value: Variable<u32>,
    pauseable: Pausable
}

#[odra::module]
impl PausableCounter {
    pub fn increment(&mut self) {
        self.pauseable.require_not_paused();

        let new_value = self.value.get_or_default() + 1;
        self.value.set(new_value);
    }

    pub fn pause(&mut self) {
        self.pauseable.pause();
    }

    pub fn unpause(&mut self) {
        self.pauseable.unpause();
    }

    pub fn get_value(&self) -> u32 {
        self.value.get_or_default()
    }
}

#[cfg(test)]
mod test {
    use super::PausableCounterDeployer;
    use odra_modules::security::errors::Error;

    #[test]
    fn increment_only_if_unpaused() {
        let mut contract = PausableCounterDeployer::default();
        assert_eq!(contract.get_value(), 0);

        contract.increment();
        assert_eq!(contract.get_value(), 1);
        
        contract.pause();
        odra::test_env::assert_exception(
            Error::UnpausedRequired, 
            || contract.increment()
        );
        assert_eq!(contract.get_value(), 1);

        contract.unpause();
        contract.increment();
        assert_eq!(contract.get_value(), 2);

    }
}
```

As we see in the test, in a simple way, using a single function call we can turn off the counter for a while and freeze the counter. Any time we want we can turn it back on. Easy!