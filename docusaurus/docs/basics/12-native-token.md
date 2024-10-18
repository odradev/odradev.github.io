---
sidebar_position: 13
description: How to deposit, withdraw and transfer
---

# Native token
Different blockchains come with different implementations of their native tokens. Odra wraps it all for you
in easy-to-use code. Let's write a simple example of a public wallet - a contract where anyone can deposit
their funds and anyone can withdraw them:

```rust title="examples/src/features/native_token.rs"
use odra::prelude::*;
use odra::casper_types::U512;

#[odra::module]
pub struct PublicWallet;

#[odra::module]
impl PublicWallet {
    #[odra(payable)]
    pub fn deposit(&mut self) {}

    pub fn withdraw(&mut self, amount: &U512) {
        self.env().transfer_tokens(&self.env().caller(), amount);
    }
}
```

:::warning
The code above works, but is dangerous and unfinished - besides allowing you to lose your funds to anyone, it doesn't make
any checks. To keep the code simple, we skipped the part, where the contract checks if the transfer is
even possible.

To see a more reasonable example, check out `examples/src/contracts/tlw.rs` in the odra main repository.
:::

You can see a new attribute used here: `#[odra(payable)]` - it will add all the code needed for a function to
be able to receive the funds. Additionally, we are using a new function from `ContractEnv::transfer_tokens()`.
It does exactly what you are expecting it to do - it transfers native tokens from the contract to the
specified address.

## Testing
To be able to test how many tokens a contract (or any address) has, `HostEnv` comes with a function -
`balance_of`:

```rust title="examples/src/features/native_token.rs"
#[cfg(test)]
mod tests {
    use super::PublicWallet;
    use odra::{casper_types::U512, host::{Deployer, HostRef, NoArgs}};

    #[test]
    fn test_modules() {
        let test_env = odra_test::env();
        let mut my_contract = PublicWallet::deploy(&test_env, NoArgs);
        assert_eq!(test_env.balance_of(my_contract.address()), U512::zero());

        my_contract.with_tokens(U512::from(100)).deposit();
        assert_eq!(test_env.balance_of(my_contract.address()), U512::from(100));

        my_contract.withdraw(U512::from(25));
        assert_eq!(test_env.balance_of(my_contract.address()), U512::from(75));
    }
}
```

## HostEnv
In a broader context of the host environment (test, livenet), you can also transfer `CSPR` tokens between accounts:

```rust showLineNumbers
let env = odra_casper_livenet_env::env();
//let env = odra_test::env();
let (alice, bob) = (env.get_account(0), env.get_account(1));

env.set_caller(alice);
let result = env.transfer_tokens(bob, odra::casper_types::U512::from(100));
```
