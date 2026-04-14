---
sidebar_position: 1
---

# Ownable
In this tutorial, we will write a simple module that allows us to set its owner. Later, it can be reused to limit access to the contract's critical features.

## Framework features
A module we will write in a minute, will help you master a few Odra features:

* storing a single value,
* defining a constructor,
* error handling,
* defining and emitting `events`.
* registering a contact in a test environment,
* interactions with the test environment,
* assertions (value, events, errors assertions).

## Code

Before we write any code, we define functionalities we would like to implement.

1. Module has an initializer that should be called once. 
2. Only the current owner can set a new owner.
3. Read the current owner.
4. A function that fails if called by a non-owner account.

### Define a module

```rust title=ownable.rs showLineNumbers
use odra::prelude::*;

#[odra::module(events = [OwnershipChanged])]
pub struct Ownable {
    owner: Var<Option<Address>>
}
```
That was easy, but it is crucial to understand the basics before we move on.

* **L3** - Firstly, we need to create a struct called `Ownable` and apply `#[odra::module(events = [OwnershipChanged])]` attribute to it. The `events` attribute is optional but informs the Odra toolchain about the events that will be emitted by the module and includes them in the contract's metadata. `OwnershipChanged` is a type that will be defined later.
* **L5** - Then we can define the layout of our module. It is extremely simple - just a single state value. What is most important is that you can never leave a raw type; you must always wrap it with `Var`.

### Init the module

```rust title=ownable.rs showLineNumbers
#[odra::module]
impl Ownable {
    pub fn init(&mut self, owner: Address) {
        if self.owner.get_or_default().is_some() {
            self.env().revert(Error::OwnerIsAlreadyInitialized)
        }

        self.owner.set(Some(owner));
        
        self.env().emit_event(OwnershipChanged {
            prev_owner: None,
            new_owner: owner
        });
    }
}

#[odra::odra_error]
pub enum Error {
    OwnerIsAlreadyInitialized = 1,
}

#[odra::event]
pub struct OwnershipChanged {
    pub prev_owner: Option<Address>,
    pub new_owner: Address
}
```

Ok, we have done a couple of things, let's analyze them one by one:
* **L1** - The `impl` should be an Odra module, so add `#[odra::module]`.
* **L3** - The `init` function is a constructor. This matters if we would like to deploy the `Ownable` module as a standalone contract.
* **L17-L20** - Before we set a new owner, we must assert there was no owner before and raise an error otherwise. For that purpose, we defined an `Error` enum. Notice that the `#[odra::odra_error]` attribute is applied to the enum. It generates, among others, the required `Into<odra::OdraError>` binding.
* **L4-L6** - If the owner has been set already, we call `ContractEnv::revert()` function with an `Error::OwnerIsAlreadyInitialized` argument. 
* **L8** - Then we write the owner passed as an argument to the storage. To do so, we call the `set()` on `Var`.
* **L22-L26** - Once the owner is set, we would like to inform the outside world. The first step is to define an event struct. The struct annotated with `#[odra::event]` attribute.
* **L10** - Finally, call `ContractEnv::emit_event()` passing the `OwnershipChanged` instance to the function. Hence, we set the first owner, we set the `prev_owner` value to `None`. 
### Features implementation

``` rust title=ownable.rs showLineNumbers
#[odra::module]
impl Ownable {
    ...

    pub fn ensure_ownership(&self, address: &Address) {
        if Some(address) != self.owner.get_or_default().as_ref() {
            self.env().revert(Error::NotOwner)
        }
    }

    pub fn change_ownership(&mut self, new_owner: &Address) {
        self.ensure_ownership(&self.env().caller());
        let current_owner = self.get_owner();
        self.owner.set(Some(*new_owner));
        self.env().emit_event(OwnershipChanged {
            prev_owner: Some(current_owner),
            new_owner: *new_owner
        });
    }

    pub fn get_owner(&self) -> Address {
        match self.owner.get_or_default() {
            Some(owner) => owner,
            None => self.env().revert(Error::OwnerIsNotInitialized)
        }
    }
}

#[odra::odra_error]
pub enum Error {
    NotOwner = 1,
    OwnerIsAlreadyInitialized = 2,
    OwnerIsNotInitialized = 3,
}
```
The above implementation relies on the concepts we have already used in this tutorial, so it should be easy for you to get along.

* **L7,L31** - `ensure_ownership()` reads the current owner and reverts if it does not match the input `Address`. Also, we need to update our `Error` enum by adding a new variant `NotOwner`.
* **L11** - The function defined above can be reused in the `change_ownership()` implementation. We pass to it the current caller, using the `ContractEnv::caller()` function. Then we update the state and emit `OwnershipChanged`.
* **L21,L33** - Lastly, a getter function. Read the owner from storage, if the getter is called on an uninitialized module, it should revert with a new `Error` variant `OwnerIsNotInitialized`. There is one worth-mentioning subtlety: `Var::get()` function returns `Option<T>`. If the type implements the `Default` trait, you can call the `get_or_default()` function, and the contract does not fail even if the value is not initialized. As the `owner` is of type `Option<Address>` the `Var::get()` would return `Option<Option<Address>>`, we use `Var::get_or_default()` instead.

### Test

```rust title=ownable.rs showLineNumbers
#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::{Deployer, HostEnv};

    fn setup() -> (OwnableHostRef, HostEnv, Address) {
        let env: HostEnv = odra_test::env();
        let init_args = OwnableInitArgs {
            owner: env.get_account(0)
        };
        (Ownable::deploy(&env, init_args), env.clone(), env.get_account(0))
    }

    #[test]
    fn initialization_works() {
        let (ownable, env, owner) = setup();
        assert_eq!(ownable.get_owner(), owner);
       
        env.emitted_event(
            &ownable,
            OwnershipChanged {
                prev_owner: None,
                new_owner: owner
            }
        );
    }

    #[test]
    fn owner_can_change_ownership() {
        let (mut ownable, env, owner) = setup();
        let new_owner = env.get_account(1);
        
        env.set_caller(owner);
        ownable.change_ownership(&new_owner);
        assert_eq!(ownable.get_owner(), new_owner);

        env.emitted_event(
            &ownable,
            OwnershipChanged {
                prev_owner: Some(owner),
                new_owner
            }
        );
    }

    #[test]
    fn non_owner_cannot_change_ownership() {
        let (mut ownable, env, _) = setup();
        let new_owner = env.get_account(1);
        ownable.change_ownership(&new_owner);
        
        assert_eq!(
            ownable.try_change_ownership(&new_owner), 
            Err(Error::NotOwner.into())
        );
    }
}
```
* **L6** - Each test case starts with the same initialization process, so for convenience, we have defined the `setup()` function, which we call in the first statement of each test. Take a look at the signature: `fn setup() -> (OwnableHostRef, HostEnv, Address)`. `OwnableHostRef` is a contract reference generated by Odra. This reference allows us to call all the defined entrypoints, namely: `ensure_ownership()`, `change_ownership()`, `get_owner()`, but not `init()`, which is a constructor.
* **L7-L11** - The starting point of every test is getting an instance of `HostEnv` by calling `odra_test::env()`. Our function returns a triple: a contract ref, an env, and an address (the initial owner). Odra's `#[odra::module]` attribute implements a `odra::host::Deployer` for `Ownable`, and `OwnableInitArgs` that we pass as the second argument of the `odra::host::Deployer::deploy()` function. Lastly, the module needs an owner. The easiest way is to take one from the `HostEnv`. We choose the address of first account (which is the default one). 
* **L14** - It is time to define the first test. As you see, it is a regular Rust test.
* **L16-17** - Using the `setup()` function, we get the owner and a reference (in this test, we don't use the env, so we ignore it). We make a standard assertion, comparing the owner we know with the value returned from the contract.
:::note
You may have noticed, we use here the term `module` interchangeably with `contract`. The reason is once we deploy our module onto a virtual blockchain it may be considered a contract.
:::
* **L19-25** - On the contract, only the `init()` function has been called, so we expect one event to have been emitted. To assert that, let's use `HostEnv`. To get the env, we call `env()` on the contract, then call `HostEnv::emitted_event`. As the first argument, pass the contract you want to read events from, followed by an event as you expect it to have occurred.
* **L31** - Because we know the initial owner is the 0th account, we must select a different account. It could be any index from 1 to 19 - the `HostEnv` predefines 20 accounts.
* **L33** - As mentioned, the default is the 0th account, if you want to change the executor, call the `HostEnv::set_caller()` function. 
:::note
The caller switch applies only the next contract interaction, the second call will be done as the default account.
::: 
* **L46-55** -  If a non-owner account tries to change ownership, we expect it to fail. To capture the error, call `HostEnv::try_change_ownership()` instead of `HostEnv::change_ownership()`. `HostEnv` provides try_ functions for each contract's entrypoint. The `try` functions return `OdraResult` (an alias for `Result<T, OdraError>`) instead of panicking and halting the execution. In our case, we expect the contract to revert with the `Error::NotOwner` error. To compare the error, we use the `Error::into()` function, which converts the error into the `OdraError` type.

## Summary
The `Ownable` module is ready, and we can test it against any defined backend. Theoretically it can be deployed as a standalone contract, but in upcoming tutorials you will see how to use it to compose a more complex contract.

## What's next
In the next tutorial we will implement a ERC20 standard.