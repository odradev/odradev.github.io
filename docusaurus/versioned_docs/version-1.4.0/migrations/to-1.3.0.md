---
sidebar_position: 3
description: Migration guide to v1.3.0
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Migration guide to v1.3.0

Odra v1.3.0 introduces several breaking changes that require users to update their smart contracts and tests. This migration guide provides a detailed overview of the changes, along with step-by-step instructions for migrating existing code to the new version.

This guide is intended for developers who have built smart contracts using previous versions of Odra and need to update their code to be compatible with v0.8.0. It assumes a basic understanding of smart contract development and the Odra framework. If you're new to Odra, we recommend to start your journey with the [Getting Started](../category/getting-started/).

Odra v1.3.0 introduced a new OdraContract trait, which groups all module-related structs.
From the user perspective, the only change is that the `deploy` and `load` methods
are now implemented in the module itself, not in the autogenerated
`{{ModuleName}}HostRef` struct.

## Migrating to Odra v1.3.0

To migrate your smart contracts to Odra v1.3.0, remove the use the `deploy` method from
the module instead of the `{{ModuleName}}HostRef` struct:

```rust title=before.rs
    let token = TokenHostRef::deploy(env, init_args);
    let another_token = AnotherTokenHostRef::load(env, address);
```

```rust title=after.rs
    let token = Token::deploy(env, init_args);
    let another_token = AnotherToken::load(env, address);
```

