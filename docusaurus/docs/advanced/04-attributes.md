# Attributes

Smart contract developers with Ethereum background are familiar with Solidity's concept of modifiers in Solidity - a feature that allows developers to embed common checks into function definitions in a readable and reusable manner. These are essentially prerequisites for function execution.

Odra defines a few attributes that can be applied to functions to equip them with superpowers.

## Init

If your contract needs initial setup, adding the `#[odra(init)]` attribute to your function operates similarly to a constructor in object-oriented programming. This constructor is called immediately after the contract is deployed.

It's important to note that a constructor function should not be invoked in any other context.

### Example

```rust title=examples/src/contracts/erc20.rs
#[odra(init)]
pub fn init(&mut self, name: String, symbol: String, decimals: u8, initial_supply: &U256) {
    let caller = contract_env::caller();
    self.name.set(name);
    self.symbol.set(symbol);
    self.decimals.set(decimals);
    self.mint(&caller, initial_supply);
}
```

## Payable

When writing a smart contract, you need to make sure that money can be both sent to and extracted from the contract. The 'payable' attribute helps wit this. Any function, except for a constructor, with the `#[odra(payable)]` attribute can send and take money in the form of native tokens. 

### Example

```rust title=examples/src/contracts/tlw.rs
#[odra(payable)]
pub fn deposit(&mut self) {
    // Extract values
    let caller: Address = contract_env::caller();
    let amount: Balance = contract_env::attached_value();
    let current_block_time: BlockTime = contract_env::get_block_time();

    // Multiple lock check
    if self.balances.get(&caller).is_some() {
        contract_env::revert(Error::CannotLockTwice)
    }

    // Update state, emit event
    self.balances.set(&caller, amount);
    self.lock_expiration_map
        .set(&caller, current_block_time + self.lock_duration());
    Deposit {
        address: caller,
        amount
    }
    .emit();
}
```

If you try to send tokens to a non-payable function, the transaction will be automatically rejected.


## Non Reentrant

Reentrancy attacks in smart contracts exploit the possibility of a function being called multiple times before its initial execution is completed, leading to the repeated unauthorized withdrawal of funds. 

To prevent such attacks, developers should ensure that all effects on the contract's state and balance checks occur before calling external contracts. 

They can also use reentrancy guards to block recursive calls to sensitive functions.

In Odra you can just apply the `#[odra(non_reentrant)]` attribute to your function.

## Mixing attributes

A function can accept more than one attribute. The only exclusion is a constructor cannot be payable.
To apply multiple attributes, you can write:

```rust
#[odra(payable, non_reentrant)]
fn deposit() {
  // your logic...
}
```

or 

```rust
#[odra(payable)]
#[odra(non_reentrant)]
fn deposit() {
  // your logic...
}
```

In both cases attributes order does not matter.


However, a constructor cannot be payable, so the below code would not compile.

```rust
#[odra(payable)]
#[odra(init)]
fn initialize() {
  // your logic...
}
```
