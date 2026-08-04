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
│   ├── access.rs
│   └── lib.rs
|── build.rs
|── Cargo.toml
└── Odra.toml
```

### Events and Errors

There are three actions that can be performed concerning a `Role`: granting, revoking, and altering the admin role. Let us establish standard Odra events for each of these actions.

```rust title=events.rs showLineNumbers
use odra::prelude::*;
use super::access_control::Role;

#[odra::event]
pub struct RoleGranted {
    pub role: Role,
    pub address: Address,
    pub sender: Address
}

#[odra::event]
pub struct RoleRevoked {
    pub role: Role,
    pub address: Address,
    pub sender: Address
}

#[odra::event]
pub struct RoleAdminChanged {
    pub role: Role,
    pub previous_admin_role: Role,
    pub new_admin_role: Role
}
```
* **L4-L16** - to describe the grant or revoke actions, our events specify the `Role`, and `Address`es indicating who receives or loses access and who provides or withdraws it.
* **L18-L23** - the event describing the admin role change, requires the subject `Role`, the previous and the current admin `Role`.

`src/access.rs` ties the three files together, and `src/lib.rs` has to declare the `access` module:

```rust title=access.rs
pub mod access_control;
pub mod errors;
pub mod events;
```

```rust title=lib.rs
pub mod access;
```

```rust title=errors.rs
use odra::prelude::*;

#[odra::odra_error]
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

pub type Role = [u8; 32];

pub const DEFAULT_ADMIN_ROLE: Role = [0u8; 32];

#[odra::module(events = [RoleAdminChanged, RoleGranted, RoleRevoked], errors = Error)]
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
* **L5** - Firstly, we need the `Role` type. It is simply an alias for a 32-byte array.
* **L7** - The default role is an array filled with zeros.
* **L10-L13** - The storage consists of two mappings:
1. `roles` - a nested mapping that stores information about whether a certain Role is granted to a given `Address`.
2. `role_admin` - each `Role` can have a single admin `Role`.
* **L17-L19** - This is a simple check to determine if a `Role` has been granted to a given `Address`. It is an exposed entry point and an important building block widely used throughout the entire module.
* **L48** - This is a non-exported block containing helper functions.
* **L49-L53** - The `check_role()` function serves as a guard function. Before a `Role` is granted or revoked, we must ensure that the caller is allowed to do so. For this purpose, the function reads the roles mapping. If the role has not been granted to the address, the contract reverts with `Error::MissingRole`.
* **L55-L63** - The `set_admin_role()` function simply updates the role_admin mapping and emits the `RoleAdminChanged` event.
* **L65-L85** - The `unchecked_grant_role()` and `unchecked_revoke_role()` functions are mirror functions that update the roles mapping and post `RoleGranted` or `RoleRevoked` events. If the role is already granted, `unchecked_grant_role()` has no effect (the opposite check is made in the case of revoking a role).
* **L21-L28** - The `get_role_admin()` entry point reads the role_admin. If there is no admin role for a given role, it returns the default role.
* **L30-L45** - This is a combination of `check_role()` and `unchecked_*_role()`. Entry points fail on unauthorized access.

## Usage

`AccessControl` is a building block, not a contract to deploy on its own. Note that nothing in the module
ever grants the first role: `grant_role()` calls `check_role()` against the role's admin, `get_role_admin()`
falls back to `DEFAULT_ADMIN_ROLE`, and nobody - not even the deployer - holds it. Deployed standalone, the
module is permanently locked out of its own admin-gated entry points.

The contract embedding `AccessControl` has to bootstrap it, by calling the non-exported
`unchecked_grant_role()` helper from its own constructor:

Save this as `src/gated_token.rs` and declare it in `src/lib.rs` with `pub mod gated_token;` -
an undeclared module is simply not compiled, and `cargo odra test` will happily report success
without ever running its tests.

```rust title=gated_token.rs
use odra::prelude::*;
use crate::access::access_control::{AccessControl, Role, DEFAULT_ADMIN_ROLE};

pub const MINTER_ROLE: Role = [1u8; 32];

#[odra::module]
pub struct GatedToken {
    access: SubModule<AccessControl>,
    minted: Var<u32>,
}

#[odra::module]
impl GatedToken {
    pub fn init(&mut self) {
        let deployer = self.env().caller();
        self.access
            .unchecked_grant_role(&DEFAULT_ADMIN_ROLE, &deployer);
        self.access.set_admin_role(&MINTER_ROLE, &DEFAULT_ADMIN_ROLE);
    }

    pub fn grant_minter(&mut self, address: &Address) {
        self.access.grant_role(&MINTER_ROLE, address);
    }

    pub fn mint(&mut self) {
        self.access.check_role(&MINTER_ROLE, &self.env().caller());
        self.minted.add(1);
    }

    pub fn minted(&self) -> u32 {
        self.minted.get_or_default()
    }

    pub fn has_admin(&self, address: &Address) -> bool {
        self.access.has_role(&DEFAULT_ADMIN_ROLE, address)
    }
}
```

The deployer becomes the admin, and only the admin can hand out `MINTER_ROLE`.

## Test

```rust title=gated_token.rs
#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::{Deployer, NoArgs};

    #[test]
    fn admin_can_delegate_minting() {
        let env = odra_test::env();
        let mut token = GatedToken::deploy(&env, NoArgs);
        let admin = env.get_account(0);
        let minter = env.get_account(1);

        assert!(token.has_admin(&admin));

        // The minter cannot mint yet.
        env.set_caller(minter);
        assert!(token.try_mint().is_err());

        // The admin grants the role.
        env.set_caller(admin);
        token.grant_minter(&minter);

        env.set_caller(minter);
        token.mint();
        assert_eq!(token.minted(), 1);
    }
}
```
