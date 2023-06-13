---
sidebar_position: 3
---

# ERC-20
It's time for something that every smart contract developer has done at least once. Let's try to implement [Erc20][erc20] standard. Of course, we are going to use the Odra Framework. 

The ERC-20 standard establishes a uniform specification for fungible tokens. This implies that each token possesses an attribute that renders it indistinguishable from another token of the same type and value. 

## Framework features
A module we will write in a minute, will help you master a few Odra features:

* advanced storage - key-value pairs, 
* Odra types like `Address` or `Balance`, 
* advanced events assertion.
  
## Code

Our module has a pretty complex storage layout in comparison to the previous example.

We need to store the following data:
1. Immutable metadata - name, symbol and decimals.
2. Total supply.
3. Users' balances.
4. Allowances - in other words: who is allowed to spend whose tokens on his/her behalf.
   
## Module definition
```rust showLineNumbers
#[odra::module]
pub struct Erc20 {
    decimals: Variable<u8>,
    symbol: Variable<String>,
    name: Variable<String>,
    total_supply: Variable<Balance>,
    balances: Mapping<Address, Balance>,
    allowances: Mapping<Address, Mapping<Address, U256>>
}
```

* **L6** - For the first time, we need to store key-value pairs. In order to do that, we use `Mapping`. The name is taken after Solidity's native type `mapping`. You may notice the `balances` property maps `Address` to `Balance`. If you deal with addresses or you operate on tokens, you should always choose `Address` over `String` and `Balance` over any numeric type. Each blockchain may handle these values differently. Using Odra types guarantees proper behavior on each target platform.
* **L7** - Odra allows nested `Mapping`s, what we utilize to store allowances.

### Metadata

```rust showLineNumbers
#[odra::module]
impl Erc20 {
    #[odra(init)]
    pub fn init(&mut self, name: String, symbol: String, decimals: u8, initial_supply: Balance) {
        let caller = contract_env::caller();
        self.name.set(name);
        self.symbol.set(symbol);
        self.decimals.set(decimals);
        self.mint(caller, initial_supply);
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

    pub fn total_supply(&self) -> Balance {
        self.total_supply.get_or_default()
    }
}

impl Erc20 {
    pub fn mint(&mut self, address: Address, amount: Balance) {
        self.balances.add(&address, amount);
        self.total_supply.add(amount);
        Transfer {
            from: None,
            to: Some(address),
            amount
        }
        .emit();
    }
}

#[derive(Event, PartialEq, Eq, Debug)]
pub struct Transfer {
    pub from: Option<Address>,
    pub to: Option<Address>,
    pub amount: Balance
}
```

* **L1** - The first `impl` block, marked as a module, contains functions defined in the ERC-20 standard.
* **L3-L10** - A constructor sets the token metadata and mints the initial supply.
* **L12-L14** - Getter functions are straightforward, but there is one worth-mentioning subtleness. In the `Ownable` example, we used the `get()` function returning an `Option<T>`. If the type implements `Default` trait, you can call `get_or_default()` function and the contract does not fail even if the value is not initialized.
* **L29** - The second `impl` is not an odra module, in other words these function will not be a part of contract's ABI.
* **L30-L39** - Mint function is public, so like in a regular rust code will be accessible from the outside. `mint()` use notation `self.balances.add(&address, amount);`, which it is syntactic sugar for:
```rust
let current_balance = self.balances.get(&address).unwrap_or_default();
let new_balance = current_balance.overflowing_add(current_balance).unwrap_or_revert();
self.balances.set(&address, new_balance);
```

### Core

For the sake of completeness, let's implement the remaining functionalities like `transfer`, `transfer_from`, or `approve`. They are not introducing any new concepts, so we leave them without additional remarks.

```rust title=erc20.rs
#[odra::module]
impl Erc20 {
    ...
    pub fn transfer(&mut self, recipient: Address, amount: U256) {
        let caller = contract_env::caller();
        self.raw_transfer(caller, recipient, amount);
    }

    pub fn transfer_from(&mut self, owner: Address, recipient: Address, amount: U256) {
        let spender = contract_env::caller();
        self.spend_allowance(owner, spender, amount);
        self.raw_transfer(owner, recipient, amount);
    }

    pub fn approve(&mut self, spender: Address, amount: U256) {
        let owner = contract_env::caller();
        self.allowances.get_instance(&owner).set(&spender, amount);
        Approval {
            owner,
            spender,
            value: amount
        }
        .emit();
    }

    pub fn balance_of(&self, address: Address) -> U256 {
        self.balances.get_or_default(&address)
    }

    pub fn allowance(&self, owner: Address, spender: Address) -> U256 {
        self.allowances
            .get_instance(&owner)
            .get_or_default(&spender)
    }
}

impl Erc20 {
    ...

    fn raw_transfer(&mut self, owner: Address, recipient: Address, amount: U256) {
        let owner_balance = self.balances.get_or_default(&owner);
        if amount > owner_balance {
            contract_env::revert(Error::InsufficientBalance)
        }
        self.balances.set(&owner, owner_balance - amount);
        self.balances.add(&recipient, amount);
        Transfer {
            from: Some(owner),
            to: Some(recipient),
            amount
        }
        .emit();
    }

    fn spend_allowance(&mut self, owner: Address, spender: Address, amount: U256) {
        let allowance = self
            .allowances
            .get_instance(&owner)
            .get_or_default(&spender);
        if allowance < amount {
            contract_env::revert(Error::InsufficientAllowance)
        }
        self.allowances
            .get_instance(&owner)
            .set(&spender, allowance - amount);
        Approval {
            owner,
            spender,
            value: allowance - amount
        }
        .emit();
    }
}

#[derive(Event, PartialEq, Eq, Debug)]
pub struct Approval {
    pub owner: Address,
    pub spender: Address,
    pub value: U256
}

execution_error! {
    pub enum Error {
        InsufficientBalance => 1,
        InsufficientAllowance => 2,
    }
}
```

Now, compare the code we have written, with [Open Zeppelin code][erc20-open-zeppelin]. Out of 10, how Solidity-ish is our implementation?

### Test

```rust title=erc20.rs showLineNumbers
#[cfg(test)]
pub mod tests {
    use super::{Approval, Erc20Deployer, Erc20Ref, Error, Transfer};
    use odra::{assert_events, test_env, types::U256};

    pub const NAME: &str = "Plascoin";
    pub const SYMBOL: &str = "PLS";
    pub const DECIMALS: u8 = 10;
    pub const INITIAL_SUPPLY: u32 = 10_000;

    pub fn setup() -> Erc20Ref {
        Erc20Deployer::init(
            String::from(NAME),
            String::from(SYMBOL),
            DECIMALS,
            INITIAL_SUPPLY.into()
        )
    }

    #[test]
    fn initialization() {
        let erc20 = setup();

        assert_eq!(&erc20.symbol(), SYMBOL);
        assert_eq!(&erc20.name(), NAME);
        assert_eq!(erc20.decimals(), DECIMALS);
        assert_eq!(erc20.total_supply(), INITIAL_SUPPLY.into());
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
        let mut erc20 = setup();
        let (sender, recipient) = (test_env::get_account(0), test_env::get_account(1));
        let amount = 1_000.into();

        erc20.transfer(recipient, amount);

        assert_eq!(
            erc20.balance_of(sender),
            U256::from(INITIAL_SUPPLY) - amount
        );
        assert_eq!(erc20.balance_of(recipient), amount);
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
        let erc20 = setup();
        let recipient = test_env::get_account(1);
        let amount = U256::from(INITIAL_SUPPLY) + U256::from(1);

        test_env::assert_exception(Error::InsufficientBalance, || {
            // If we don't create a new ref, an error occurs:
            // cannot borrow `erc20` as mutable, as it is a captured variable 
            // in a `Fn` closure cannot borrow as mutable
            let mut erc20 = Erc20Ref::at(erc20.address());
            erc20.transfer(recipient, amount)
        });
    }

    #[test]
    fn transfer_from_and_approval_work() {
        let mut erc20 = setup();
        let (owner, recipient, spender) = (
            test_env::get_account(0),
            test_env::get_account(1),
            test_env::get_account(2)
        );
        let approved_amount = 3_000.into();
        let transfer_amount = 1_000.into();

        // Owner approves Spender.
        erc20.approve(spender, approved_amount);

        // Allowance was recorded.
        assert_eq!(erc20.allowance(owner, spender), approved_amount);
        assert_events!(
            erc20,
            Approval {
                owner,
                spender,
                value: approved_amount
            }
        );

        // Spender transfers tokens from Owner to Recipient.
        test_env::set_caller(spender);
        erc20.transfer_from(owner, recipient, transfer_amount);

        // Tokens are transferred and allowance decremented.
        assert_eq!(
            erc20.balance_of(owner),
            U256::from(INITIAL_SUPPLY) - transfer_amount
        );
        assert_eq!(erc20.balance_of(recipient), transfer_amount);
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
        
        assert_events!(erc20, Approval, Transfer);
    }

    #[test]
    fn transfer_from_error() {
        let erc20 = setup();
        let (owner, spender) = (test_env::get_account(0), test_env::get_account(1));
        let amount = 1_000.into();

        test_env::set_caller(spender);
        test_env::assert_exception(Error::InsufficientAllowance, || {
            // If we don't create a new ref, an error occurs:
            // cannot borrow `erc20` as mutable, as it is a captured variable 
            // in a `Fn` closure cannot borrow as mutable
            let mut erc20 = Erc20Ref::at(erc20.address());
            erc20.transfer_from(owner, spender, amount)
        });
    }
}
```

* **L111-123** - `assert_events!()` macro accepts multiple events. You must pass them in the order they were emitted. 
* **L125** - Alternatively, if you don't want to check the entire event, you may assert only its type.

:::warning
You can not mix both approaches, you pass full events or types only.
:::

## What's next
Having two modules: `Ownable` and `Erc20`, let's combine them, and create an ERC-20 on steroids.

[erc20]: https://eips.ethereum.org/EIPS/eip-20
[erc20-open-zeppelin]: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol
