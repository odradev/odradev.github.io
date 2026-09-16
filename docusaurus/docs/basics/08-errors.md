---
sidebar_position: 8
description: Causing and handling errors
---

# Errors

Odra comes with tools that allow you to throw, handle and test for errors in execution. Take a look at the
following example of a simple owned contract:

```rust title="examples/src/features/handling_errors.rs"
use odra::prelude::*;

#[odra::module(errors = Error)]
pub struct OwnedContract {
    name: Var<String>,
    owner: Var<Address>
}

#[odra::odra_error]
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

Firstly, we are using the `#[odra::odra_error]` attribute to define our own set of Errors that our contract will
throw. Then, you can use those errors in your code - for example, instead of forcefully unwrapping Options, you can use
`get_or_revert_with` and pass an error as an argument:

```rust title="examples/src/features/handling_errors.rs"
self.owner.get_or_revert_with(Error::OwnerNotSet)
```

:::note
`Var` also exposes the underlying `unwrap_or_revert_with`, but that one comes from the `UnwrapOrRevert`
trait and takes two arguments - the reverting module and the error:
`self.owner.get().unwrap_or_revert_with(self, Error::OwnerNotSet)`. On a `Var`, prefer the single-argument
`get_or_revert_with` shown above.
:::

You can also throw the error directly, by using `revert`:

```rust title="examples/src/features/handling_errors.rs"
self.env().revert(Error::NotAnOwner)
```

To register errors, add the `errors` inner attribute to the struct's `#[odra::module]` attribute and pass the error type as the value. The registered errors will be present in the contract [`schema`].

Defining an error in Odra, you must keep in mind a few rules:

1. An error should be a field-less enum. 
2. The enum must be annotated with `#[odra::odra_error]`.
3. Avoid implicit discriminants.

:::note
In your project you can define as many error enums as you wish, but you must ensure that the discriminants are unique across the project!
:::

## Testing errors

Okay, but how about testing it? Let's write a test that will check if the error is thrown when the caller is not an owner:

```rust title="examples/src/features/handling_errors.rs"
#[cfg(test)]
mod tests {
    use super::{Error, OwnedContract, OwnedContractInitArgs};
    use odra::{host::Deployer, prelude::*};

    #[test]
    fn test_owner_error() {
        let test_env = odra_test::env();
        let owner = test_env.get_account(0);
        let not_an_owner = test_env.get_account(1);

        test_env.set_caller(owner);
        let init_args = OwnedContractInitArgs {
            name: "OwnedContract".to_string()
        };
        let mut owned_contract = OwnedContract::deploy(&test_env, init_args);

        test_env.set_caller(not_an_owner);
        assert_eq!(
            owned_contract
                .try_change_name("NewName".to_string())
                .unwrap_err(),
            Error::NotAnOwner.into()
        );
    }
}
```
Each deployed contract is of `{{ModuleName}}HostRef` type and has `try_{{entry_point_name}}` functions
that return an [`OdraResult`].
`OwnedContractHostRef` implements regular entrypoints: `name`, `owner`, `change_name`, and 
and safe its safe version: `try_name`, `try_owner`, `try_change_name`.

In our example, we are calling `try_change_name` and expecting an error to be thrown.
For assertions, we are using a standard `assert_eq!` macro. As the contract call returns an `OdraError`, 
we need to convert our custom error to `OdraError` using `Into::into()`.

## Error codes

When a transaction fails on Casper, the node reports only a number, for example:

```json
"error_message": "User error: 64653"
```

Odra maps every error, both yours and its own, to a single `u16` code that is passed to the host as a
Casper `User` error. Two ranges are used:

- **User errors** - the discriminants you define in enums annotated with `#[odra::odra_error]` are reported as-is.
  Codes must be lower than `64535` (`MaxUserError`); a higher value is replaced with `UserErrorTooHigh` (`64536`).
- **Internal Odra errors** - `ExecutionError` variants raised by the framework itself. Their on-chain code is
  `64536 + <internal code>`, so any code above `64536` is an internal Odra error.

To decode an internal error, subtract `64536` from the reported code. In the example above, `64653 - 64536 = 117`,
which is `KeyNotFound`.

:::note
The livenet backend does this translation for you - `try_*` calls return the matching `ExecutionError`, and user
errors are resolved to their names using the contract [`schema`]. The table below is for cases when you only have
the raw code, for example from a block explorer or the node RPC.
:::

| Error | Internal code | On-chain code | Description |
|---|---|---|---|
| `UnwrapError` | 1 | 64537 | Unwrap error |
| `UnexpectedError` | 2 | 64538 | Something unexpected happened |
| `AdditionOverflow` | 100 | 64636 | Addition overflow |
| `SubtractionOverflow` | 101 | 64637 | Subtraction overflow |
| `NonPayable` | 102 | 64638 | Method does not accept deposit |
| `TransferToContract` | 103 | 64639 | Can't transfer tokens to contract |
| `ReentrantCall` | 104 | 64640 | Reentrant call detected |
| `CannotOverrideKeys` | 105 | 64641 | Contract already installed |
| `UnknownConstructor` | 106 | 64642 | Unknown constructor |
| `NativeTransferError` | 107 | 64643 | Native transfer error |
| `IndexOutOfBounds` | 108 | 64644 | Index out of bounds |
| `ZeroAddress` | 109 | 64645 | Tried to construct a zero address |
| `AddressCreationFailed` | 110 | 64646 | Address creation failed |
| `EarlyEndOfStream` | 111 | 64647 | Early end of stream - deserialization error |
| `Formatting` | 112 | 64648 | Formatting error - deserialization error |
| `LeftOverBytes` | 113 | 64649 | Left over bytes - deserialization error |
| `OutOfMemory` | 114 | 64650 | Out of memory |
| `NotRepresentable` | 115 | 64651 | Not representable |
| `ExceededRecursionDepth` | 116 | 64652 | Exceeded recursion depth |
| `KeyNotFound` | 117 | 64653 | Key not found |
| `CouldNotDeserializeSignature` | 118 | 64654 | Could not deserialize signature |
| `TypeMismatch` | 119 | 64655 | Type mismatch |
| `CouldNotSignMessage` | 120 | 64656 | Could not sign message |
| `EmptyDictionaryName` | 121 | 64657 | Empty dictionary name |
| `MissingArg` | 122 | 64658 | Calling a contract with missing entrypoint arguments |
| `MissingAddress` | 123 | 64659 | Reading the address from the storage failed |
| `OutOfGas` | 124 | 64660 | Out of gas error |
| `MainPurseError` | 125 | 64661 | MainPurse error |
| `ConversionError` | 126 | 64662 | Conversion error |
| `ContractDeploymentError` | 127 | 64663 | Couldn't deploy the contract |
| `CannotExtractCallerInfo` | 128 | 64664 | Couldn't extract caller info |
| `ContractNotInstalled` | 129 | 64665 | Upgrading a contract that is not installed |
| `UpgradingWithoutPreviousVersion` | 130 | 64666 | Upgrading a contract without previous version |
| `UpgradingNotAContract` | 131 | 64667 | Upgrading not a contract |
| `SchemaMismatch` | 132 | 64668 | Upgrading a contract with a schema that does not match the previous version |
| `CannotDisablePreviousVersion` | 133 | 64669 | Cannot disable a previous version of a contract |
| `CannotUpgradeWithoutUpgrade` | 134 | 64670 | Cannot upgrade a contract without an upgrade function |
| `FactoryModuleCall` | 135 | 64671 | Factory module function should not be called directly |
| `CannotGetAnImmediateCaller` | 136 | 64672 | Cannot get an immediate caller |
| `PathIndexOutOfBounds` | 137 | 64673 | Path index out of bounds |

Two more codes are reserved:

| Error | On-chain code | Description |
|---|---|---|
| `MaxUserError` | 64535 | Upper bound of the user error space |
| `UserErrorTooHigh` | 64536 | A user error with a code of `64536` or higher was thrown |

## What's next
We will learn how to emit and test events using Odra.

[`OdraResult`]: https://docs.rs/odra/2.9.0/odra/type.OdraResult.html
[`OdraError`]: https://docs.rs/odra/2.9.0/odra/enum.OdraError.html
[`schema`]: ./casper-contract-schema