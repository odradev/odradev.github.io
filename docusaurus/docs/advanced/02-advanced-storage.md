# Advanced Storage Concepts

The Odra Framework provides advanced storage interaction capabilities that extend beyond the basic storage interaction. This document will focus on the `Mapping` and `Sequence` modules, which are key components of the advanced storage interaction in Odra.

## Recap and Basic Concepts

Before we delve into the advanced features, let's recap some basic storage concepts in Odra. In the realm of basic storage interaction, Odra provides several types for interacting with contract storage, including `Var`, `Mapping`, and `List`. These types enable contracts to store and retrieve data in a structured manner. The Var type is used to store a single value, while the List and Mapping types store collections of values.

**Var**: A Var in Odra is a fundamental building block used for storing single values. Each Var is uniquely identified by its name in the contract.

**Mapping**: Mapping in Odra serves as a key-value storage system. It stores an association of unique keys to values, and the value can be retrieved using the key.

**List**: Built on top of the Var and Mapping building blocks, List in Odra allows storing an ordered collection of values that can be iterated over.
   
If you need a refresher on these topics, please refer to our [guide](../basics/05-storage-interaction.md) on basic storage in Odra.

## Advanced Storage Concepts

### Sequence

The Sequence in Odra is a basic module that holds a `Var` which keeps track of the current value. 

```rust
pub struct Sequence<T>
where
    T: Num + One + OdraType
{
    value: Var<T>
}
```

The Sequence module provides functions `get_current_value` and `next_value` to get the current value and increment the value respectively.

### Advanced Mapping

In Odra, a `Mapping` is a key-value storage system where the key is associated with a value.
In previous examples, the value of the `Mapping` typically comprised a standard serializable type (such as number, string, or bool) or a custom type derived from `odra::OdraType`.

However, there are more advanced scenarios where the value of the Mapping represents a module itself. This approach is beneficial when managing a collection of modules, each maintaining its unique state.

Let's consider the following example:

```rust title="examples/src/features/storage/mapping.rs"
use odra::{map, types::U256, Mapping, UnwrapOrRevert};

use crate::owned_token::OwnedToken;

#[odra::module]
pub struct Mappings {
    strings: Mapping<(String, u32, String), String>,
    tokens: Mapping<String, OwnedToken>
}

#[odra::module]
impl Mappings {

    ...

    pub fn total_supply(&mut self, token_name: String) -> U256 {
        self.tokens.module(&token_name).total_supply()
    }

    pub fn get_string_api(
        &self, 
        key1: String, 
        key2: u32, 
        key3: String
    ) -> String {
        let opt_string = self.strings.get(&(key1, key2, key3));
        opt_string.unwrap_or_revert()
    }
}
```

As you can see, a `Mapping` key can consist of a tuple of values, not limited to a single value.

:::note
Accessing Odra modules differs from accessing regular values such as strings or numbers.

Firstly, within a `Mapping`, you don't encapsulate the module with `Submodule`.

Secondly, rather than utilizing the `Mapping::get()` function, call `Mapping::module()`, which returns `SubModule<T>` and sets the appropriate namespace for nested modules.
:::

## AdvancedStorage Contract

The given code snippet showcases the `AdvancedStorage` contract that incorporates these storage concepts.

```rust
use odra::{Address, casper_types::U512, Sequence, Mapping};
use crate::modules::Token;

#[odra::module]
pub struct AdvancedStorage {
    counter: Sequence<u32>,
    tokens: Mapping<(String, String), Token>>,
}

impl AdvancedStorage {
    pub fn current_value(&self) -> u32 {
        self.counter.get_current_value()
    }

    pub fn increment_and_get(&mut self) -> u32 {
        self.counter.next_value()
    }

    pub fn balance_of(&mut self, token_name: String, creator: String, address: Address) -> U512 {
        let token = self.tokens.module(&(token_name, creator));
        token.balance_of(&address)
    }

    pub fn mint(&self, outer_token_namekey: String, creator: String, amount: U512, to: Address) {
        let mut token = self.tokens.module(&(token_name, creator));
        token.mint(amount, to);
    }
}
```

## Conclusion

Advanced storage features in Odra offer robust options for managing contract state. Two key takeaways from this document are:
1. Odra offers a Sequence module, enabling contracts to store and increment a single value.
2. Mappings support composite keys expressed as tuples and can store modules as values.

Understanding these concepts can help developers design and implement more efficient and flexible smart contracts.
