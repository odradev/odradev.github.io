---
sidebar_position: 8
description: Causing and handling errors
---

# Errors

Odra comes with tools that allow you to throw, handle and test for errors in execution. Take a look at the
following example of a simple owned contract:

```rust title="examples/src/docs/errors.rs"
use odra::{execution_error, Variable, UnwrapOrRevert};
use odra::types::Address;

#[odra::module]
pub struct OwnedContract {
    name: Variable<String>,
    owner: Variable<Address>,
}

execution_error! {
    pub enum Error {
        OwnerNotSet => 1,
        NotAnOwner => 2,
    }
}


#[odra::module]
impl OwnedContract {
    #[odra(init)]
    pub fn init(&mut self, name: String) {
        self.name.set(name);
        self.owner.set(odra::contract_env::caller())
    }

    pub fn name(&self) -> String {
        self.name.get_or_default()
    }

    pub fn owner(&self) -> Address {
        self.owner.get().unwrap_or_revert_with(Error::OwnerNotSet)
    }

    pub fn change_name(&mut self, name: String) {
        let caller = odra::contract_env::caller();
        if caller != self.owner() {
            odra::contract_env::revert(Error::NotAnOwner)
        }

        self.name.set(name);
    }
}
```

Firstly, we are using `execution_error!` macro to define our own set of Errors that our contract will
throw. Then, you can use those errors in your code - for example, instead of unwrapping Options, you can use
`unwrap_or_revert_with` and pass an error as an argument:

```rust title="examples/src/docs/errors.rs"
self.owner.get().unwrap_or_revert_with(Error::OwnerNotSet)
```

You and the users of your contract will be thankful for a meaningful error message!

You can also throw the error directly, by using `revert`:

```rust title="examples/src/docs/errors.rs"
odra::contract_env::revert(Error::NotAnOwner)
```

## Testing errors

Okay, but how about testing it? We've already mentioned a function - `assert_exception`. This is how you will
use it:

```rust title="examples/src/docs/errors.rs"
use super::{OwnedContractDeployer, OwnedContractRef};
use super::Error;

#[test]
fn test_owner_error() {
    let owner = odra::test_env::get_account(0);
    let not_an_owner = odra::test_env::get_account(1);

    odra::test_env::set_caller(owner);
    let mut owned_contract = OwnedContractDeployer::init("OwnedContract".to_string());

    odra::test_env::set_caller(not_an_owner);
    odra::test_env::assert_exception(Error::NotAnOwner, || {
        owned_contract.change_name("NewName".to_string());
    })
}
```

In the example above, because we are calling the `change_name` method as an address which is not an "owner",
we are expecting that "NotAnOwner" error will be thrown.

:::note
Here we are creating another reference to the already deployed contract using `OwnedContractRef::at()` and passing to it
its Address. Note that `OwnedContractDeployer::init()` returns the same type.
:::

## What's next
We will learn how to emit and test events using Odra.
