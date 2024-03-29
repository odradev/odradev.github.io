---
sidebar_position: 4
---

# Access Control

In a previous tutorial, we introduced the [`Ownable`](./ownable.md) module, which serves the purpose of securing access to specific contract features. While it establishes a fundamental security layer, there are numerous scenarios where this level of security is insufficient, 

In this article we design and implement a more fine-grained access control layer.

## Code

Before we start writing code, we list the functionalities of our access control layer.

1. A `Role` type is used across the module.
2. A `Role` can be assigned to many `Address`es.
3. Each `Role` may have a corresponding admin role.
4. Only an admin can grant/revoke a `Role`.
5. A `Role` can be renounced.
6. A `Role` cannot be renounced on someone's behalf.
7. Each action triggers an event.
8. Unauthorized access stops contract execution.

### Events and Errors

There are three actions that can be performed concerning a `Role`: granting, revoking, and altering the admin role. Let us establish standard Odra events for each of these actions.

```rust title=events.rs showLineNumbers
use odra::{types::Address, Event};
use super::access_control::Role;

#[derive(Event, PartialEq, Eq, Debug)]
pub struct RoleGranted {
    pub role: Role,
    pub address: Address,
    pub sender: Address
}

#[derive(Event, PartialEq, Eq, Debug)]
pub struct RoleRevoked {
    pub role: Role,
    pub address: Address,
    pub sender: Address
}

#[derive(Event, PartialEq, Eq, Debug)]
pub struct RoleAdminChanged {
    pub role: Role,
    pub previous_admin_role: Role,
    pub new_admin_role: Role
}
```
* **L4-L16** - to describe the grant or revoke actions, our events specify the `Role`, and `Address`es indicating who receives or loses access and who provides or withdraws it.
* **L18-L21** - the event describing the admin role change, requires the subject `Role`, the previous and the current admin `Role`.

```rust title=errors.rs
use odra::execution_error;

execution_error! {
    pub enum Error {
        MissingRole => 20_000,
        RoleRenounceForAnotherAddress => 20_001,
    }
}
```

Errors definition is straightforward - there are only two invalid states: 
1. An action is triggered by an unauthorized actor.
2. The caller is attempting to resign the Role on someone's behalf.  

### Module

Now, we are stepping into the most interesting part: the module definition and implementation.

```rust title=access_control.rs showLineNumbers
use super::{
    errors::Error,
    events::{RoleAdminChanged, RoleGranted, RoleRevoked}
};
use odra::{
    contract_env,
    types::{event::OdraEvent, Address},
    Mapping
};

pub type Role = [u8; 32];

pub const DEFAULT_ADMIN_ROLE: Role = [0u8; 32];

#[odra::module(events = [RoleAdminChanged, RoleGranted, RoleRevoked])]
pub struct AccessControl {
    roles: Mapping<Role, Mapping<Address, bool>>,
    role_admin: Mapping<Role, Role>
}

#[odra::module]
impl AccessControl {
    pub fn has_role(&self, role: &Role, address: &Address) -> bool {
        self.roles.get_instance(role).get_or_default(address)
    }

    pub fn get_role_admin(&self, role: &Role) -> Role {
        let admin_role = self.role_admin.get(role);
        if let Some(admin) = admin_role {
            admin
        } else {
            DEFAULT_ADMIN_ROLE
        }
    }

    pub fn grant_role(&mut self, role: &Role, address: &Address) {
        self.check_role(&self.get_role_admin(role), &contract_env::caller());
        self.unchecked_grant_role(role, address);
    }

    pub fn revoke_role(&mut self, role: &Role, address: &Address) {
        self.check_role(&self.get_role_admin(role), &contract_env::caller());
        self.unchecked_revoke_role(role, address);
    }

    pub fn renounce_role(&mut self, role: &Role, address: &Address) {
        if address != &contract_env::caller() {
            contract_env::revert(Error::RoleRenounceForAnotherAddress);
        }
        self.unchecked_revoke_role(role, address);
    }
}

impl AccessControl {
    pub fn check_role(&self, role: &Role, address: &Address) {
        if !self.has_role(role, address) {
            contract_env::revert(Error::MissingRole);
        }
    }

    pub fn set_admin_role(&mut self, role: &Role, admin_role: &Role) {
        let previous_admin_role = self.get_role_admin(role);
        self.role_admin.set(role, *admin_role);
        RoleAdminChanged {
            role: *role,
            previous_admin_role,
            new_admin_role: *admin_role
        }
        .emit();
    }

    pub fn unchecked_grant_role(&mut self, role: &Role, address: &Address) {
        if !self.has_role(role, address) {
            self.roles.get_instance(role).set(address, true);
            RoleGranted {
                role: *role,
                address: *address,
                sender: contract_env::caller()
            }
            .emit();
        }
    }

    pub fn unchecked_revoke_role(&mut self, role: &Role, address: &Address) {
        if self.has_role(role, address) {
            self.roles.get_instance(role).set(address, false);
            RoleRevoked {
                role: *role,
                address: *address,
                sender: contract_env::caller()
            }
            .emit();
        }
    }
}
```
* **L11** - Firstly, we need the `Role` type. It is simply an alias for a 32-byte array.
* **L13** - The default role is an array filled with zeros.
* **L15-L19** - The storage consists of two mappings:
1. roles - a nested mapping that stores information about whether a certain Role is granted to a given `Address`.
2. role_admin - each `Role` can have a single admin `Role`.
* **L23-L25** - This is a simple check to determine if a `Role` has been granted to a given `Address`. It is an exposed entry point and an important building block widely used throughout the entire module.
* **L54** - This is a non-exported block containing helper functions.
* **L55-L59** - The `check_role()` function serves as a guard function. Before a `Role` is granted or revoked, we must ensure that the caller is allowed to do so. For this purpose, the function reads the roles mapping. If the role has not been granted to the address, the contract reverts with `Error::MissingRole`.
* **L61-L70** - The `set_admin_role()` function simply updates the role_admin mapping and emits the `RoleAdminChanged` event.
* **L72-L94** - The `unchecked_grant_role()` and `unchecked_revoke_role()` functions are mirror functions that update the roles mapping and post `RoleGranted` or `RoleRevoked` events. If the role is already granted, `unchecked_grant_role()` has no effect (the opposite check is made in the case of revoking a role).
* **L27-L34** - The `get_role_admin()` entry point reads the role_admin. If there is no admin role for a given role, it returns the default role.
* **L36-L51** - This is a combination of `check_role()` and `unchecked_*_role()`. Entry points fail on unauthorized access.
