---
sidebar_position: 3
---

# OwnedToken

This tutorial shows the great power of the modularization-focused design of the Odra Framework. We are going to use the modules we built in the last two tutorials to build a new one.

## Code
What should our module be capable of?

1. Conform the Erc20 interface.
2. Allow only the module owner to mint tokens.
3. Enable the current owner to designate a new owner.


### Module definition

Let's define a module called `OwnedToken` that is a composition of `Ownable` and `Erc20` modules.

```rust title=owned_token.rs showLineNumbers
use crate::{erc20::Erc20, ownable::Ownable};
use odra::module::ModuleWrapper;

#[odra::module]
pub struct OwnedToken {
    ownable: ModuleWrapper<Ownable>,
    erc20: ModuleWrapper<Erc20>
}
```

As you can see, we do not need any storage definition - we just take advantage of the already-defined modules!

### Delegation

```rust title=owned_token.rs showLineNumbers
use odra::prelude::*;
use odra::{Address, casper_types::U256, module::Module};

...

#[odra::module]
impl OwnedToken {
    pub fn init(&mut self, name: String, symbol: String, decimals: u8, initial_supply: &U256) {
        let deployer = self.env().caller();
        self.ownable.init(deployer);
        self.erc20.init(name, symbol, decimals, initial_supply);
    }

    pub fn name(&self) -> String {
        self.erc20.name()
    }

    pub fn symbol(&self) -> String {
        self.erc20.symbol()
    }

    pub fn decimals(&self) -> u8 {
        self.erc20.decimals()
    }

    pub fn total_supply(&self) -> U256 {
        self.erc20.total_supply()
    }

    pub fn balance_of(&self, address: &Address) -> U256 {
        self.erc20.balance_of(address)
    }

    pub fn allowance(&self, owner: &Address, spender: &Address) -> U256 {
        self.erc20.allowance(owner, spender)
    }

    pub fn transfer(&mut self, recipient: &Address, amount: &U256) {
        self.erc20.transfer(recipient, amount);
    }

    pub fn transfer_from(&mut self, owner: &Address, recipient: &Address, amount: &U256) {
        self.erc20.transfer_from(owner, recipient, amount);
    }

    pub fn approve(&mut self, spender: &Address, amount: &U256) {
        self.erc20.approve(spender, amount);
    }

    pub fn get_owner(&self) -> Address {
        self.ownable.get_owner()
    }

    pub fn change_ownership(&mut self, new_owner: &Address) {
        self.ownable.change_ownership(new_owner);
    }

    pub fn mint(&mut self, address: &Address, amount: &U256) {
        self.ownable.ensure_ownership(&self.env().caller());
        self.erc20.mint(address, amount);
    }
}
```

Easy. However, there are a few worth mentioning subtleness:

* **L10-L11** - A constructor is an excellent place to initialize both modules at once.
* **L14-L16** - Most of the entrypoints do not need any modification, so we simply delegate them to the `erc20` module.
* **L50-L52** - The same is done with the `ownable` module.
* **L58-L61** - Minting should not be unconditional, we need some control over it. First, using `ownable` we make sure the `caller` really is indeed the owner.

## Summary

The Odra Framework encourages a modularized design of your smart contracts. You can encapsulate features in smaller units and test them in isolation, ensuring your project is easy to maintain. Finally, unleash their full potential by combining modules. You do not need any magic bindings for that. 