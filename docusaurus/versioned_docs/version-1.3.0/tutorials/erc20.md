---
sidebar_position: 3
---

# ERC-20
It's time for something that every smart contract developer has done at least once. Let's try to implement [Erc20][erc20] standard. Of course, we are going to use the Odra Framework. 

The ERC-20 standard establishes a uniform specification for fungible tokens. This implies that each token shares attributes that make it indistinguishable from another token of the same type and value.

## Framework features
A module we will write in a minute, will help you master a few Odra features:

* Advanced storage using key-value pairs,
* Odra types such as `Address`,
* Advanced event assertion.
  
## Code

Our module features a considerably more complex storage layout compared to the previous example. 

It is designed to store the following data:
1. Immutable metadata - name, symbol, and decimals.
2. Total supply.
3. Balances of individual users.
4. Allowances, essentially indicating who is permitted to spend tokens on behalf of another user.
   
## Module definition
```rust title=erc20.rs showLineNumbers
use odra::prelude::*;
use odra::{Address, casper_types::U256, Mapping, Var};

#[odra::module(events = [Transfer, Approval])]
pub struct Erc20 {
    decimals: Var<u8>,
    symbol: Var<String>,
    name: Var<String>,
    total_supply: Var<U256>,
    balances: Mapping<Address, U256>,
    allowances: Mapping<(Address, Address), U256>
}
```

* **L10** - For the first time, we need to store key-value pairs. In order to do that, we use `Mapping`. The name is taken after Solidity's native type `mapping`.
* **L11** - Odra does not allows nested `Mapping`s as Solidity does. Instead, you can create a compound key using a tuple of keys.

### Metadata

```rust title=erc20.rs showLineNumbers
#[odra::module]
impl Erc20 {
    pub fn init(&mut self, name: String, symbol: String, decimals: u8, initial_supply: U256) {
        let caller = self.env().caller();
        self.name.set(name);
        self.symbol.set(symbol);
        self.decimals.set(decimals);
        self.mint(&caller, &initial_supply);
    }

    pub fn name(&self) -> String {
        self.name.get_or_default()
    }

    pub fn symbol(&self) -> String {
        self.symbol.get_or_default()
    }

    pub fn decimals(&self) -> u8 {
        self.decimals.get_or_default()
    }

    pub fn total_supply(&self) -> U256 {
        self.total_supply.get_or_default()
    }
}

impl Erc20 {
   pub fn mint(&mut self, address: &Address, amount: &U256) {
        self.balances.add(address, *amount);
        self.total_supply.add(*amount);
        
        self.env().emit_event(Transfer {
            from: None,
            to: Some(*address),
            amount: *amount
        });
    }
}

#[odra::event]
pub struct Transfer {
    pub from: Option<Address>,
    pub to: Option<Address>,
    pub amount: U256
}
```

* **L1** - The first `impl` block, marked as a module, contains functions defined in the ERC-20 standard.
* **L3-L9** - A constructor sets the token metadata and mints the initial supply.
* **L28** - The second `impl` is not an Odra module; in other words, these functions will not be part of the contract's public interface.
* **L29-L38** - The `mint` function is public, so, like in regular Rust code, it will be accessible from the outside. `mint()` uses the notation `self.balances.add(address, *amount);`, which is syntactic sugar for:
```rust
use odra::UnwrapOrRevert;

let current_balance = self.balances.get(address).unwrap_or_default();
let new_balance = <U256 as OverflowingAdd>::overflowing_add(current_balance, current_balance).unwrap_or_revert(&self.env());
self.balances.set(address, new_balance);
```

### Core

To ensure comprehensive functionality, let's implement the remaining features such as `transfer`, `transfer_from`, and `approve`. Since they do not introduce any new concepts, we will present them without additional remarks.

```rust showLineNumbers title=erc20.rs
#[odra::module]
impl Erc20 {
    ...

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

    pub fn balance_of(&self, address: &Address) -> U256 {
        self.balances.get_or_default(&address)
    }

    pub fn allowance(&self, owner: &Address, spender: &Address) -> U256 {
        self.allowances.get_or_default(&(*owner, *spender))
    }
}

impl Erc20 {
    ...

    fn raw_transfer(&mut self, owner: &Address, recipient: &Address, amount: &U256) {
        let owner_balance = self.balances.get_or_default(&owner);
        if *amount > owner_balance {
            self.env().revert(Error::InsufficientBalance)
        }
        self.balances.set(owner, owner_balance - *amount);
        self.balances.add(recipient, *amount);
        self.env().emit_event(Transfer {
            from: Some(*owner),
            to: Some(*recipient),
            amount: *amount
        });
    }

    fn spend_allowance(&mut self, owner: &Address, spender: &Address, amount: &U256) {
        let allowance = self.allowance(owner, spender);
        if allowance < *amount {
            self.env().revert(Error::InsufficientAllowance)
        }
        let new_allowance = allowance - *amount;
        self.allowances
            .set(&(*owner, *spender), new_allowance);
        self.env().emit_event(Approval {
            owner: *owner,
            spender: *spender,
            value: allowance - *amount
        });
    }
}

#[odra::event]
pub struct Approval {
    pub owner: Address,
    pub spender: Address,
    pub value: U256
}

#[odra::odra_error]
pub enum Error {
    InsufficientBalance = 1,
    InsufficientAllowance = 2,
}
```

Now, compare the code we have written, with [Open Zeppelin code][erc20-open-zeppelin]. Out of 10, how Solidity-ish is our implementation?

### Test

```rust title=erc20.rs showLineNumbers
#[cfg(test)]
pub mod tests {
    use super::*;
    use odra::{casper_types::U256, host::{Deployer, HostEnv, HostRef}};

    const NAME: &str = "Plascoin";
    const SYMBOL: &str = "PLS";
    const DECIMALS: u8 = 10;
    const INITIAL_SUPPLY: u32 = 10_000;

    fn setup() -> (HostEnv, Erc20HostRef) {
        let env = odra_test::env();
        (
            env.clone(),
            Erc20::deploy(
                &env,
                Erc20InitArgs {
                    symbol: SYMBOL.to_string(),
                    name: NAME.to_string(),
                    decimals: DECIMALS,
                    initial_supply: INITIAL_SUPPLY.into()
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
            &erc20,
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
        erc20.transfer(&recipient, &amount);

        // Then the sender balance is deducted.
        assert_eq!(
            erc20.balance_of(&sender),
            U256::from(INITIAL_SUPPLY) - amount
        );

        // Then the recipient balance is updated.
        assert_eq!(erc20.balance_of(&recipient), amount);

        // Then Transfer event was emitted.
        assert!(env.emitted_event(
            &erc20,
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
        assert!(erc20.try_transfer(&recipient, &amount).is_err());
    }

    #[test]
    fn transfer_from_and_approval_work() {
        let (env, mut erc20) = setup();

        let (owner, recipient, spender) =
            (env.get_account(0), env.get_account(1), env.get_account(2));
        let approved_amount = 3_000.into();
        let transfer_amount = 1_000.into();

        assert_eq!(erc20.balance_of(&owner), U256::from(INITIAL_SUPPLY));

        // Owner approves Spender.
        erc20.approve(&spender, &approved_amount);

        // Allowance was recorded.
        assert_eq!(erc20.allowance(&owner, &spender), approved_amount);
        assert!(env.emitted_event(
            &erc20,
            &Approval {
                owner,
                spender,
                value: approved_amount
            }
        ));

        // Spender transfers tokens from Owner to Recipient.
        env.set_caller(spender);
        erc20.transfer_from(&owner, &recipient, &transfer_amount);

        // Tokens are transferred and allowance decremented.
        assert_eq!(
            erc20.balance_of(&owner),
            U256::from(INITIAL_SUPPLY) - transfer_amount
        );
        assert_eq!(erc20.balance_of(&recipient), transfer_amount);
        assert!(env.emitted_event(
            &erc20,
            &Approval {
                owner,
                spender,
                value: approved_amount - transfer_amount
            }
        ));
        assert!(env.emitted_event(
            &erc20,
            &Transfer {
                from: Some(owner),
                to: Some(recipient),
                amount: transfer_amount
            }
        ));
        // assert!(env.emitted(erc20.address(), "Transfer"));
    }

    #[test]
    fn transfer_from_error() {
        // Given a new instance.
        let (env, mut erc20) = setup();

        // When the spender's allowance is zero.
        let (owner, spender, recipient) =
            (env.get_account(0), env.get_account(1), env.get_account(2));
        let amount = 1_000.into();
        env.set_caller(spender);

        // Then transfer fails.
        assert_eq!(
            erc20.try_transfer_from(&owner, &recipient, &amount),
            Err(Error::InsufficientAllowance.into())
        );
    }
}
```

* **L146** - Alternatively, if you don't want to check the entire event, you may assert only its type.

## What's next
Having two modules: `Ownable` and `Erc20`, let's combine them, and create an ERC-20 on steroids.

[erc20]: https://eips.ethereum.org/EIPS/eip-20
[erc20-open-zeppelin]: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol
