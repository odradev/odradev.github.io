---
sidebar_position: 2
description: Migration guide to v0.9.0
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Migration guide to v0.9.0

This guide is intended for developers who have built smart contracts using version 0.8.0 of Odra and need to update their code to be compatible with v0.9.0. For migration from version `0.7.1` and below, start with the [previous guide]. It assumes a basic understanding of smart contract development and the Odra framework. If you're new to Odra, we recommend to start your journey with the [Getting Started](../category/getting-started/).

The most significant change in `0.9.0` is the way of defining custom elements namely type, events and errors.

## **1. Prerequisites**

### 1.1. **Update cargo-odra**
Before you begin the migration process, make sure you installed the latest version of the Cargo Odra toolchain. You can install it by running the following command:

```bash
cargo install cargo-odra --force --locked
```

### 1.2. **Review the Changelog**
Before you move to changing your code, start by reviewing the [Changelog] to understand the changes introduced in v0.9.0.

## **2. Migration Steps**

### 2.1 **Update build_schema.rs bin**
Odra 0.9.0 adds a new standardized way of generating contract schema - [Casper Contract Schema]. You can find the updated `build_schema.rs` file in [templates] directory in the Odra main repository. You can choose whatever template you want to use and copy the files to your project. In both files, you should replace `{{project-name}}` with the name of your project.

### 2.2 **Update smart contract code**

The main changes in the smart contract code are related to the way of defining custom types, events and errors. The following sections will guide you through the necessary changes.

#### 2.2.1. **Update custom types definitions.**

`#[derive(OdraType)]` attribute has been replace with `#[odra::odra_type]` attribute.
   
<Tabs>
<TabItem value="current" label="0.9.0">

```rust
use odra::Address;

#[odra::odra_type]
pub struct Dog {
    pub name: String,
    pub age: u8,
    pub owner: Option<Address>
}
```
</TabItem>
<TabItem value="old" label="0.8.0">

```rust
use odra::{Address, OdraType};

#[derive(OdraType)]
pub struct Dog {
    pub name: String,
    pub age: u8,
    pub owner: Option<Address>
}
```

</TabItem>
</Tabs>

#### 2.2.2. **Update errors definitions.**

`#[derive(OdraError)]` attribute has been replace with `#[odra::odra_error]` attribute.
Error enum should be passed as a parameter to the `#[odra::module]` attribute.
   
<Tabs>
<TabItem value="current" label="0.9.0">

```rust
#[odra::module(events = [/* events go here */], errors = Error)]
pub struct Erc20 {
    // fields
}

#[odra::odra_error]
pub enum Error {
   InsufficientBalance = 30_000,
   InsufficientAllowance = 30_001,
   NameNotSet = 30_002,
   SymbolNotSet = 30_003,
   DecimalsNotSet = 30_004
}
```
</TabItem>
<TabItem value="old" label="0.8.0">

```rust
#[odra::module(events = [/* events go here */])]
pub struct Erc20 {
    // fields
}

use odra::OdraError;

#[derive(OdraError)]
pub enum Error {
   InsufficientBalance = 30_000,
   InsufficientAllowance = 30_001,
   NameNotSet = 30_002,
   SymbolNotSet = 30_003,
   DecimalsNotSet = 30_004
}
```

</TabItem>
</Tabs>

#### 2.2.3. **Update events definitions.**

`#[derive(Event)]` attribute has been replace with `#[odra::event]` attribute.
   
<Tabs>
<TabItem value="current" label="0.9.0">

```rust
use odra::prelude::*;
use odra::{Address, casper_types::U256};

#[odra::event]
pub struct Transfer {
   pub from: Option<Address>,
   pub to: Option<Address>,
   pub amount: U256
}
```
</TabItem>
<TabItem value="old" label="0.8.0">

```rust
use odra::prelude::*;
use odra::{Address, casper_types::U256, Event};

#[derive(Event, Eq, PartialEq, Debug)]
pub struct Transfer {
   pub from: Option<Address>,
   pub to: Option<Address>,
   pub amount: U256
}
```

</TabItem>
</Tabs>

## 3. **Code Examples**

Here is a complete example of a smart contract after and before the migration to v0.9.0.

<Tabs>
<TabItem value="current" label="0.9.0">

```rust title="src/erc20.rs"
use crate::erc20::errors::Error;
use crate::erc20::events::*;
use odra::prelude::*;
use odra::{casper_types::U256, Address, Mapping, Var};

#[odra::module(events = [Approval, Transfer], errors = Error)]
pub struct Erc20 {
   decimals: Var<u8>,
   symbol: Var<String>,
   name: Var<String>,
   total_supply: Var<U256>,
   balances: Mapping<Address, U256>,
   allowances: Mapping<(Address, Address), U256>
}

#[odra::module]
impl Erc20 {
   pub fn init(
      &mut self,
      symbol: String,
      name: String,
      decimals: u8,
      initial_supply: Option<U256>
   ) {
      let caller = self.env().caller();
      self.symbol.set(symbol);
      self.name.set(name);
      self.decimals.set(decimals);

      if let Some(initial_supply) = initial_supply {
         self.total_supply.set(initial_supply);
         self.balances.set(&caller, initial_supply);

         if !initial_supply.is_zero() {
               self.env().emit_event(Transfer {
                  from: None,
                  to: Some(caller),
                  amount: initial_supply
               });
         }
      }
   }

   pub fn transfer(&mut self, recipient: &Address, amount: &U256) {
      let caller = self.env().caller();
      self.raw_transfer(&caller, recipient, amount);
   }

   pub fn transfer_from(&mut self, owner: &Address, recipient: &Address, amount: &U256) {
      let spender = self.env().caller();

      self.spend_allowance(owner, &spender, amount);
      self.raw_transfer(owner, recipient, amount);
   }

   pub fn approve(&mut self, spender: &Address, amount: &U256) {
      let owner = self.env().caller();

      self.allowances.set(&(owner, *spender), *amount);
      self.env().emit_event(Approval {
         owner,
         spender: *spender,
         value: *amount
      });
   }

   pub fn name(&self) -> String {
      self.name.get_or_revert_with(Error::NameNotSet)
   }

   // Other getter functions...

   pub fn allowance(&self, owner: &Address, spender: &Address) -> U256 {
      self.allowances.get_or_default(&(*owner, *spender))
   }

   pub fn mint(&mut self, address: &Address, amount: &U256) {
      self.total_supply.add(*amount);
      self.balances.add(address, *amount);

      self.env().emit_event(Transfer {
         from: None,
         to: Some(*address),
         amount: *amount
      });
   }

   pub fn burn(&mut self, address: &Address, amount: &U256) {
      if self.balance_of(address) < *amount {
         self.env().revert(Error::InsufficientBalance);
      }
      self.total_supply.subtract(*amount);
      self.balances.subtract(address, *amount);

      self.env().emit_event(Transfer {
         from: Some(*address),
         to: None,
         amount: *amount
      });
   }
}

impl Erc20 {
   fn raw_transfer(&mut self, owner: &Address, recipient: &Address, amount: &U256) {
      if *amount > self.balances.get_or_default(owner) {
         self.env().revert(Error::InsufficientBalance)
      }

      self.balances.subtract(owner, *amount);
      self.balances.add(recipient, *amount);

      self.env().emit_event(Transfer {
         from: Some(*owner),
         to: Some(*recipient),
         amount: *amount
      });
   }

   fn spend_allowance(&mut self, owner: &Address, spender: &Address, amount: &U256) {
      let allowance = self.allowances.get_or_default(&(*owner, *spender));
      if allowance < *amount {
         self.env().revert(Error::InsufficientAllowance)
      }
      self.allowances.subtract(&(*owner, *spender), *amount);

      self.env().emit_event(Approval {
         owner: *owner,
         spender: *spender,
         value: allowance - *amount
      });
   }
}

pub mod events {
   use odra::prelude::*;
   use odra::{casper_types::U256, Address};

   #[odra::event]
   pub struct Transfer {
      pub from: Option<Address>,
      pub to: Option<Address>,
      pub amount: U256
   }

   #[odra::event]
   pub struct Approval {
      pub owner: Address,
      pub spender: Address,
      pub value: U256
   }
}

pub mod errors {
   #[odra::odra_error]
   pub enum Error {
      InsufficientBalance = 30_000,
      InsufficientAllowance = 30_001,
      NameNotSet = 30_002,
      SymbolNotSet = 30_003,
      DecimalsNotSet = 30_004
   }
}

#[cfg(test)]
mod tests {
    // nothing changed in the tests
}
```
</TabItem>
<TabItem value="old" label="Prev">

```rust title="src/erc20.rs"
use crate::erc20::errors::Error::*;
use crate::erc20::events::*;
use odra::prelude::*;
use odra::{casper_types::U256, Address, Mapping, Var};

#[odra::module(events = [Approval, Transfer])]
pub struct Erc20 {
   decimals: Var<u8>,
   symbol: Var<String>,
   name: Var<String>,
   total_supply: Var<U256>,
   balances: Mapping<Address, U256>,
   allowances: Mapping<(Address, Address), U256>
}

#[odra::module]
impl Erc20 {
   pub fn init(
      &mut self,
      symbol: String,
      name: String,
      decimals: u8,
      initial_supply: Option<U256>
   ) {
      let caller = self.env().caller();
      self.symbol.set(symbol);
      self.name.set(name);
      self.decimals.set(decimals);

      if let Some(initial_supply) = initial_supply {
         self.total_supply.set(initial_supply);
         self.balances.set(&caller, initial_supply);

         if !initial_supply.is_zero() {
               self.env().emit_event(Transfer {
                  from: None,
                  to: Some(caller),
                  amount: initial_supply
               });
         }
      }
   }

   pub fn transfer(&mut self, recipient: &Address, amount: &U256) {
      let caller = self.env().caller();
      self.raw_transfer(&caller, recipient, amount);
   }

   pub fn transfer_from(&mut self, owner: &Address, recipient: &Address, amount: &U256) {
      let spender = self.env().caller();

      self.spend_allowance(owner, &spender, amount);
      self.raw_transfer(owner, recipient, amount);
   }

   pub fn approve(&mut self, spender: &Address, amount: &U256) {
      let owner = self.env().caller();

      self.allowances.set(&(owner, *spender), *amount);
      self.env().emit_event(Approval {
         owner,
         spender: *spender,
         value: *amount
      });
   }

   pub fn name(&self) -> String {
      self.name.get_or_revert_with(NameNotSet)
   }

   // Other getter functions...

   pub fn allowance(&self, owner: &Address, spender: &Address) -> U256 {
      self.allowances.get_or_default(&(*owner, *spender))
   }

   pub fn mint(&mut self, address: &Address, amount: &U256) {
      self.total_supply.add(*amount);
      self.balances.add(address, *amount);

      self.env().emit_event(Transfer {
         from: None,
         to: Some(*address),
         amount: *amount
      });
   }

   pub fn burn(&mut self, address: &Address, amount: &U256) {
      if self.balance_of(address) < *amount {
         self.env().revert(InsufficientBalance);
      }
      self.total_supply.subtract(*amount);
      self.balances.subtract(address, *amount);

      self.env().emit_event(Transfer {
         from: Some(*address),
         to: None,
         amount: *amount
      });
   }
}

impl Erc20 {
   fn raw_transfer(&mut self, owner: &Address, recipient: &Address, amount: &U256) {
      if *amount > self.balances.get_or_default(owner) {
         self.env().revert(InsufficientBalance)
      }

      self.balances.subtract(owner, *amount);
      self.balances.add(recipient, *amount);

      self.env().emit_event(Transfer {
         from: Some(*owner),
         to: Some(*recipient),
         amount: *amount
      });
   }

   fn spend_allowance(&mut self, owner: &Address, spender: &Address, amount: &U256) {
      let allowance = self.allowances.get_or_default(&(*owner, *spender));
      if allowance < *amount {
         self.env().revert(InsufficientAllowance)
      }
      self.allowances.subtract(&(*owner, *spender), *amount);

      self.env().emit_event(Approval {
         owner: *owner,
         spender: *spender,
         value: allowance - *amount
      });
   }
}

pub mod events {
   use odra::prelude::*;
   use odra::{casper_types::U256, Address, Event};

   #[derive(Event, Eq, PartialEq, Debug)]
   pub struct Transfer {
      pub from: Option<Address>,
      pub to: Option<Address>,
      pub amount: U256
   }

   #[derive(Event, Eq, PartialEq, Debug)]
   pub struct Approval {
      pub owner: Address,
      pub spender: Address,
      pub value: U256
   }
}

pub mod errors {
   use odra::OdraError;

   #[derive(OdraError)]
   pub enum Error {
      InsufficientBalance = 30_000,
      InsufficientAllowance = 30_001,
      NameNotSet = 30_002,
      SymbolNotSet = 30_003,
      DecimalsNotSet = 30_004
   }
}

#[cfg(test)]
mod tests {
   // nothing changed in the tests
}
```

</TabItem>
</Tabs>

## 4. **Troubleshooting**

If you encounter any further issues after completing the migration steps, please don't hesitate to reach out to us on [Discord] or explore the other sections this documentation. You can also refer to the [technical documentation] for more detailed information. Additionally, our [examples] repository offers a wide range of examples to assist you in understanding the new features and APIs. Be sure to carefully review any compilation errors and warnings, as they may provide valuable insights into the necessary adjustments.


## 5. **References**
   - [Changelog]
   - [Odra Documentation]
   - [Docs.rs]
   - [Examples]

[Changelog]: https://github.com/odradev/odra/blob/release/0.9.0/CHANGELOG.md
[templates]: https://github.com/odradev/odra/blob/release/0.9.0/templates
[`HostEnv`]: https://docs.rs/odra/0.9.0/odra/host/struct.HostEnv.html
[`OdraResult`]: https://docs.rs/odra/0.9.0/odra/type.OdraResult.html
[Discord]: https://discord.com/invite/Mm5ABc9P9k
[Odra Documentation]: https://docs.odra.dev
[technical documentation]: https://docs.rs/odra/0.9.0/odra/index.html
[Docs.rs]: https://docs.rs/odra/0.9.0/odra/index.html
[examples]: https:://github.com/odradev/odra/tree/release/0.9.0/examples
[Examples]: https:://github.com/odradev/odra/tree/release/0.9.0/examples
[Casper Contract Schema]: https://github.com/odradev/casper-contract-schema
[previous guide]: ./to-0.8.0
