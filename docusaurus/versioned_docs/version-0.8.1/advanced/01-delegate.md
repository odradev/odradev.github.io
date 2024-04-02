# Delegate

Managing boilerplate code can often lead to code that is cumbersome and challenging to comprehend. The Odra library introduces a solution to this issue with its Delegate feature. As the name implies, the Delegate feature permits the delegation of function calls to child modules, effectively minimizing the redundancy of boilerplate code and maintaining a lean and orderly parent module.

The main advantage of this feature is that it allows you to inherit the default behavior of child modules seamlessly, making your contracts more readable.

## Overview

To utilize the delegate feature in your contract, use the `delegate!` macro provided by Odra. This macro allows you to list the functions you wish to delegate to the child modules. By using the `delegate!` macro, your parent module remains clean and easy to understand.

You can delegate functions to as many child modules as you like. The functions will be available as if they were implemented in the parent module itself.

## Code Examples

Consider the following basic example for better understanding:

```rust
use crate::{erc20::Erc20, ownable::Ownable};
use odra::{
    Address, casper_types::U256,
    module::{Module, SubModule},
    prelude::*
};

#[odra::module]
pub struct OwnedToken {
    ownable: SubModule<Ownable>,
    erc20: SubModule<Erc20>
}

#[odra::module]
impl OwnedToken {
    pub fn init(&mut self, name: String, symbol: String, decimals: u8, initial_supply: U256) {
        let deployer = self.env().caller();
        self.ownable.init(deployer);
        self.erc20.init(name, symbol, decimals, initial_supply);
    }

    delegate! {
        to self.erc20 {
            pub fn transfer(&mut self, recipient: Address, amount: U256);
            pub fn transfer_from(&mut self, owner: Address, recipient: Address, amount: U256);
            pub fn approve(&mut self, spender: Address, amount: U256);
            pub fn name(&self) -> String;
            pub fn symbol(&self) -> String;
            pub fn decimals(&self) -> u8;
            pub fn total_supply(&self) -> U256;
            pub fn balance_of(&self, owner: Address) -> U256;
            pub fn allowance(&self, owner: Address, spender: Address) -> U256;
        }

        to self.ownable {
            pub fn get_owner(&self) -> Address;
            pub fn change_ownership(&mut self, new_owner: Address);
        }
    }

    pub fn mint(&mut self, address: Address, amount: U256) {
        self.ownable.ensure_ownership(self.env().caller());
        self.erc20.mint(address, amount);
    }
}
```

This `OwnedToken` contract includes two modules: `Erc20` and `Ownable`. We delegate various functions from both modules using the `delegate!` macro. As a result, the contract retains its succinctness without compromising on functionality.

The above example basically merges the functionalities of modules and adds some control over the minting process. But you can use delegation to build more complex contracts, cherry-picking just a few module functionalities.

Let's take a look at another example.

```rust
use crate::{erc20::Erc20, ownable::Ownable, exchange::Exchange};
use odra::{
    Address, casper_types::U256, 
    module::SubModule,
    prelude::*
};

#[odra::module]
pub struct DeFiPlatform {
    ownable: SubModule<Ownable>,
    erc20: SubModule<Erc20>,
    exchange: SubModule<Exchange>
}

#[odra::module]
impl DeFiPlatform {
    pub fn init(&mut self, name: String, symbol: String, decimals: u8, initial_supply: U256, exchange_rate: u64) {
        let deployer = self.env().caller();
        self.ownable.init(deployer);
        self.erc20.init(name, symbol, decimals, initial_supply);
        self.exchange.init(exchange_rate);
    }

    delegate! {
        to self.erc20 {
            pub fn transfer(&mut self, recipient: Address, amount: U256);
            pub fn balance_of(&self, owner: Address) -> U256;
        }

        to self.ownable {
            pub fn get_owner(&self) -> Address;
        }

        to self.exchange {
            pub fn swap(&mut self, sender: Address, recipient: Address);
            pub fn set_exchange_rate(&mut self, new_rate: u64);
        }
    }

    pub fn mint(&mut self, address: Address, amount: U256) {
        self.ownable.ensure_ownership(self.env().caller());
        self.erc20.mint(address, amount);
    }
}
```

In this `DeFiPlatform` contract, we include `Erc20`, `Ownable`, and `Exchange` modules. By delegating functions from these modules, the parent contract becomes a powerhouse of functionality while retaining its readability and structure.

Remember, the possibilities are endless with Odra's. By leveraging this feature, you can write cleaner, more efficient, and modular smart contracts.