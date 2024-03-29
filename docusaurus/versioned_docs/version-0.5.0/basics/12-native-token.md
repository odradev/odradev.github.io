---
sidebar_position: 12
description: How to deposit, withdraw and transfer
---

# Native token
Different blockchains come with different implementations of their native tokens. Odra wraps it all for you
in easy-to-use code. Let's write a simple example of a public wallet - a contract where anyone can deposit
their funds and anyone can withdraw them:

```rust title="examples/src/features/native_token.rs"
use odra::types::Balance;
use odra::contract_env;

#[odra::module]
pub struct PublicWallet {
}

#[odra::module]
impl PublicWallet {
    #[odra(payable)]
    pub fn deposit(&mut self) {
    }

    pub fn withdraw(&mut self, amount: Balance) {
        contract_env::transfer_tokens(contract_env::caller(), amount);
    }
}
```

:::warning
The code above works, but is dangerous and unfinished - besides allowing you to lose your funds to anyone, it doesn't make
any checks. To keep the code simple, we skipped the part, where the contract checks if the transfer is
even possible.

To see a more reasonable example, check out `examples/src/tlw.rs` in the odra main repository.
:::

You can see a new macro used here: `#[odra(payable)]` - it will add all the code needed for a function to
be able to receive the funds. Additionally, we are using a new function from contract_env - `transfer_tokens`.
It does exactly what you are expecting it to do - it will transfer native tokens from the contract to the
specified address.

We are also using the `Balance` - an Odra type that wraps around the type that the underlying blockchain uses
for counting tokens.

## Testing
To be able to test how many tokens a contract (or any address) has, `test_env` comes with a function -
`token_balance`:

```rust title="examples/src/features/native_token.rs"
use odra::types::Balance;
use odra::test_env;
use super::PublicWalletDeployer;

#[test]
fn test_modules() {
    let mut my_contract = PublicWalletDeployer::default();
    assert_eq!(test_env::token_balance(my_contract.address()), Balance::zero());

    my_contract.with_tokens(Balance::from(100)).deposit();
    assert_eq!(test_env::token_balance(my_contract.address()), Balance::from(100));

    my_contract.withdraw(Balance::from(25));
    assert_eq!(test_env::token_balance(my_contract.address()), Balance::from(75));
}
```
