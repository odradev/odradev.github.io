---
sidebar_position: 8
description: Causing and handling errors
---

# Errors

Odra comes with tools that allow you to throw, handle and test for errors in execution. Take a look at the
following example of a simple owned contract:

```rust title="examples/src/features/handling_errors.rs"
use odra::prelude::*;
use odra::{Address, module::Module, OdraError, Var};

#[odra::module]
pub struct OwnedContract {
    name: Var<String>,
    owner: Var<Address>
}

#[derive(OdraError)]
pub enum Error {
    OwnerNotSet = 1,
    NotAnOwner = 2
}

#[odra::module]
impl OwnedContract {
    pub fn init(&mut self, name: String) {
        self.name.set(name);
        self.owner.set(self.env().caller())
    }

    pub fn name(&self) -> String {
        self.name.get_or_default()
    }

    pub fn owner(&self) -> Address {
        self.owner.get_or_revert_with(Error::OwnerNotSet)
    }

    pub fn change_name(&mut self, name: String) {
        let caller = self.env().caller();
        if caller != self.owner() {
            self.env().revert(Error::NotAnOwner)
        }

        self.name.set(name);
    }
}

```

Firstly, we are using the `OdraError` derive attribute to define our own set of Errors that our contract will
throw. Then, you can use those errors in your code - for example, instead of unwrapping Options, you can use
`unwrap_or_revert_with` and pass an error as an argument:

```rust title="examples/src/features/handling_errors.rs"
self.owner.get().unwrap_or_revert_with(Error::OwnerNotSet)
```

You can also throw the error directly, by using `revert`:

```rust title="examples/src/features/handling_errors.rs"
self.env().revert(Error::NotAnOwner)
```

Defining an error in Odra, you must keep in mind a few rules:

1. An error should be a field-less enum. 
2. The enum must derive from `OdraError`.
3. Avoid implicit discriminants.

:::note
In your project you can define as many error enums as you wish, but you must ensure that the discriminants are unique across the project!
:::

## Testing errors

Okay, but how about testing it? Let's write a test that will check if the error is thrown when the caller is not an owner:

```rust title="examples/src/features/handling_errors.rs"
#[cfg(test)]
mod tests {
    use super::{Error, OwnedContractHostRef, OwnedContractInitArgs};
    use odra::host::Deployer;
    use odra::prelude::*;

    #[test]
    fn test_owner_error() {
        let test_env = odra_test::env();
        let owner = test_env.get_account(0);
        let not_an_owner = test_env.get_account(1);

        test_env.set_caller(owner);
        let init_args = OwnedContractInitArgs {
            name: "OwnedContract".to_string()
        };
        let mut owned_contract = OwnedContractHostRef::deploy(&test_env, init_args);

        test_env.set_caller(not_an_owner);
        assert_eq!(
            owned_contract.try_change_name("NewName".to_string()),
            Err(Error::NotAnOwner.into())
        );
    }
}
```
Each `{{ModuleName}}HostRef` has `try_{{entry_point_name}}` functions that return an [`OdraResult`].
`OwnedContractHostRef` implements regular entrypoints: `name`, `owner`, `change_name`, and 
and safe its safe version: `try_name`, `try_owner`, `try_change_name`.

In our example, we are calling `try_change_name` and expecting an error to be thrown.
For assertions, we are using a standard `assert_eq!` macro. As the contract call returns an `OdraError`, 
we need to convert our custom error to `OdraError` using `Into::into()`.

## What's next
We will learn how to emit and test events using Odra.

[`OdraResult`]: https://docs.rs/odra/0.8.1/odra/type.OdraResult.html
[`OdraError`]: https://docs.rs/odra/0.8.1/odra/enum.OdraError.html