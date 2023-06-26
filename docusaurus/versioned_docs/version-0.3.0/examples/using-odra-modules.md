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
odra = { version = "0.3.0", default-features = false }

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

## Available modules

Odra modules comes with couple of ready-to-use modules and reusable extensions.

### Tokens

#### Erc20

The `Erc20` module implements the [ERC20](https://eips.ethereum.org/EIPS/eip-20) standard.

#### Erc721

The `Erc721Base` module implements the [ERC721](https://eips.ethereum.org/EIPS/eip-721) standard, adjusted for the Odra framework.

The `Erc721Token` module implements the `ERC721Base` and additionally uses
the `Erc721Metadata` and `Ownable` extensions.

The `Erc721Receiver` trait lets you implement your own logic for receiving NFTs.

The `OwnedErc721WithMetadata` trait is a combination of `Erc721Token`, `Erc721Metadata` and `Ownable` modules.

#### Erc1155

The `Erc1155Base` module implements the [ERC1155](https://eips.ethereum.org/EIPS/eip-1155) standard, adjusted for the Odra framework.

The `Erc1155Token` module implements the `ERC1155Base` and additionally uses the `Ownable` extension.

The `OwnedErc1155` trait is a combination of `Erc1155Token` and `Ownable` modules.

#### Wrapped native token

The `WrappedNativeToken` module implements the Wrapper for the native token,
it was inspired by the WETH.

### Access

#### AccessControl
This module enables the implementation of role-based access control mechanisms for children
modules. Roles are identified by their 32-bytes identifier, which should be unique and exposed in the external API.

#### Ownable
This module provides a straightforward access control feature that enables exclusive access to particular functions by an account, known as the owner.

The account that initiates the module is automatically assigned as the owner. However, ownership can be transferred later by using the
`transfer_ownership()` function.

#### Ownable2Step
An extension of the `Ownable` module. 

Ownership can be transferred in a two-step process by using `transfer_ownership()` and `accept_ownership()` functions.

### Security

#### Pauseable
A module allowing to implement an emergency stop mechanism that can be triggered by any account.
