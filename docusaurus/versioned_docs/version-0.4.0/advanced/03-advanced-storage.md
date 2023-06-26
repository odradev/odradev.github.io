# Advanced Storage Concepts

The Odra Framework provides advanced storage interaction capabilities that extend beyond the basic storage interaction. This document will focus on the `Mapping` and `Sequence` modules, which are key components of the advanced storage interaction in Odra.

## Recap and Basic Concepts

Before we delve into the advanced features, let's recap some basic storage concepts in Odra. In the realm of basic storage interaction, Odra provides several types for interacting with contract storage, including `Variable`, `Mapping`, and `List`. These types enable contracts to store and retrieve data in a structured manner. The Variable type is used to store a single value, while the List and Mapping types store collections of values.

**Variable**: A Variable in Odra is a fundamental building block used for storing single values. Each Variable is uniquely identified by its name in the contract.

**Mapping**: Mapping in Odra serves as a key-value storage system. It stores an association of unique keys to values, and the value can be retrieved using the key.

**List**: Built on top of the Variable and Mapping building blocks, List in Odra allows storing an ordered collection of values that can be iterated over.
   
If you need a refresher on these topics, please refer to our [guide](../basics/05-storage-interaction.md) on basic storage in Odra.

## Advanced Storage Concepts

### Sequence

The Sequence in Odra is a basic module that holds a `Variable` which keeps track of the current value. 

```rust
pub struct Sequence<T>
where
    T: Num + One + OdraType
{
    value: Variable<T>
}
```

The Sequence module provides functions `get_current_value` and `next_value` to get the current value and increment the value respectively.

### Advanced Mapping

In Odra, the Mapping is a key-value storage system where the key is associated with a value. However, the value of the Mapping can be another Mapping. This concept is referred to as nested mapping. Moreover, the value of the Mapping can be an Odra module, introducing a greater level of complexity and utility.

Let's consider the following example:

```rust title="examples/mapping.rs"
use odra::{map, types::U256, Mapping, UnwrapOrRevert};

use crate::owned_token::OwnedToken;

#[odra::module]
pub struct NestedMapping {
    strings: Mapping<String, Mapping<u32, Mapping<String, String>>>,
    tokens: Mapping<String, Mapping<u32, Mapping<String, OwnedToken>>>
}

#[odra::module]
impl NestedMapping {

    ...

    pub fn set_token(
        &mut self,
        key1: String,
        key2: u32,
        key3: String,
        token_name: String,
        decimals: u8,
        symbol: String,
        initial_supply: &U256
    ) {
        self.tokens
            .get_instance(&key1)
            .get_instance(&key2)
            .get_instance(&key3)
            .init(token_name, symbol, decimals, initial_supply);
    }

    pub fn get_string_api(
        &self, 
        key1: String, 
        key2: u32, 
        key3: String
    ) -> String {
        let mapping = self.strings.get_instance(&key1).get_instance(&key2);
        mapping.get(&key3).unwrap_or_revert()
    }

    pub fn total_supply(
        &self, 
        key1: String, 
        key2: u32, 
        key3: String
    ) -> U256 {
        self.tokens
            .get_instance(&key1)
            .get_instance(&key2)
            .get_instance(&key3)
            .total_supply()
    }
}
```
:::note
Accessing Odra Modules and Mapping is a bit different from accessing regular values like strings or numbers. 

Instead of using the `get()` function, call `get_instance()`, which sets the correct namespace for nested modules.
:::

If the terminal value is deeply nested, a long chain of `get_instance()` calls is required.

To keep the codebase consistent, a `map!` macro can be used:

```rust title="examples/mapping.rs"
...

pub fn set_string(&mut self, key1: String, key2: u32, key3: String, value: String) {
    map!(self.strings[key1][key2][key3] = value);
}

pub fn get_string_macro(
    &self, 
    key1: String, 
    key2: u32, 
    key3: String
) -> String {
    map!(self.strings[key1][key2][key3])
}

```

:::warning
The terminal value must not be an Odra Module.
:::


## AdvancedStorage Contract

The given code snippet showcases the `AdvancedStorage` contract that incorporates these storage concepts.

```rust
use odra::{Sequence, Mapping};
use crate::modules::Token;

#[odra::module]
pub struct AdvancedStorage {
    my_sequence: Sequence<u32>,
    my_mapping: Mapping<String, Mapping<String, Token>>,
}

impl AdvancedStorage {
    pub fn get_sequence_current_value(&self) -> u32 {
        self.my_sequence.get_current_value()
    }

    pub fn next_sequence_value(&mut self) -> u32 {
        self.my_sequence.next_value()
    }

    pub fn set_in_mapping(&mut self, outer_key: String, inner_key: String, value: Token) {
        let inner_mapping = self.my_mapping.get_instance(&outer_key);
        inner_mapping.set(&inner_key, value);
    }

    pub fn get_from_mapping(&self, outer_key: String, inner_key: String) -> Option<Token> {
        let inner_mapping = self.my_mapping.get_instance(&outer_key);
        inner_mapping.get(&inner_key)
    }
}
```

## Conclusion

Advanced storage features in Odra offer robust options for managing contract state. Understanding these concepts can help developers design and implement more efficient and flexible smart contracts.