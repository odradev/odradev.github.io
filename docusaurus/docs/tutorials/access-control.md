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

### Project Structure

```plaintext
access-control
├── src
│   ├── access
│   │   ├── access_control.rs
│   │   ├── events.rs
│   │   └── errors.rs
│   └── lib.rs
|── build.rs
|── Cargo.toml
└── Odra.toml
```

### Events and Errors

There are three actions that can be performed concerning a `Role`: granting, revoking, and altering the admin role. Let us establish standard Odra events for each of these actions.

```rust title=events.rs showLineNumbers
use odra::casper_event_standard::{self, Event};
use odra::Address;
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
* **L5-L17** - to describe the grant or revoke actions, our events specify the `Role`, and `Address`es indicating who receives or loses access and who provides or withdraws it.
* **L19-L24** - the event describing the admin role change, requires the subject `Role`, the previous and the current admin `Role`.

```rust title=errors.rs
use odra::OdraError;

#[derive(OdraError)]
pub enum Error {
    MissingRole = 20_000,
    RoleRenounceForAnotherAddress = 20_001,
}
```

Errors definition is straightforward - there are only two invalid states: 
1. An action is triggered by an unauthorized actor.
2. The caller is attempting to resign the Role on someone's behalf.  

### Module

Now, we are stepping into the most interesting part: the module definition and implementation.

```rust title=access_control.rs showLineNumbers
use super::events::*;
use super::errors::Error;
use odra::prelude::*;
use odra::{module::Module, Address, Mapping};

pub type Role = [u8; 32];

pub const DEFAULT_ADMIN_ROLE: Role = [0u8; 32];

#[odra::module(events = [RoleAdminChanged, RoleGranted, RoleRevoked])]
pub struct AccessControl {
    roles: Mapping<(Role, Address), bool>,
    role_admin: Mapping<Role, Role>
}

#[odra::module]
impl AccessControl {
    pub fn has_role(&self, role: &Role, address: &Address) -> bool {
        self.roles.get_or_default(&(*role, *address))
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
        self.check_role(&self.get_role_admin(role), &self.env().caller());
        self.unchecked_grant_role(role, address);
    }

    pub fn revoke_role(&mut self, role: &Role, address: &Address) {
        self.check_role(&self.get_role_admin(role), &self.env().caller());
        self.unchecked_revoke_role(role, address);
    }

    pub fn renounce_role(&mut self, role: &Role, address: &Address) {
        if address != &self.env().caller() {
            self.env().revert(Error::RoleRenounceForAnotherAddress);
        }
        self.unchecked_revoke_role(role, address);
    }
}

impl AccessControl {
    pub fn check_role(&self, role: &Role, address: &Address) {
        if !self.has_role(role, address) {
            self.env().revert(Error::MissingRole);
        }
    }

    pub fn set_admin_role(&mut self, role: &Role, admin_role: &Role) {
        let previous_admin_role = self.get_role_admin(role);
        self.role_admin.set(role, *admin_role);
        self.env().emit_event(RoleAdminChanged {
            role: *role,
            previous_admin_role,
            new_admin_role: *admin_role
        });
    }

    pub fn unchecked_grant_role(&mut self, role: &Role, address: &Address) {
        if !self.has_role(role, address) {
            self.roles.set(&(*role, *address), true);
            self.env().emit_event(RoleGranted {
                role: *role,
                address: *address,
                sender: self.env().caller()
            });
        }
    }

    pub fn unchecked_revoke_role(&mut self, role: &Role, address: &Address) {
        if self.has_role(role, address) {
            self.roles.set(&(*role, *address), false);
            self.env().emit_event(RoleRevoked {
                role: *role,
                address: *address,
                sender: self.env().caller()
            });
        }
    }
}
```
* **L6** - Firstly, we need the `Role` type. It is simply an alias for a 32-byte array.
* **L8** - The default role is an array filled with zeros.
* **L10-L13** - The storage consists of two mappings:
1. `roles` - a nested mapping that stores information about whether a certain Role is granted to a given `Address`.
2. `role_admin` - each `Role` can have a single admin `Role`.
* **L18-L20** - This is a simple check to determine if a `Role` has been granted to a given `Address`. It is an exposed entry point and an important building block widely used throughout the entire module.
* **L49** - This is a non-exported block containing helper functions.
* **L50-L54** - The `check_role()` function serves as a guard function. Before a `Role` is granted or revoked, we must ensure that the caller is allowed to do so. For this purpose, the function reads the roles mapping. If the role has not been granted to the address, the contract reverts with `Error::MissingRole`.
* **L56-L64** - The `set_admin_role()` function simply updates the role_admin mapping and emits the `RoleAdminChanged` event.
* **L66-L86** - The `unchecked_grant_role()` and `unchecked_revoke_role()` functions are mirror functions that update the roles mapping and post `RoleGranted` or `RoleRevoked` events. If the role is already granted, `unchecked_grant_role()` has no effect (the opposite check is made in the case of revoking a role).
* **L22-L29** - The `get_role_admin()` entry point reads the role_admin. If there is no admin role for a given role, it returns the default role.
* **L31-L46** - This is a combination of `check_role()` and `unchecked_*_role()`. Entry points fail on unauthorized access.
