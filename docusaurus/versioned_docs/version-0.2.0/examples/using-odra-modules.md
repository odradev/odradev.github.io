---
sidebar_position: 2
---

# Using odra-modules

Besides the Odra framework, you can attach to your project `odra-module` - a set of plug-and-play modules.

If you followed the [Installation guide](../getting-started/installation.md) your Cargo.toml should look like:

```toml title=Cargo.toml
[package]
name = "my_project"
version = "0.1.0"
edition = "2021"

[dependencies]
odra = { version = "0.2.0", default-features = false }

[features]
default = ["mock-vm"]
mock-vm = ["odra/mock-vm"]
casper = ["odra/casper"]
```

To use `odra-modules`, edit your `dependency` and `features` sections.

```toml title=Cargo.toml
[dependencies]
odra = { path = "../core", default-features = false }
odra-modules = { path = "../modules", default-features = false }

[features]
default = ["mock-vm"]
mock-vm = ["odra/mock-vm", "odra-modules/mock-vm"]
casper = ["odra/casper", "odra-modules/casper"]
```

:::warning
`odra-modules` defines the same features as the core framework. It's essential to add the dependency without default features. And if you define a `casper` feature in your project, add `odra-modules/casper`specifically (it applies to each backend).
:::

Now, the only thing left is to add a module to your contract.

Let's write an example of `MyToken` based on `Erc20` module.

```rust
use odra::types::{Address, U256};
use odra_modules::erc20::Erc20;

#[odra::module]
pub struct MyToken {
    erc20: Erc20
}

#[odra::module]
impl OwnedToken {
    #[odra(init)]
    pub fn init(&mut self, initial_supply: U256) {
        let name = String::from("MyToken");
        let symbol = String::from("MT");
        let decimals = 9u8;
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

    pub fn balance_of(&self, address: Address) -> U256 {
        self.erc20.balance_of(address)
    }

    pub fn allowance(&self, owner: Address, spender: Address) -> U256 {
        self.erc20.allowance(owner, spender)
    }

    pub fn transfer(&mut self, recipient: Address, amount: U256) {
        self.erc20.transfer(recipient, amount);
    }

    pub fn transfer_from(&mut self, owner: Address, recipient: Address, amount: U256) {
        self.erc20.transfer_from(owner, recipient, amount);
    }

    pub fn approve(&mut self, spender: Address, amount: U256) {
        self.erc20.approve(spender, amount);
    }
}
```

:::info
All available modules are placed in the main Odra repository.
:::
