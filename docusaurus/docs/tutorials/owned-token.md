---
sidebar_position: 3
---

# OwnedToken


```rust title=ownable.rs
use odra::{
    contract_env, execution_error, types::event::OdraEvent, types::Address, Event, Variable
};

#[odra::module]
pub struct Ownable {
    owner: Variable<Address>
}

#[odra::module]
impl Ownable {
    #[odra(init)]
    pub fn init(&mut self, owner: Address) {
        if self.owner.get().is_some() {
            contract_env::revert(Error::OwnerIsAlreadyInitialized)
        }
        self.owner.set(owner);
        OwnershipChanged {
            prev_owner: None,
            new_owner: owner
        }
        .emit();
    }

    pub fn change_ownership(&mut self, new_owner: Address) {
        self.ensure_ownership(contract_env::caller());
        let current_owner = self.get_owner();
        self.owner.set(new_owner);
        OwnershipChanged {
            prev_owner: Some(current_owner),
            new_owner
        }
        .emit();
    }

    pub fn ensure_ownership(&self, address: Address) {
        if Some(address) != self.owner.get() {
            contract_env::revert(Error::NotOwner)
        }
    }

    pub fn get_owner(&self) -> Address {
        match self.owner.get() {
            Some(owner) => owner,
            None => contract_env::revert(Error::OwnerIsNotInitialized)
        }
    }
}

execution_error! {
    pub enum Error {
        NotOwner => 3,
        OwnerIsAlreadyInitialized => 4,
        OwnerIsNotInitialized => 5,
    }
}

#[derive(Debug, PartialEq, Eq, Event)]
pub struct OwnershipChanged {
    pub prev_owner: Option<Address>,
    pub new_owner: Address
}
```
## Summary

## What's next