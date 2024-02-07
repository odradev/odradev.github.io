---
sidebar_position: 1
description: Migration guide to v0.8.0
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Migration guide to v0.8.0

Odra v0.8.0 introduces several breaking changes that require users to update their smart contracts and tests. This migration guide provides a detailed overview of the changes, along with step-by-step instructions for migrating existing code to the new version.

This guide is intended for developers who have built smart contracts using previous versions of Odra and need to update their code to be compatible with v0.8.0. It assumes a basic understanding of smart contract development and the Odra framework. If you're new to Odra, we recommend to start your journey with the [Getting Started](../getting-started/).

The most significant changes in v0.8.0 include:
- Odra is not a blockchain-agnostic framework anymore. It is now a Casper smart contract framework only.
- Framework internals redesign.

## **1. Prerequisites**

### 1.1. **Update cargo-odra**
Before you begin the migration process, make sure you installed the latest version of the Cargo Odra toolchain. You can install it by running the following command:

```bash
cargo install cargo-odra --force --locked
```

### 1.2. **Review the Changelog**
Before you move to changing your code, start by reviewing the [Changelog] to understand the changes introduced in v0.8.0.


## **2. Migration Steps**

### 2.1 **Add bin directory**
Odra 0.8.0 introduces a new way to build smart contracts. The `.builder_casper` directory is no longer used. Instead, you should create a new directory called `bin` in the root of your project and add the `build_contract.rs` and `build_schema.rs` files to the `bin` directory.

You can find the `build_contract.rs` and `build_schema.rs` files in [templates] directory in the Odra main repository. You can choose whatever template you want to use and copy the files to your project. In both files, you should replace `{{project-name}}` with the name of your project.


### 2.2. **Update Cargo.toml**
There a bunch of changes in the `Cargo.toml` file.
* You don't to specify the features anymore - remove the `features` section and `default-features` flag from the `odra` dependency.
* Register bins you added in the previous step.
* Add `dev-dependencies` section with `odra-test` crate.
* Add recommended profiles for `release` and `dev` to optimize the build process.

Below you can compare the `Cargo.toml` file after and before the migration to v0.8.0:

<Tabs>
<TabItem value="current" label="0.8.0">

```toml
[package]
name = "my_project"
version = "0.1.0"
edition = "2021"

[dependencies]
odra = "0.8.0"

[dev-dependencies]
odra-test = "0.8.0"

[[bin]]
name = "my_project_build_contract"
path = "bin/build_contract.rs"
test = false

[[bin]]
name = "my_project_build_schema"
path = "bin/build_schema.rs"
test = false

[profile.release]
codegen-units = 1
lto = true

[profile.dev.package."*"]
opt-level = 3

```
</TabItem>
<TabItem value="old" label="Prev">

```toml
[package]
name = "my_project"
version = "0.1.0"
edition = "2021"

[dependencies]
odra = { version = "0.7.1", default-features = false }

[features]
default = ["mock-vm"]
mock-vm = ["odra/mock-vm"]
casper = ["odra/casper"]
```

</TabItem>
</Tabs>


### 2.2. **Update Odra.toml**
Due to the changes in cargo-odra, the `Odra.toml` file has been simplified. The `name` property is no longer required.

<Tabs>
<TabItem value="current" label="0.8.0">

```toml
[[contracts]]
fqn = "my_project::Flipper"
```
</TabItem>
<TabItem value="old" label="Prev">

```toml
[[contracts]]
name = "flipper"
fqn = "my_project::Flipper"
```

</TabItem>
</Tabs>


### 2.3. **Update Smart Contracts**

The smart contracts themselves will need to be updated to work with the new version of the framework. The changes will depend on the specific features and APIs used in the contracts. Here are some common changes you might need to make:

#### 2.3.1. **Update the `use` statements to reflect the new module structure.**
   * Big integer types are now located in the `odra::casper_types` module.
   * `odra::types::Address` is now `odra::Address`.
   * `Variable` is now `Var`.
   * Remove `odra::contract_env`.
   * Remove `odra::types::event::OdraEvent`.
   * Remove `odra::types::OdraType` as it is no longer required.
   * Change `odra::types::casper_types::*;` to `odra::casper_types::*;`.
  
#### 2.3.2. **Some type aliases are no longer in use.**
   * `Balance` - use `odra::casper_types::U512`.
   * `BlockTime` - use `u64`.
   * `Event` - use `odra::casper_types::bytesrepr::Bytes`.

#### 2.3.3. **Consider import `odra::prelude::*` in your module files.**

#### 2.3.4. **Flatten nested `Mapping`s.**
```rust
// Before
#[odra::module(events = [Approval, Transfer])]
pub struct Erc20 {
   ...
   allowances: Mapping<Address, Mapping<Address, U256>>
}
// After
#[odra::module(events = [Approval, Transfer])]
pub struct Erc20 {
   ...
   allowances: Mapping<(Address, Address), U256>
}
```
#### 2.3.5. **Update errors definitions.**

`execution_error!` macro has been replace with `OdraError` derive macro.
   
<Tabs>
<TabItem value="current" label="0.8.0">

```rust
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
<TabItem value="old" label="Prev">

```rust
use odra::execution_error;

execution_error! {
   pub enum Error {
      InsufficientBalance => 30_000,
      InsufficientAllowance => 30_001,
      NameNotSet => 30_002,
      SymbolNotSet => 30_003,
      DecimalsNotSet => 30_004,
   }
}
```

</TabItem>
</Tabs>

#### 2.3.6. **Update events definitions.**
   
<Tabs>
<TabItem value="current" label="0.8.0">

```rust
use odra::prelude::*;
use odra::Event;

#[derive(Event, Eq, PartialEq, Debug)]
pub struct Transfer {
   pub from: Option<Address>,
   pub to: Option<Address>,
   pub amount: U256
}

// Emitting the event
self.env().emit_event(Transfer {
   from: None,
   to: Some(*address),
   amount: *amount
});
```
</TabItem>
<TabItem value="old" label="Prev">

```rust
use odra::Event;

#[derive(Event, Eq, PartialEq, Debug)]
pub struct Transfer {
   pub from: Option<Address>,
   pub to: Option<Address>,
   pub amount: U256
}

// Emitting the event
use odra::types::event::OdraEvent;

Transfer {
   from: Some(*owner),
   to: Some(*recipient),
   amount: *amount
}.emit();
```

</TabItem>
</Tabs>

#### 2.3.7. **Replace `contract_env` with `self.env()` in your modules.**

`self.env()` is a new way to access the contract environment, returns a reference to `ContractEnv`. The API is similar to the previous `contract_env` but with some changes.
* `fn get_var<T: FromBytes>(key: &[u8]) -> Option<T>` is now `fn get_value<T: FromBytes>(&self, key: &[u8]) -> Option<T>`.
* `fn set_var<T: CLTyped + ToBytes>(key: &[u8], value: T)` is now `fn set_value<T: ToBytes + CLTyped>(&self, key: &[u8], value: T)`.
* `set_dict_value()` and `get_dict_value()` has been removed. All the dictionary operations should be performed using `Mapping` type, internally using `set_var()` and `get_var()` functions. 
* `fn hash<T: AsRef<[u8]>>(input: T) -> Vec<u8>` is now `fn hash<T: ToBytes>(&self, value: T) -> [u8; 32]`.
* `fn revert<E: Into<ExecutionError>>(error: E) -> !` is now `fn revert<E: Into<OdraError>>(&self, error: E) -> !`.
* `fn emit_event<T: ToBytes + OdraEvent>(event: T)` is now `fn emit_event<T: ToBytes>(&self, event: T)`.
* `fn call_contract<T: CLTyped + FromBytes>(address: Address, entrypoint: &str, args: &RuntimeArgs, amount: Option<U512>) -> T` is now `fn call_contract<T: FromBytes>(&self, address: Address, call: CallDef) -> T`.
* functions `native_token_metadata()` and `one_token()` have been removed.

#### 2.3.8. **Wrap submodules of your module with `odra::SubModule<T>`.**
   
<Tabs>
<TabItem value="current" label="0.8.0">

```rust
#[odra::module(events = [Transfer])]
pub struct Erc721Token {
    core: SubModule<Erc721Base>,
    metadata: SubModule<Erc721MetadataExtension>,
    ownable: SubModule<Ownable>
}
```
</TabItem>
<TabItem value="old" label="Prev">

```rust
#[odra::module(events = [Transfer])]
pub struct Erc721Token {
    core: Erc721Base,
    metadata: Erc721MetadataExtension,
    ownable: Ownable
}
```

</TabItem>
</Tabs>

#### 2.3.9. **Update external contract calls.**

However the definition of an external contract remains the same, the way you call it has changed. A reference to an external contract is named `{{ModuleName}}ContractRef` (former `{{ModuleName}}Ref`) and you can call it using `{{ModuleName}}ContractRef::new(self.env(), address)` (former `{{ModuleName}}Ref::at()`).

<Tabs>
<TabItem value="current" label="0.8.0">

```rust
#[odra::external_contract]
pub trait Token {
    fn balance_of(&self, owner: &Address) -> U256;
}

// Usage
TokenContractRef::new(self.env(), token).balance_of(account)
```
</TabItem>
<TabItem value="old" label="Prev">

```rust
#[odra::external_contract]
pub trait Token {
    fn balance_of(&self, owner: &Address) -> U256;
}

// Usage
TokenRef::at(token).balance_of(account)
```

</TabItem>
</Tabs>

#### 2.3.10. **Update constructors.**

Remove the `#[odra::init]` attribute from the constructor and ensure that the constructor function is named `init`.

#### 2.3.11. **Update `UnwrapOrRevert` calls.**

The functions `unwrap_or_revert` and `unwrap_or_revert_with` now require `&HostEnv` as the first parameter.

#### 2.3.12. **Remove `#[odra(using)]` attribute from your module definition.**

Sharing the same instance of a module is no longer supported. A redesign of the module structure might be required.

### 2.4. **Update Tests**

Once you've updated your smart contracts, you'll need to update your tests to reflect the changes. The changes will depend on the specific features and APIs used in the tests. Here are some common changes you might need to make:

#### 2.4.1. **Contract deployment.**

The way you deploy a contract has changed:

1. You should use `{{ModuleName}}HostRef::deploy(&env, args)` instead of `{{ModuleName}}Deployer::init()`. The `{{ModuleName}}HostRef` implements `odra::host::Deployer`.
2. Instantiate the `HostEnv` using `odra_test::env()`, required by the `odra::host::Deployer::deploy()` function.
3. If the contract doesn't have init args, you should use `odra::host::NoArgs` as the second argument of the `deploy` function.
4. If the contract has init args, you should pass the autogenerated `{{ModuleName}}InitArgs` as the second argument of the `deploy` function.

<Tabs>
<TabItem value="current" label="0.8.0">

```rust
// A contract without init args
use super::OwnableHostRef;
use odra::host::{Deployer, HostEnv, HostRef, NoArgs};

let env: HostEnv = odra_test::env();
let ownable = OwnableHostRef::deploy(&env, NoArgs)

// A contract with init args
use super::{Erc20HostRef, Erc20InitArgs};
use odra::host::{Deployer, HostEnv};

let env: HostEnv = odra_test::env();
let init_args = Erc20InitArgs {
    symbol: SYMBOL.to_string(),
    name: NAME.to_string(),
    decimals: DECIMALS,
    initial_supply: Some(INITIAL_SUPPLY.into())
};
let erc20 = Erc20HostRef::deploy(&env, init_args);
```
</TabItem>
<TabItem value="old" label="Prev">

```rust
// A contract without init args
use super::OwnableDeployer;

let ownable = OwnableDeployer::init();

// A contract with init args
let erc20 = Erc20Deployer::init(
   SYMBOL.to_string(),
   NAME.to_string(),
   DECIMALS,
   &Some(INITIAL_SUPPLY.into())
);
```

</TabItem>
</Tabs>

#### 2.4.2. **Host interactions.**


1. Replace `odra::test_env` with `odra_test::env()`.
2. The API of `odra::test_env` and `odra_test::env()` are similar, but there are some differences:
   * `test_env::advance_block_time_by(BlockTime)` is now `env.advance_block_time(u64)`.
   * `test_env::token_balance(Address)` is now `env.balance_of(&Address)`.
   * functions `test_env::last_call_contract_gas_cost()`, `test_env::last_call_contract_gas_used()`, `test_env::total_gas_used(Address)`, `test_env::gas_report()` have been removed. You should use `HostRef::last_call()` and extract the data from a `odra::ContractCallResult` instance. `HostRef` is a trait implemented by `{{ModuleName}}HostRef`.
  
#### 2.4.3. **Testing failing scenarios.**

`test_env::assert_exception()` has been removed. You should use the `try_` prefix to call the function and then assert the result.
`try_` prefix is a new way to call a function that might fail. It returns a [`OdraResult`] type, which you can then assert using the standard Rust `assert_eq!` macro.

<Tabs>
<TabItem value="current" label="0.8.0">

```rust
#[test]
fn transfer_from_error() {
   let (env, mut erc20) = setup();

   let (owner, spender, recipient) =
      (env.get_account(0), env.get_account(1), env.get_account(2));
   let amount = 1_000.into();
   env.set_caller(spender);

   assert_eq!(
      erc20.try_transfer_from(owner, recipient, amount),
      Err(Error::InsufficientAllowance.into())
   );
}
```
</TabItem>
<TabItem value="old" label="Prev">

```rust
#[test]
fn transfer_from_error() {
   test_env::assert_exception(Error::InsufficientAllowance, || {
      let mut erc20 = setup();

      let (owner, spender, recipient) = (
            test_env::get_account(0),
            test_env::get_account(1),
            test_env::get_account(2)
      );
      let amount = 1_000.into();
      test_env::set_caller(spender);

      erc20.transfer_from(&owner, &recipient, &amount)
   });
}
```

</TabItem>
</Tabs>

#### 2.4.4. **Testing events.**

`assert_events!` macro has been removed. You should use `HostEnv::emitted_event()` to assert the emitted events.
The new API doesn't allow to assert multiple events at once, but adds alternative ways to assert the emitted events. Check the [`HostEnv`] documentation to explore the available options.

<Tabs>
<TabItem value="current" label="0.8.0">

```rust
let env: HostEnv = odra_test::env();
let erc20 = Erc20HostRef::deploy(&env, init_args);

...

assert!(env.emitted_event(
   erc20.address(),
   &Approval {
         owner,
         spender,
         value: approved_amount - transfer_amount
   }
));
assert!(env.emitted_event(
   erc20.address(),
   &Transfer {
         from: Some(owner),
         to: Some(recipient),
         amount: transfer_amount
   }
));
```
</TabItem>
<TabItem value="old" label="Prev">

```rust
let erc20 = Erc20HostDeployer::init(&env, ...);

...

assert_events!(
   erc20,
   Approval {
         owner,
         spender,
         value: approved_amount - transfer_amount
   },
   Transfer {
         from: Some(owner),
         to: Some(recipient),
         amount: transfer_amount
   }
);
```

</TabItem>
</Tabs>

## 3. **Code Examples**

Here is a complete example of a smart contract after and before the migration to v0.8.0.

<Tabs>
<TabItem value="current" label="0.8.0">

```rust
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
   use super::{
      errors::Error,
      events::{Approval, Transfer},
      Erc20HostRef, Erc20InitArgs
   };
   use odra::{
      casper_types::U256,
      host::{Deployer, HostEnv, HostRef},
      prelude::*
   };

   const NAME: &str = "Plascoin";
   const SYMBOL: &str = "PLS";
   const DECIMALS: u8 = 10;
   const INITIAL_SUPPLY: u32 = 10_000;

   fn setup() -> (HostEnv, Erc20HostRef) {
      let env = odra_test::env();
      (
         env.clone(),
         Erc20HostRef::deploy(
               &env,
               Erc20InitArgs {
                  symbol: SYMBOL.to_string(),
                  name: NAME.to_string(),
                  decimals: DECIMALS,
                  initial_supply: Some(INITIAL_SUPPLY.into())
               }
         )
      )
   }

   #[test]
   fn initialization() {
      // When deploy a contract with the initial supply.
      let (env, erc20) = setup();

      // Then the contract has the metadata set.
      assert_eq!(erc20.symbol(), SYMBOL.to_string());
      assert_eq!(erc20.name(), NAME.to_string());
      assert_eq!(erc20.decimals(), DECIMALS);

      // Then the total supply is updated.
      assert_eq!(erc20.total_supply(), INITIAL_SUPPLY.into());

      // Then a Transfer event was emitted.
      assert!(env.emitted_event(
         erc20.address(),
         &Transfer {
               from: None,
               to: Some(env.get_account(0)),
               amount: INITIAL_SUPPLY.into()
         }
      ));
   }

   #[test]
   fn transfer_works() {
      // Given a new contract.
      let (env, mut erc20) = setup();

      // When transfer tokens to a recipient.
      let sender = env.get_account(0);
      let recipient = env.get_account(1);
      let amount = 1_000.into();
      erc20.transfer(recipient, amount);

      // Then the sender balance is deducted.
      assert_eq!(
         erc20.balance_of(sender),
         U256::from(INITIAL_SUPPLY) - amount
      );

      // Then the recipient balance is updated.
      assert_eq!(erc20.balance_of(recipient), amount);

      // Then Transfer event was emitted.
      assert!(env.emitted_event(
         erc20.address(),
         &Transfer {
               from: Some(sender),
               to: Some(recipient),
               amount
         }
      ));
   }

   #[test]
   fn transfer_error() {
      // Given a new contract.
      let (env, mut erc20) = setup();

      // When the transfer amount exceeds the sender balance.
      let recipient = env.get_account(1);
      let amount = U256::from(INITIAL_SUPPLY) + U256::one();

      // Then an error occurs.
      assert!(erc20.try_transfer(recipient, amount).is_err());
   }

   // Other tests...
}
```
</TabItem>
<TabItem value="old" label="Prev">

```rust
use odra::prelude::string::String;
use odra::{
    contract_env,
    types::{event::OdraEvent, Address, U256},
    Mapping, UnwrapOrRevert, Variable
};

use self::{
    errors::Error,
    events::{Approval, Transfer}
};

#[odra::module(events = [Approval, Transfer])]
pub struct Erc20 {
    decimals: Variable<u8>,
    symbol: Variable<String>,
    name: Variable<String>,
    total_supply: Variable<U256>,
    balances: Mapping<Address, U256>,
    allowances: Mapping<Address, Mapping<Address, U256>>
}

#[odra::module]
impl Erc20 {
   #[odra(init)]
   pub fn init(
      &mut self,
      symbol: String,
      name: String,
      decimals: u8,
      initial_supply: &Option<U256>
   ) {
      let caller = contract_env::caller();

      self.symbol.set(symbol);
      self.name.set(name);
      self.decimals.set(decimals);

      if let Some(initial_supply) = *initial_supply {
         self.total_supply.set(initial_supply);
         self.balances.set(&caller, initial_supply);

         if !initial_supply.is_zero() {
               Transfer {
                  from: None,
                  to: Some(caller),
                  amount: initial_supply
               }
               .emit();
         }
      }
   }

   pub fn transfer(&mut self, recipient: &Address, amount: &U256) {
      let caller = contract_env::caller();
      self.raw_transfer(&caller, recipient, amount);
   }

   pub fn transfer_from(&mut self, owner: &Address, recipient: &Address, amount: &U256) {
      let spender = contract_env::caller();

      self.spend_allowance(owner, &spender, amount);
      self.raw_transfer(owner, recipient, amount);
   }

   pub fn approve(&mut self, spender: &Address, amount: &U256) {
      let owner = contract_env::caller();

      self.allowances.get_instance(&owner).set(spender, *amount);
      Approval {
         owner,
         spender: *spender,
         value: *amount
      }
      .emit();
   }

   pub fn name(&self) -> String {
      self.name.get().unwrap_or_revert_with(Error::NameNotSet)
   }

   // Other getter functions...

   pub fn allowance(&self, owner: &Address, spender: &Address) -> U256 {
      self.allowances.get_instance(owner).get_or_default(spender)
   }

   pub fn mint(&mut self, address: &Address, amount: &U256) {
      self.total_supply.add(*amount);
      self.balances.add(address, *amount);

      Transfer {
         from: None,
         to: Some(*address),
         amount: *amount
      }
      .emit();
   }

   pub fn burn(&mut self, address: &Address, amount: &U256) {
      if self.balance_of(address) < *amount {
         contract_env::revert(Error::InsufficientBalance);
      }
      self.total_supply.subtract(*amount);
      self.balances.subtract(address, *amount);

      Transfer {
         from: Some(*address),
         to: None,
         amount: *amount
      }
      .emit();
   }
}

impl Erc20 {
   fn raw_transfer(&mut self, owner: &Address, recipient: &Address, amount: &U256) {
      if *amount > self.balances.get_or_default(owner) {
         contract_env::revert(Error::InsufficientBalance)
      }

      self.balances.subtract(owner, *amount);
      self.balances.add(recipient, *amount);

      Transfer {
         from: Some(*owner),
         to: Some(*recipient),
         amount: *amount
      }
      .emit();
   }

   fn spend_allowance(&mut self, owner: &Address, spender: &Address, amount: &U256) {
      let allowance = self.allowances.get_instance(owner).get_or_default(spender);
      if allowance < *amount {
         contract_env::revert(Error::InsufficientAllowance)
      }
      self.allowances
         .get_instance(owner)
         .subtract(spender, *amount);
      Approval {
         owner: *owner,
         spender: *spender,
         value: allowance - *amount
      }
      .emit();
   }
}

pub mod events {
   use odra::types::{casper_types::U256, Address};
   use odra::Event;

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
   use odra::execution_error;

   execution_error! {
      pub enum Error {
         InsufficientBalance => 30_000,
         InsufficientAllowance => 30_001,
         NameNotSet => 30_002,
         SymbolNotSet => 30_003,
         DecimalsNotSet => 30_004,
      }
   }
}

#[cfg(test)]
mod tests {
   use super::{
      errors::Error,
      events::{Approval, Transfer},
      Erc20Deployer, Erc20Ref
   };
   use odra::prelude::string::ToString;
   use odra::{assert_events, test_env, types::casper_types::U256};

   const NAME: &str = "Plascoin";
   const SYMBOL: &str = "PLS";
   const DECIMALS: u8 = 10;
   const INITIAL_SUPPLY: u32 = 10_000;

   fn setup() -> Erc20Ref {
      Erc20Deployer::init(
         SYMBOL.to_string(),
         NAME.to_string(),
         DECIMALS,
         &Some(INITIAL_SUPPLY.into())
      )
   }

   #[test]
   fn initialization() {
      // When deploy a contract with the initial supply.
      let erc20 = setup();

      // Then the contract has the metadata set.
      assert_eq!(erc20.symbol(), SYMBOL.to_string());
      assert_eq!(erc20.name(), NAME.to_string());
      assert_eq!(erc20.decimals(), DECIMALS);

      // Then the total supply is updated.
      assert_eq!(erc20.total_supply(), INITIAL_SUPPLY.into());

      // Then a Transfer event was emitted.
      assert_events!(
         erc20,
         Transfer {
               from: None,
               to: Some(test_env::get_account(0)),
               amount: INITIAL_SUPPLY.into()
         }
      );
   }

   #[test]
   fn transfer_works() {
      // Given a new contract.
      let mut erc20 = setup();

      // When transfer tokens to a recipient.
      let sender = test_env::get_account(0);
      let recipient = test_env::get_account(1);
      let amount = 1_000.into();
      erc20.transfer(&recipient, &amount);

      // Then the sender balance is deducted.
      assert_eq!(
         erc20.balance_of(&sender),
         U256::from(INITIAL_SUPPLY) - amount
      );

      // Then the recipient balance is updated.
      assert_eq!(erc20.balance_of(&recipient), amount);

      // Then Transfer event was emitted.
      assert_events!(
         erc20,
         Transfer {
               from: Some(sender),
               to: Some(recipient),
               amount
         }
      );
   }

   #[test]
   fn transfer_error() {
      test_env::assert_exception(Error::InsufficientBalance, || {
         // Given a new contract.
         let mut erc20 = setup();

         // When the transfer amount exceeds the sender balance.
         let recipient = test_env::get_account(1);
         let amount = U256::from(INITIAL_SUPPLY) + U256::one();

         // Then an error occurs.
         erc20.transfer(&recipient, &amount)
      });
   }

   // Other tests...
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

[Changelog]: https://github.com/odradev/odra/blob/release/0.8.0/CHANGELOG.md
[templates]: https://github.com/odradev/odra/blob/release/0.8.0/templates
[`HostEnv`]: https://docs.rs/odra/0.8.0/odra/host/struct.HostEnv.html
[`OdraResult`]: https://docs.rs/odra/0.8.0/odra/type.OdraResult.html
[Discord]: https://discord.com/invite/Mm5ABc9P8k
[Odra Documentation]: https://docs.odra.dev
[technical documentation]: https://docs.rs/odra/0.8.0/odra/index.html
[Docs.rs]: https://docs.rs/odra/0.8.0/odra/index.html
[examples]: https:://github.com/odradev/odra/tree/release/0.8.0/examples
[Examples]: https:://github.com/odradev/odra/tree/release/0.8.0/examples