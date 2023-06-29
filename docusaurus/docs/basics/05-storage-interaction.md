---
sidebar_position: 5
description: How to write data into blockchain's storage
---

# Storage interaction
The Odra framework implements multiple types of data that can be stored on the blockchain. Let's go
through all of them and explain their pros and cons.

## Variable
The Variable is the simplest storage type available in the Odra framework. It serializes the data and stores it under a single key in the blockchain storage. To use it, just wrap your
variable in the `Variable` type. Let's look at a "real world" example of a contract that represents a dog:

```rust title="examples/src/features/storage/variable.rs"
#[odra::module]
pub struct DogContract {
    barks: Variable<bool>,
    weight: Variable<u32>,
    name: Variable<String>,
    walks: Variable<Vec<u32>>,
}
```

You can see the `Variable` wrapping the data. Even complex types like `Vec` can be wrapped (with some caveats)!

Let's make this contract usable, by providing a constructor and some getter functions:

```rust title="examples/src/features/storage/variable.rs"
use odra::Variable;

#[odra::module]
impl DogContract {
    #[odra(init)]
    pub fn init(&mut self, barks: bool, weight: u32, name: String) {
        self.barks.set(barks);
        self.weight.set(weight);
        self.name.set(name);
        self.walks.set(Vec::<u32>::default());
    }

    pub fn barks(&self) -> bool {
        self.barks.get_or_default()
    }

    pub fn weight(&self) -> u32 {
        self.weight.get_or_default()
    }

    pub fn name(&self) -> String {
        self.name.get_or_default()
    }

    pub fn walks_amount(&self) -> u32 {
        let walks = self.walks.get_or_default();
        walks.len() as u32
    }

    pub fn walks_total_length(&self) -> u32 {
        let walks = self.walks.get_or_default();
        walks.iter().sum()
    }
}
```

As you can see, you can access the data, by using `get_or_default` function:

```rust title="examples/src/features/storage/variable.rs"
...
self.barks.get_or_default()
...
```

:::note
Keep in mind that using `get()` will result in an Option that you'll need to unwrap - the variable
doesn't have to be initialized!
:::

To modify the data, use the `set()` function:

```rust title="examples/src/features/storage/variable.rs"
self.barks.set(barks);
```

A Variable is easy to use and efficient for simple data types. One of its downsides is that it
serializes the data as a whole, so when you're using complex types like `Vec` or `HashMap`,
each time you `get` or `set` the whole data is read and written to the blockchain storage.

In the example above, if we want to see how many walks our dog had, we would use the function:
```rust title="examples/src/features/storage/variable.rs"
pub fn walks_amount(&self) -> usize {
    let walks = self.walks.get_or_default();
    walks.len()
}
```
But to do so, we need to extract the whole serialized vector from the storage, which would inefficient,
especially for larger sets of data.

To tackle this issue following two types were created.

## Mapping

The Mapping is used to store and access data as key-value pairs. To define a Mapping, you need to
pass two values - the key type and the value type. Let's look at the variation of the Dog contract, that
uses Mapping to store information about our dog's friends and how many times they visited:

```rust title="examples/src/features/storage/mapping.rs"
use odra::{Mapping, Variable};

#[odra::module]
pub struct DogContract2 {
    name: Variable<String>,
    friends: Mapping<String, u32>,
}
```

In the example above, our key is a String (it is a name of the friend) and we are storing u32 values
(amount of visits). To read and write values from and into a Mapping we use a similar approach
to the one shown in the Variables section with one difference - we need to pass a key:

```rust title="examples/src/features/storage/mapping.rs"
pub fn visit(&mut self, friend_name: String) {
    let visits = self.visits(friend_name.clone());
    self.friends.set(&friend_name, visits + 1);
}

pub fn visits(&self, friend_name: String) -> u32 {
    self.friends.get_or_default(&friend_name)
}
```

The biggest improvement over a `Variable` is that we can model functionality of a `HashMap` using `Mapping`.
The amount of data written to and read from the storage is minimal. However, we cannot iterate over `Mapping`.
We could implement such behavior by using a numeric type key and saving the length of the set in a
separate variable. Thankfully Odra comes with a prepared solution - the `List` type.

:::note
If you take a look into List implementation in Odra, you'll see that in fact it is just a Mapping with
a Variable working together:

```rust title="core/src/list.rs"
use odra::{Variable, List};

pub struct List<T> {
    values: Mapping<u32, T>,
    index: Variable<u32>
}
```
:::

## List
Going back to our DogContract example - let's revisit the walk case. This time, instead of `Vec`,
we'll use the list:

```rust title="examples/src/features/storage/list.rs"
#[odra::module]
pub struct DogContract3 {
    name: Variable<String>,
    walks: List<u32>,
}
```

As you can see, the notation is very similar to the `Vec`. To understand the usage, take a look
at the reimplementation of the functions with an additional function that takes our dog for a walk
(it writes the data to the storage):

```rust title="examples/src/features/storage/list.rs"
#[odra::module]
impl DogContract3 {
    #[odra(init)]
    pub fn init(&mut self, name: String) {
        self.name.set(name);
    }

    pub fn name(&self) -> String {
        self.name.get_or_default()
    }

    pub fn walks_amount(&self) -> u32 {
        self.walks.len()
    }

    pub fn walks_total_length(&self) -> u32 {
        self.walks.iter().sum()
    }

    pub fn walk_the_dog(&mut self, length: u32) {
        self.walks.push(length);
    }
}
```

Now, we can know how many walks our dog had without loading the whole vector from the storage.
We need to do this to sum the length of all the walks, but the Odra framework cannot (yet) handle all
the cases for you.

:::info
All of the above examples, alongside the tests, are available in the odra repository in the `examples/src/docs/` folder.
:::

## Custom Types

By default you can store only built-in types like numbers, Options, Results, Strings, Vectors.

Implementing custom types is straightforward, your type must derive from `OdraType`: 

```rust
use odra::{Address, OdraType};

#[derive(OdraType)]
pub struct Dog {
    pub name: String,
    pub age: u8,
    pub owner: Option<Address>
}
```

:::note
Each field of your struct must be an OdraType.
:::

## What's next
In the next article, we'll see how to query the host for information about the world and our contract.
