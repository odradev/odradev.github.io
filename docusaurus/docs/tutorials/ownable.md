---
sidebar_position: 1
---

# Ownable
In this tutorial, we will write a simple module that allows us to set its owner. Later, it can be reused to limit access to the contract's critical features.

## Framework features
A module we will write in a minute, will help you master the following Odra features.

* Storage - storing a single value.
* Events.
* Error handling.
* Constructors.
* Testing - basic assertions, events assertions, errors assertions.

## Code

Before we write any code, we define functionalities we would like to implement.

1. Module has an initializer that may be called once. 
2. Only the current owner can set a new owner.
3. Read the current owner.
4. A function that fails if called by a non-owner account.

### Define a module

```rust
use odra::{types::Address, Variable};

// 1
#[odra::module]
pub struct Ownable {
    // 2
    owner: Variable<Address>
}
```
That was easy, but it is crucial to understand the basic before we move on.

1. Firstly, we need create a struct called `Ownable` and apply `#[odra::module]` to it above.
2. Then we can define a layout of our module. That is extremely simple - just a single state value. What is most important you can never leave a raw type, you must always wrap it with `Variable`.

### Init the module

```rust
use odra::{execution_error, contract_env, Event, types::event::OdraEvent};

...

// 1
#[odra::module]
impl Ownable {
    // 2
    #[odra(init)]
    pub fn init(&mut self, owner: Address) {
        // 4
        if self.owner.get().is_some() {
            contract_env::revert(Error::OwnerIsAlreadyInitialized)
        }
        // 5
        self.owner.set(owner);
        // 7
        OwnershipChanged {
            prev_owner: None,
            new_owner: owner
        }
        .emit();
    }
}

// 3
execution_error! {
    pub enum Error {
        OwnerIsNotInitialized => 1,
    }
}

// 6
#[derive(Event, Debug, PartialEq, Eq)]
pub struct OwnershipChanged {
    pub prev_owner: Option<Address>,
    pub new_owner: Address
}
```

Ok, we have done a couple of things, let's analyze them one by one:
1. The `impl` should be an odra module, so add `#[odra::module]`.
2. The `init` function is marked as `#[odra(init)]` making it a constructor. It matters if we would like to deploy the `Ownable` module as a standalone contract.
3. Before we set a new owner, we must assert there was no owner before and raise an error otherwise. For that purpose we defined an `Error` enum. Notice that the `Error` enum is defined inside the `execution_error` macro. It generates, among others, the required `Into<ExecutionError>` binding.
4. If the owner has been set already, we call `contract_env::revert()` function. As an argument we pass `Error::OwnerIsNotInitialized`. 
5. Then we write the owner passed as an argument to the storage. To do so we call the `set()` on `Variable`.
6. Once the owner is set, we would like to inform the outside world. First step is to define an event struct. The struct must derive from `odra::Event`. We highly recommend to derive `Debug`, `PartialEq` and `Eq` for testing purpose.
7. Finally, we create the `OwnershipChanged` struct and call `emit()` function on it (import `odra::types::event::OdraEvent` trait). Hence we set the first owner, we set the `prev_owner` value to `None`.


### Features implementation

``` rust
#[odra::module]
impl Ownable {
    ...

    // 1
    pub fn ensure_ownership(&self, address: Address) {
        if Some(address) != self.owner.get() {
            contract_env::revert(Error::NotOwner)
        }
    }

    // 2
    pub fn change_ownership(&mut self, new_owner: Address) {
        self.ensure_ownership(contract_env::caller());
        let current_owner = self.get_owner();
        self.owner.set(new_owner);
        OwnershipChanged {
            prev_owner: Some(current_owner),
            new_owner
        }
        .emit();
    }

    // 3
    pub fn get_owner(&self) -> Address {
        match self.owner.get() {
            Some(owner) => owner,
            None => contract_env::revert(Error::OwnerIsNotInitialized)
        }
    }
}

execution_error! {
    pub enum Error {
        // 1
        NotOwner => 1,
        OwnerIsAlreadyInitialized => 2,
        // 3
        OwnerIsNotInitialized => 3,
    }
}
```
The above implementation relies on the concepts we have already used in this tutorial, so it should easy for you to get along.

1. `ensure_ownership()` is reads the current owner, and reverts if is does not match the input `Address`. Also we need to update our `Error` enum adding a new variant `NotOwner`.
2. The function defined above can be reused in `change_ownership()` implementation. We pass to it the current caller, using the `contract_env::caller()` function. The we update the state, and emit `OwnershipChanged`.
3. Lastly, a getter function. As the `Variable` `get()` function returns an `Option`, we need to handle a possible error. If someone call the getter on uninitialized module, it should revert with a new `Error` variant `OwnerIsNotInitialized`.

### Test

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use odra::{assert_events, test_env};

    // 1
    fn setup() -> (Address, OwnableRef) {
        // 2
        let owner = test_env::get_account(0);
        // 3
        let ownable = OwnableDeployer::init(owner);
        (owner, ownable)
    }

    // 4
    #[test]
    fn initialization_works() {
        // 5
        let (owner, ownable) = setup();
        assert_eq!(ownable.get_owner(), owner);
        // 6
        assert_events!(
            ownable,
            OwnershipChanged {
                prev_owner: None,
                new_owner: owner
            }
        );
    }

    #[test]
    fn owner_can_change_ownership() {
        let (owner, mut ownable) = setup();
        // 7
        let new_owner = test_env::get_account(1);
        // 8
        test_env::set_caller(owner);
        ownable.change_ownership(new_owner);
        assert_eq!(ownable.get_owner(), new_owner);
        assert_events!(
            ownable,
            OwnershipChanged {
                prev_owner: Some(owner),
                new_owner
            }
        );
    }

    #[test]
    fn non_owner_cannot_change_ownership() {
        let (_, mut ownable) = setup();
        let new_owner = test_env::get_account(1);
        ownable.change_ownership(new_owner);
        // 9
        test_env::assert_exception(Error::NotOwner, || {
            // If we don't create a new ref, an error occurs:
            // cannot borrow `ownable` as mutable, as it is 
            // a captured variable in a `Fn` closure cannot borrow as mutable
            let mut ownable = OwnableRef::at(ownable.address());
            ownable.change_ownership(new_owner);
        });
    }
}
```

1. Each test case starts with the same initialization process, so for convenience, we defined the `setup()` function we call as the first statement in each test. Take a look at the signature `fn setup() -> (Address, OwnableRef)`. `OwnableRef` is a contract reference generated by Odra. This reference allows us call all the defined entrypoints namely: `ensure_ownership()`, `change_ownership()`, `get_owner()`, but not `init()` which is a constructor.
2. Now, the module needs an owner, the easiest way is to take one from the `test_env`. We choose the address of first account (which is the default one).
3. Odra created for us `OwnableDeployer` struct which implements all constructor functions. In this case there is just one function - `init()` which corresponds the function we have implemented in the module.
4. It is time to define the first test. As you see, it is a regular rust test.
5. Using the `setup()` function we get the owner, and a reference. We make a standard assertion comparing the owner we know, with the value returned from the contract.
:::note
You may have noticed, we use here the term `module` interchangeably with `contract`. The reason is once we deploy our module onto a virtual blockchain it may be considered a contract.
:::
6. On the contract, only the `init()` function has been called, so we expect one event has been emitted. To assert that, let's use Odra's macro `assert_events`. As the first argument, pass the contract you want to read events from, followed by as many events as you expect have occurred.
7. Because we know the initial owner is the 0-th account, we must select a different account. It could be any index from 1 to 19 - the `test env` predefines 20 accounts.
8. As mention in point `2`, the default is the 0-th account, if you want to change the executor call the `test_env::set_caller()` function. 
:::note
The caller switch applies only the next contract interaction, the second call will be done as the default account.
::: 
9. If a non-owner account tries to change ownership we expect it to fail. To capture the error, call `test_env::assert_exception()` with the error you expect and a failing block of code.
:::note
In the test we create a second contract reference `let mut ownable = OwnableRef::at(ownable.address());`. As the name stands, it is just a reference, we interact with the same contract - only the address matters.
:::


## Summary
The `Ownable` module is ready, and we can test it against any defined backend. Theoretically it can be deployed as a standalone contract, but in upcoming tutorials you will see how to use it to compose a more complex contract.

## What's next
In the next tutorial we will implement a ERC20 standard.