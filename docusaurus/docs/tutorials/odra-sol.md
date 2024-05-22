---
sidebar_position: 9
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Odra for Solidity developers

## Introduction

Hi a stranger Solidity developer! If you are looking to expand your horizons into Rust-based smart contract development, you've come to the right place. Odra is a high-level framework designed to simplify the development of smart contracts for Casper Network. This tutorial will guide you through the basics of transitioning from Solidity to Odra, highlighting key differences and providing practical examples. Before we delve into details. we have a first great info for you. From the very beginning we have thinking of you. Our main assumption was to design the framework that way to flatten the learning curve especially for Solidity developers.

## Prerequisites
To follow this guide, you should have:

Basic knowledge of Solidity
Familiarity with Ethereum and smart contract concepts
A development environment set up for Solidity (e.g., Remix, Truffle, Hardhat)
Basic understanding of Rust, as Odra is based on it

## Hello World

Let's start with a simple "Hello World" contract in Odra. The following code snippet demonstrates a basic smart contract that stores a greeting message.

<Tabs>
<TabItem value="rust" label="Odra">

```rust showLineNumbers
use odra::{prelude::*, Var};

#[odra::module]
pub struct HelloWorld {
    greet: Var<String>,
}

#[odra::module]
impl HelloWorld {
    pub fn init(&mut self, message: String) {
        self.greet.set(message);
    }

    pub fn get(&self) -> String {
        self.greet.get_or_default()
    }
}
```
</TabItem>

<TabItem value="sol" label="Solidity">

```sol showLineNumbers
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract HelloWorld {
    string public greet = "Hello World!";
}
```
</TabItem>
</Tabs>

As you may noticed the Odra code is slightly more verbose than the Solidity code. To define a contract in Odra, you need to create a struct and implement a module for it, both are annotated with the `odra::module` attribute. The struct contains the contract's state variables, while the module defines the contract's functions. In this example, the HelloWorld struct has a single state variable greet, which stores the greeting message. The module contains two functions: init to set the greeting message and get to retrieve it.
Two key differences are:
1. Odra does not generate getters for public state variables automatically, so you need to define them explicitly. 
2. To init values you have do it in the `init` function which is the contract constructor - you can't assign the default outside the constructor.


## Variable Storage and State Management

### Data Types

<Tabs>
<TabItem value="rust" label="Odra">

```rust showLineNumbers
use core::str::FromStr;
use odra::{
    casper_types::{bytesrepr::Bytes, U256},
    module::Module,
    prelude::*,
    Address, UnwrapOrRevert, Var,
};

#[odra::module]
pub struct Primitives {
    boo: Var<bool>,
    u: Var<u8>,    // u8 is the smallest unsigned integer type
    u2: Var<U256>, // U256 is the biggest unsigned integer type
    i: Var<i32>,   // i32 is the smallest signed integer type
    i2: Var<i64>,  // i64 is the biggest signed integer type
    address: Var<Address>,
    bytes: Var<Bytes>,
    default_boo: Var<bool>,
    default_uint: Var<U256>,
    default_int: Var<i64>,
    default_addr: Var<Address>,
}

#[odra::module]
impl Primitives {
    pub fn init(&mut self) {
        self.boo.set(true);
        self.u.set(1);
        self.u2.set(U256::from(456));
        self.i.set(-1);
        self.i2.set(456);
        self.address.set(
            Address::from_str(
                "hash-d4b8fa492d55ac7a515c0c6043d72ba43c49cd120e7ba7eec8c0a330dedab3fb",
            )
            .unwrap_or_revert(&self.env()),
        );
        self.bytes.set(Bytes::from(vec![0xb5]));

        let _min_int = U256::zero();
        let _max_int = U256::MAX;
    }

    // For the types that have default values, we can use the get_or_default method
    pub fn get_default_boo(&self) -> bool {
        self.default_boo.get_or_default()
    }

    pub fn get_default_uint(&self) -> U256 {
        self.default_uint.get_or_default()
    }

    pub fn get_default_int(&self) -> i64 {
        self.default_int.get_or_default()
    }

    // Does not compile - Address does not have the default value
    pub fn get_default_addr(&self) -> Address {
        self.default_addr.get_or_default()
    }
}
```
</TabItem>

<TabItem value="sol" label="Solidity">

```sol showLineNumbers title="https://solidity-by-example.org/primitives/"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Primitives {
    bool public boo = true;

    uint8 public u8 = 1;
    uint256 public u256 = 456;

    int8 public i8 = -1;
    int256 public i256 = 456;

    int256 public minInt = type(int256).min;
    int256 public maxInt = type(int256).max;

    address public addr = 0xCA35b7d915458EF540aDe6068dFe2F44E8fa733c;
    bytes1 a = 0xb5; //  [10110101]

    // Default values
    // Unassigned variables have a default value
    bool public defaultBoo; // false
    uint256 public defaultUint; // 0
    int256 public defaultInt; // 0
    address public defaultAddr; // 0x0000000000000000000000000000000000000000
}
```
</TabItem>
</Tabs>

The range of integer types in Odra is slightly different from Solidity. Odra provides a wide range of integer types: `u8`, `u16`, `u32`, `u64`, `U128`, `U256` for unsigned integers, `i32` and `i64` signed integers. 

The `Address` type in Odra is used to represent account and contract addresses. In Odra there is no default/zero value for the `Address` type, the workaround is to use `Option<Address>`. 

The `Bytes` type is used to store byte arrays.

Values are stored in units called `Named Keys` and `Dictionaries`. Additionally, local variables are available within the entry points and can be used to perform necessary actions or computations within the scope of each entry point.

### Constants and Immutability

<Tabs>
<TabItem value="rust" label="Odra">

```rust showLineNumbers
use odra::{casper_types::{account::AccountHash, U256}, Address};

#[odra::module]
pub struct Constants;

#[odra::module]
impl Constants {
    pub const MY_UINT: U256 = U256([123, 0, 0, 0]);
    pub const MY_ADDRESS: Address = Address::Account(
        AccountHash([0u8; 32])
    );
}

```
</TabItem>

<TabItem value="sol" label="Solidity">

```sol showLineNumbers title="https://solidity-by-example.org/constants/"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Constants {
    // coding convention to uppercase constant variables
    address public constant MY_ADDRESS =
        0x777788889999AaAAbBbbCcccddDdeeeEfFFfCcCc;
    uint256 public constant MY_UINT = 123;
}
```
</TabItem>
</Tabs>

In Odra, you can define constants using the `const` keyword. Constants are immutable and can be of any type, including custom types. In addition to constants, Solidity also supports the `immutable` keyword, which is used to set the value of a variable once, in the constructor. Further attempts to alter this value results in a compile error. Rust does not have an equivalent to Solidity's `immutable` keyword.

### Variables

<Tabs>
<TabItem value="rust" label="Odra">

```rust showLineNumbers
use odra::{casper_types::U256, prelude::*, Var};

#[odra::module]
pub struct Variables {
    text: Var<String>,
    my_uint: Var<U256>,
}

#[odra::module]
impl Variables {
    pub fn init(&mut self) {
        self.text.set("Hello".to_string());
        self.my_uint.set(U256::from(123));
    }

    pub fn do_something(&self) {
        // Local variables
        let i = 456;
        // Env variables
        let timestamp = self.env().get_block_time();
        let sender = self.env().caller();
    }
}
```
</TabItem>

<TabItem value="sol" label="Solidity">

```sol showLineNumbers title="https://solidity-by-example.org/variables/"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Variables {
    // State variables are stored on the blockchain.
    string public text = "Hello";
    uint256 public num = 123;

    function doSomething() public {
        // Local variables are not saved to the blockchain.
        uint256 i = 456;

        // Here are some global variables
        uint256 timestamp = block.timestamp; // Current block timestamp
        address sender = msg.sender; // address of the caller
    }
}
```
</TabItem>
</Tabs>

In Solidity there are three types of variables: state variables, local variables, and global variables. State variables are stored on the blockchain and are accessible by all functions within the contract. Local variables are not stored on the blockchain and are only available within the function in which they are declared. Global variables provide information about the blockchain. Odra uses very similar concepts, but with some differences. In Odra, state variables are a part of a module definition, and local variables are available within the entry points and can be used to perform necessary actions or computations within the scope of each entry point. Global variables are accessed using an instance of `ContractEnv` retrieved using the `env()` function.

### Arrays and Mappings

<Tabs>
<TabItem value="rust" label="Odra">

```rust showLineNumbers
use odra::{casper_types::U256, Address, Mapping};

#[odra::module]
pub struct MappingContract {
    my_map: Mapping<Address, Option<U256>>   
}

#[odra::module]
impl MappingContract {
    pub fn get(&self, addr: Address) -> U256 {
        // self.my_map.get(&addr) would return Option<Option<U256>>
        // so we use get_or_default instead and unwrap the inner Option
        self.my_map.get_or_default(&addr).unwrap_or_default()
    }

    pub fn set(&mut self, addr: Address, i: U256) {
        self.my_map.set(&addr, Some(i));
    }

    pub fn remove(&mut self, addr: Address) {
        self.my_map.set(&addr, None);
    }
}

#[odra::module]
pub struct NestedMapping {
    my_map: Mapping<(Address, U256), Option<bool>>   
}

#[odra::module]
impl NestedMapping {
    pub fn get(&self, addr: Address, i: U256) -> bool {
        self.my_map.get_or_default(&(addr, i)).unwrap_or_default()
    }

    pub fn set(&mut self, addr: Address, i: U256, boo: bool) {
        self.my_map.set(&(addr, i), Some(boo));
    }

    pub fn remove(&mut self, addr: Address, i: U256) {
        self.my_map.set(&(addr, i), None);
    }
}
```
</TabItem>

<TabItem value="sol" label="Solidity">

```sol showLineNumbers
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Mapping {
    mapping(address => uint256) public myMap;

    function get(address _addr) public view returns (uint256) {
        return myMap[_addr];
    }

    function set(address _addr, uint256 _i) public {
        myMap[_addr] = _i;
    }

    function remove(address _addr) public {
        delete myMap[_addr];
    }
}

contract NestedMapping {
    mapping(address => mapping(uint256 => bool)) public nested;

    function get(address _addr1, uint256 _i) public view returns (bool) {
        return nested[_addr1][_i];
    }

    function set(address _addr1, uint256 _i, bool _boo) public {
        nested[_addr1][_i] = _boo;
    }

    function remove(address _addr1, uint256 _i) public {
        delete nested[_addr1][_i];
    }
}
```
</TabItem>
</Tabs>


<Tabs>
<TabItem value="rust" label="Odra">

```rust showLineNumbers
use odra::{prelude::*, Var};

#[odra::module]
pub struct Array {
    // the size of the array must be known at compile time
    arr: Var<[u8; 10]>,
    vec: Var<Vec<u32>>,
}

#[odra::module]
impl Array {
    pub fn init(&mut self) {
        self.arr.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        self.vec.set(vec![1, 2, 3, 4, 5]);
    }

    pub fn get_arr(&self) -> [u8; 10] {
        self.arr.get_or_default()
    }

    pub fn push_vec(&mut self, value: u32) {
        let mut vec = self.vec.get_or_default();
        vec.push(value);
        self.vec.set(vec);
    }

    pub fn pop_vec(&mut self) {
        let mut vec = self.vec.get_or_default();
        vec.pop();
        self.vec.set(vec);
    }

    pub fn update_arr(&mut self, index: u8, value: u8) {
        let mut arr = self.arr.get_or_default();
        arr[index as usize] = value;
        self.arr.set(arr);
    }
}
```
</TabItem>

<TabItem value="sol" label="Solidity">

```sol showLineNumbers
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Array {
    // Several ways to initialize an array
    uint256[] public arr;
    uint256[] public arr2 = [1, 2, 3];
    // Fixed sized array, all elements initialize to 0
    uint256[10] public myFixedSizeArr;

    function get(uint256 i) public view returns (uint256) {
        return arr[i];
    }

    // Solidity can return the entire array.
    // But this function should be avoided for
    // arrays that can grow indefinitely in length.
    function getArr() public view returns (uint256[] memory) {
        return arr;
    }

    function push(uint256 i) public {
        // Append to array
        // This will increase the array length by 1.
        arr.push(i);
    }

    function pop() public {
        // Remove last element from array
        // This will decrease the array length by 1
        arr.pop();
    }

    function getLength() public view returns (uint256) {
        return arr.length;
    }

    function remove(uint256 index) public {
        // Delete does not change the array length.
        // It resets the value at index to it's default value,
        // in this case 0
        delete arr[index];
    }

    function examples() external {
        // create array in memory, only fixed size can be created
        uint256[] memory a = new uint256[](5);
    }
}
```
</TabItem>
</Tabs>

For storing a collection of data as a single unit, Odra uses the `Vec` type for dynamic arrays and fixed-size arrays both wrapped with the `Var` container. As in Solidity you must be aware of that reading the entire array in one go can be expensive, so it's better to avoid it for large arrays. In many cases, you can use a `Mapping` or `List` instead of an array or vec to store data.

### Custom types

<Tabs>
<TabItem value="rust" label="Odra">

```rust showLineNumbers
use odra::{prelude::*, Var};

#[odra::odra_type]
#[derive(Default)]
pub enum Status {
    #[default]
    Pending,
    Shipped,
    Accepted,
    Rejected,
    Canceled,
}

#[odra::module]
pub struct Enum {
    status: Var<Status>,
}

#[odra::module]
impl Enum {
    pub fn get(&self) -> Status {
        self.status.get_or_default()
    }

    pub fn set(&mut self, status: Status) {
        self.status.set(status);
    }

    pub fn cancel(&mut self) {
        self.status.set(Status::Canceled);
    }

    pub fn reset(&mut self) {
        self.status.set(Default::default());
    }
}
```
</TabItem>

<TabItem value="sol" label="Solidity">

```sol showLineNumbers title="https://solidity-by-example.org/enum/"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Enum {
    // Enum representing shipping status
    enum Status {
        Pending,
        Shipped,
        Accepted,
        Rejected,
        Canceled
    }

    // Default value is the first element listed in
    // definition of the type, in this case "Pending"
    Status public status;

    // Returns uint
    // Pending  - 0
    // Shipped  - 1
    // Accepted - 2
    // Rejected - 3
    // Canceled - 4
    function get() public view returns (Status) {
        return status;
    }

    function set(Status _status) public {
        status = _status;
    }

    function cancel() public {
        status = Status.Canceled;
    }

    // delete resets the enum to its first value, 0
    function reset() public {
        delete status;
    }
}
```
</TabItem>
</Tabs>

In Odra, custom types are defined using the `#[odra::odra_type]` attribute. The enum can have a default value specified using the `#[default]` attribute if derive from the `Default` trait. The enum can be used as a state variable in a contract, and its value can be set and retrieved using the `set` and `get` functions. The value cannot be deleted, however it can be set using the `Default::default()` function.

<Tabs>
<TabItem value="rust" label="Odra">

```rust showLineNumbers
use odra::{prelude::*, List};

#[odra::odra_type]
pub struct Todo {
    text: String,
    completed: bool,
}

#[odra::module]
pub struct Enum {
    // You could also use Var<Vec<Todo>> instead of List<Todo>,
    // but List is more efficient for large arrays,
    // it loads items lazily.
    todos: List<Todo>,
}

#[odra::module]
impl Enum {
    pub fn create(&mut self, text: String) {
        self.todos.push(Todo {
            text,
            completed: false,
        });
    }

    pub fn update_text(&mut self, index: u32, text: String) {
        if let Some(mut todo) = self.todos.get(index) {
            todo.text = text;
            self.todos.replace(index, todo);
        }
    }

    pub fn toggle_complete(&mut self, index: u32) {
        if let Some(mut todo) = self.todos.get(index) {
            todo.completed = !todo.completed;
            self.todos.replace(index, todo);
        }
    }

    // Odra does not create getters by default
    pub fn get(&self, index: u32) -> Option<Todo> {
        self.todos.get(index)
    }
}
```
</TabItem>

<TabItem value="sol" label="Solidity">

```sol showLineNumbers title="https://solidity-by-example.org/structs/"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Todos {
    struct Todo {
        string text;
        bool completed;
    }

    Todo[] public todos;

    function create(string calldata _text) public {
        todos.push(Todo(_text, false));
    }

    // Solidity automatically created a getter for 'todos' so
    // you don't actually need this function.
    function get(uint256 _index)
        public
        view
        returns (string memory text, bool completed)
    {
        Todo storage todo = todos[_index];
        return (todo.text, todo.completed);
    }

    function updateText(uint256 _index, string calldata _text) public {
        Todo storage todo = todos[_index];
        todo.text = _text;
    }

    function toggleCompleted(uint256 _index) public {
        Todo storage todo = todos[_index];
        todo.completed = !todo.completed;
    }
}

```
</TabItem>
</Tabs>

Similarly to enums, custom structs are defined using the `#[odra::odra_type]` attribute. The struct can be used to define a list of items in a contract. The list can be created using the `List` type, which is more efficient for large arrays as it loads items lazily.

### Data Location

In Solidity data location is an important concept that determines where the data is stored and how it can be accessed. The data location can be `memory`, `storage`, or `calldata`. In Odra, data location is not explicitly defined, but whenever interacting with storage primitives (e.g., `Var`, `Mapping`, `List`), the data is stored in the contract's storage.

## Functions
Odra contracts define their functions and methods within the impl block. Here's an example of a transfer function:

```rust
impl Erc20 {
    pub fn transfer(&mut self, recipient: &Address, amount: &U256) {
        // Transfer logic goes here
    }
}
```
Functions can modify contract state and emit events using the env() function.

### View and Pure

<Tabs>
<TabItem value="rust" label="Odra">

```rust showLineNumbers
use odra::Var;

#[odra::module]
pub struct ViewAndPure {
    x: Var<u32>   
}

#[odra::module]
impl ViewAndPure {
    pub fn add_to_x(&self, y: u32) -> u32 {
        self.x.get_or_default() + y
    }
}

pub fn add(i: u32, j: u32) -> u32 {
    i + j
}
```
</TabItem>

<TabItem value="sol" label="Solidity">

```sol showLineNumbers
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ViewAndPure {
    uint256 public x = 1;

    // Promise not to modify the state.
    function addToX(uint256 y) public view returns (uint256) {
        return x + y;
    }

    // Promise not to modify or read from the state.
    function add(uint256 i, uint256 j) public pure returns (uint256) {
        return i + j;
    }
}
```
</TabItem>
</Tabs>


In Odra, you don't need to specify view or pure functions explicitly. All functions are considered view functions by default, meaning they can read contract state but not modify it. To modify the state, the first parameter (so called receiver parameter) should be `&mut self`. If you want to create a pure function that doesn't read or modify state, you can define it as a regular Rust function without any side effects.


### Modifiers

<Tabs>
<TabItem value="rust" label="Odra">

```rust showLineNumbers
use odra::Var;

#[odra::module]
pub struct FunctionModifier {
    x: Var<u32>,
    locked: Var<bool>,  
}

#[odra::module]
impl FunctionModifier {
    pub fn decrement(&mut self, i: u32) -> u32 {
        self.lock();
        self.x.set(self.x.get_or_default() - i);

        if i > 1 {
            self.decrement(i - 1);
        }
        self.unlock();
    }

    #[inline]
    fn lock(&mut self) {
        if self.locked.get_or_default() {
            self.env().revert("No reentrancy");
        }

        self.locked.set(true);
    }

    #[inline]
    fn unlock(&mut self) {
        self.locked.set(false);
    }
}

```
</TabItem>

<TabItem value="sol" label="Solidity">

```sol showLineNumbers
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract FunctionModifier {
    uint256 public x = 10;
    bool public locked;

    modifier noReentrancy() {
        require(!locked, "No reentrancy");

        locked = true;
        _;
        locked = false;
    }

    function decrement(uint256 i) public noReentrancy {
        x -= i;

        if (i > 1) {
            decrement(i - 1);
        }
    }
}
```
</TabItem>
</Tabs>

In Odra there is no direct equivalent to Solidity's function modifiers. Instead, you can define functions that perform certain actions before or after the main function logic. In the example above, the `lock` and `unlock` functions are called before and after the `decrement` function, respectively, but they must be called explicitly.

As often as practicable, developers should inline functions by including the body of the function within their code using `#[inline]` attribute. In the context of coding for Casper blockchain purposes, this reduces the overhead of executed Wasm and prevents unexpected errors due to exceeding resource tolerances.

### Visibility

Functions and state variables have to declare whether they are accessible by other contracts.

Functions can be declared as:
<Tabs>
<TabItem value="rust" label="Odra">

```
`pub` inside `#[odra::module]` impl block - any contract/submodule and account can call.
`pub` inside a regular impl block - any submodule can call.
`default/no modifier/private` - only inside the contract that defines the function.
```
</TabItem>

<TabItem value="sol" label="Solidity">

```
`public` - any contract and account can call.
`private` - only inside the contract that defines the function.
`internal` - only inside contract that inherits an internal function.
`external` - only other contracts and accounts can call

State variables can be declared as public, private, or internal but not external.
```
</TabItem>
</Tabs>

### Payable

<Tabs>
<TabItem value="rust" label="Odra">

```rust showLineNumbers
use odra::Var;

#[odra::module]
pub struct FunctionModifier {
    x: Var<u32>,
    locked: Var<bool>,  
}

#[odra::module]
impl FunctionModifier {
    pub fn decrement(&mut self, i: u32) -> u32 {
        self.lock();
        self.x.set(self.x.get_or_default() - i);

        if i > 1 {
            self.decrement(i - 1);
        }
        self.unlock();
    }

    #[inline]
    fn lock(&mut self) {
        if self.locked.get_or_default() {
            self.env().revert("No reentrancy");
        }

        self.locked.set(true);
    }

    #[inline]
    fn unlock(&mut self) {
        self.locked.set(false);
    }
}

```
</TabItem>

<TabItem value="sol" label="Solidity">

```sol showLineNumbers
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Payable {
    // Payable address can send Ether via transfer or send
    address payable public owner;

    // Payable constructor can receive Ether
    constructor() payable {
        owner = payable(msg.sender);
    }

    // Function to deposit Ether into this contract.
    // Call this function along with some Ether.
    // The balance of this contract will be automatically updated.
    function deposit() public payable {}

    // Call this function along with some Ether.
    // The function will throw an error since this function is not payable.
    function notPayable() public {}

    // Function to withdraw all Ether from this contract.
    function withdraw() public {
        // get the amount of Ether stored in this contract
        uint256 amount = address(this).balance;

        // send all Ether to owner
        (bool success,) = owner.call{value: amount}("");
        require(success, "Failed to send Ether");
    }

    // Function to transfer Ether from this contract to address from input
    function transfer(address payable _to, uint256 _amount) public {
        // Note that "to" is declared as payable
        (bool success,) = _to.call{value: _amount}("");
        require(success, "Failed to send Ether");
    }
}
```
</TabItem>
</Tabs>

### Selectors

In Solidity, when a function is called, the first 4 bytes of calldata specifies which function to call. It is is called a function selector.

```sol showLineNumbers
contract_addr.call(
    abi.encodeWithSignature("transfer(address,uint256)", address, 1234)
)
```

Odra does not support such mechanism, you must have access to the contract interface to call a function.

## Events and Logging

<Tabs>
<TabItem value="rust" label="Odra">

```rust showLineNumbers
use odra::{prelude::*, Address};

#[odra::event]
pub struct Log {
    sender: Address,
    message: String,
}

#[odra::event]
pub struct AnotherLog {}

#[odra::module]
struct Event;

#[odra::module]
impl Event {
    pub fn test(&self) {
        let env = self.env();
        env.emit_event(Log {
            sender: env.caller(),
            message: "Hello World!".to_string(),
        });
        env.emit_event(Log {
            sender: env.caller(),
            message: "Hello Casper!".to_string(),
        });
        env.emit_event(AnotherLog {});
    }
}
```
</TabItem>

<TabItem value="sol" label="Solidity">

```sol showLineNumbers title="https://solidity-by-example.org/events/"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Event {
    // Event declaration
    // Up to 3 parameters can be indexed.
    // Indexed parameters helps you filter the logs by the indexed parameter
    event Log(address indexed sender, string message);
    event AnotherLog();

    function test() public {
        emit Log(msg.sender, "Hello World!");
        emit Log(msg.sender, "Hello EVM!");
        emit AnotherLog();
    }
}
```
</TabItem>
</Tabs>

In Odra, events are regular structs defined using the `#[odra::event]` attribute. The event struct can contain multiple fields, which can be of any type (primitive or custom Odra type). To emit an event, use the env's `emit_event()` function, passing the event struct as an argument.

:::note
Events in Solidity are used to emit logs that off-chain services can capture. However, Casper does not support events natively, however, Odra mimics this feature. Read more about it in the [Basics](../basics/09-events.md) section.
:::

## Error Handling

<Tabs>
<TabItem value="rust" label="Odra">

```rust showLineNumbers
use odra::{prelude::*, casper_types::{U256, U512}};

#[odra::odra_error]
pub enum CustomError {
    InsufficientBalance = 1,
    InputLowerThanTen = 2,
}

#[odra::module]
pub struct Error;

#[odra::module]
impl Error {
    pub fn test_require(&mut self, i: U256) {
        if i <= 10.into() {
            self.env().revert(CustomError::InputLowerThanTen);
        }
    }

    pub fn execute_external_call(&self, withdraw_amount: U512) {
        let balance = self.env().self_balance();
        if balance < withdraw_amount {
            self.env().revert(CustomError::InsufficientBalance);
        }
    }
}
```
</TabItem>

<TabItem value="sol" label="Solidity">

```sol showLineNumbers title="https://solidity-by-example.org/error/"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Error {
    function testRequire(uint256 _i) public pure {
        // Require should be used to validate conditions such as:
        // - inputs
        // - conditions before execution
        // - return values from calls to other functions
        require(_i > 10, "Input must be greater than 10");
    }

    function testRevert(uint256 _i) public pure {
        // Revert is useful when the condition to check is complex.
        // This code does the exact same thing as the example above
        if (_i <= 10) {
            revert("Input must be greater than 10");
        }
    }

    uint256 public num;

    function testAssert() public view {
        // Assert should only be used to test for internal errors,
        // and to check invariants.

        // Here we assert that num is always equal to 0
        // since it is impossible to update the value of num
        assert(num == 0);
    }

    // custom error
    error InsufficientBalance(uint256 balance, uint256 withdrawAmount);

    function testCustomError(uint256 _withdrawAmount) public view {
        uint256 bal = address(this).balance;
        if (bal < _withdrawAmount) {
            revert InsufficientBalance({
                balance: bal,
                withdrawAmount: _withdrawAmount
            });
        }
    }
}
```
</TabItem>
</Tabs>

In Solidity, there are four ways to handle errors: `require`, `revert`, `assert`, and custom error. In Odra there is only one way to revert the execution of a function - by using the `env().revert()` function. The function takes an error type as an argument and stops the execution of the function. You define an error type using the `#[odra::odra_error]` attribute. On Casper, an error is only a number, so you can't pass a message with the error.

## Composition vs. Inheritance
In Solidity, developers often use inheritance to reuse code and establish relationships between contracts. However, Odra and Rust follow a different paradigm known as composition. Instead of inheriting behavior from parent contracts, Odra encourages the composition of contracts by embedding one contract within another.

Let's take a look at the difference between inheritance in Solidity and composition in Odra.

<Tabs>
<TabItem value="rust" label="Odra">

```rust showLineNumbers
use odra::{prelude::*, SubModule};

#[odra::module]
pub struct A;

#[odra::module]
impl A {
    pub fn foo(&self) -> String {
        "A".to_string()
    }
}

#[odra::module]
pub struct B {
    a: SubModule<A>
}

#[odra::module]
impl B {
    pub fn foo(&self) -> String {
        "B".to_string()
    }
}

#[odra::module]
pub struct C {
    a: SubModule<A>
}

#[odra::module]
impl C {
    pub fn foo(&self) -> String {
        "C".to_string()
    }
}

#[odra::module]
pub struct D {
    b: SubModule<B>,
    c: SubModule<C>
}

#[odra::module]
impl D {
    pub fn foo(&self) -> String {
       self.c.foo()
    }
}

#[odra::module]
pub struct E {
    b: SubModule<B>,
    c: SubModule<C>
}

#[odra::module]
impl E {
    pub fn foo(&self) -> String {
       self.b.foo()
    }
}

#[odra::module]
pub struct F {
    a: SubModule<A>,
    b: SubModule<B>,
}

#[odra::module]
impl F {
    pub fn foo(&self) -> String {
       self.a.foo()
    }
}
```
</TabItem>

<TabItem value="sol" label="Solidity">

```sol showLineNumbers title="https://solidity-by-example.org/inheritance/"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/* Graph of inheritance
    A
   / \
  B   C
 / \ /
F  D,E
*/

contract A {
    function foo() public pure virtual returns (string memory) {
        return "A";
    }
}

// Contracts inherit other contracts by using the keyword 'is'.
contract B is A {
    // Override A.foo()
    function foo() public pure virtual override returns (string memory) {
        return "B";
    }
}

contract C is A {
    // Override A.foo()
    function foo() public pure virtual override returns (string memory) {
        return "C";
    }
}

// Contracts can inherit from multiple parent contracts.
// When a function is called that is defined multiple times in
// different contracts, parent contracts are searched from
// right to left, and in depth-first manner.
contract D is B, C {
    // D.foo() returns "C"
    // since C is the right most parent contract with function foo()
    function foo() public pure override(B, C) returns (string memory) {
        return super.foo();
    }
}

contract E is C, B {
    // E.foo() returns "B"
    // since B is the right most parent contract with function foo()
    function foo() public pure override(C, B) returns (string memory) {
        return super.foo();
    }
}

// Inheritance must be ordered from “most base-like” to “most derived”.
// Swapping the order of A and B will throw a compilation error.
contract F is A, B {
    function foo() public pure override(A, B) returns (string memory) {
        return super.foo();
    }
}
```
</TabItem>
</Tabs>

Solidity supports both single and multiple inheritance. This means a contract can inherit from one or more contracts. Solidity uses a technique called "C3 linearization" to resolve the order in which base contracts are inherited in the case of multiple inheritance. This helps to ensure a consistent method resolution order. However, multiple inheritance can lead to complex code and potential issues especially for unexperienced developers.

In contrary Rust does not have a direct equivalent to the inheritance model, but it achieves similar goals through composition. Each contract is defined as a struct, and contracts can be composed by embedding one struct within another. This approach provides a more flexible and modular way to reuse code and establish relationships between contracts.

## Libraries and Utility

<Tabs>
<TabItem value="rust" label="Odra">

```rust showLineNumbers
use odra::{casper_types::U256, prelude::*, UnwrapOrRevert, Var};

mod math {
    use odra::casper_types::U256;

    pub fn sqrt(y: U256) -> U256 {
        let mut z = y;
        if y > 3.into() {
            let mut x = y / 2 + 1;
            while x < z {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if y != U256::zero() {
            z = U256::one();
        }
        z
    }
}

#[odra::module]
struct TestMath;

#[odra::module]
impl TestMath {
    pub fn test_square_root(&self, x: U256) -> U256 {
        math::sqrt(x)
    }
}

#[odra::odra_error]
enum Error {
    EmptyArray = 100,
}

trait Removable {
    fn remove(&mut self, index: usize);
}

impl Removable for Var<Vec<U256>> {
    fn remove(&mut self, index: usize) {
        let env = self.env();
        let mut vec = self.get_or_default();
        if vec.is_empty() {
            env.revert(Error::EmptyArray);
        }
        vec[index] = vec.pop().unwrap_or_revert(&env);
        self.set(vec);
    }
}

#[odra::module]
struct TestArray {
    arr: Var<Vec<U256>>,
}

#[odra::module]
impl TestArray {
    pub fn test_array_remove(&mut self) {
        let mut arr = self.arr.get_or_default();
        for i in 0..3 {
            arr.push(i.into());
        }
        self.arr.set(arr);

        self.arr.remove(1);

        let arr = self.arr.get_or_default();
        assert_eq!(arr.len(), 2);
        assert_eq!(arr[0], 0.into());
        assert_eq!(arr[1], 2.into());
    }
}
```
</TabItem>

<TabItem value="sol" label="Solidity">

```sol showLineNumbers title="https://solidity-by-example.org/library/"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library Math {
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
        // else z = 0 (default value)
    }
}

contract TestMath {
    function testSquareRoot(uint256 x) public pure returns (uint256) {
        return Math.sqrt(x);
    }
}

library Array {
    function remove(uint256[] storage arr, uint256 index) public {
        require(arr.length > 0, "Can't remove from empty array");
        arr[index] = arr[arr.length - 1];
        arr.pop();
    }
}

contract TestArray {
    using Array for uint256[];

    uint256[] public arr;

    function testArrayRemove() public {
        for (uint256 i = 0; i < 3; i++) {
            arr.push(i);
        }

        arr.remove(1);

        assert(arr.length == 2);
        assert(arr[0] == 0);
        assert(arr[1] == 2);
    }
}
```
</TabItem>
</Tabs>

In Solidity libraries are similar to contracts, but can't declare any state variable and can't receive ether. In the sample code above, the Math library contains a square root function, while the Array library provides a function to remove an element from an array. Both libraries are consumed in a different way: the `TestMath` contract calls the `sqrt` function directly, while the `TestArray` contract uses the `using` keyword, which extends the type `uint256[]` adding the `remove` function.

In `Odra` you use language level features: modules and traits. The `mod` keyword defines a module, which is similar to a library in Solidity. Modules can contain functions, types, and other items that can be reused across multiple contracts. Traits are similar to interfaces in other programming languages, defining a set of functions that a type must implement. Implementing the `Removable` trait for the `Var<Vec<U256>>` type allows the `remove` function to be called on a variable that stores a vector of `U256` values.

## Fallback and Receive Functions

In Solidity, a contract receiving Ether must implement a `receive()` and/or `fallback()` function. The `receive()` function is called when Ether is sent to the contract with no data, while the `fallback()` function is called when the contract receives Ether with data or when a function that does not exist is called.

Odra does not have a direct equivalent to the `receive()` and `fallback()` functions. Instead, you can define a function with the `#[payable]` attribute to indicate that the function can receive CSPRs.

## Miscellaneous


### Hashing
<Tabs>
<TabItem value="rust" label="Odra">

```rust showLineNumbers
use odra::{
    casper_types::{bytesrepr::ToBytes, U256},
    prelude::*,
    Address, UnwrapOrRevert, Var,
};

#[odra::module]
pub struct HashFunction;

#[odra::module]
impl HashFunction {
    pub fn hash(&self, text: String, num: U256, addr: Address) -> [u8; 32] {
        let env = self.env();
        let mut data = Vec::new();
        data.extend(text.to_bytes().unwrap_or_revert(&env));
        data.extend(num.to_bytes().unwrap_or_revert(&env));
        data.extend(addr.to_bytes().unwrap_or_revert(&env));
        env.hash(data)
    }
}

#[odra::module]
pub struct GuessTheMagicWord {
    answer: Var<[u8; 32]>,
}

#[odra::module]
impl GuessTheMagicWord {
    /// Initializes the contract with the magic word hash.
    pub fn init(&mut self) {
        self.answer.set([
            0x86, 0x67, 0x15, 0xbb, 0x0b, 0x96, 0xf1, 0x06, 0xe0, 0x68, 0x07, 0x89, 0x22, 0x84,
            0x42, 0x81, 0x19, 0x6b, 0x1e, 0x61, 0x45, 0x50, 0xa5, 0x70, 0x4a, 0xb0, 0xa7, 0x55,
            0xbe, 0xd7, 0x56, 0x08,
        ]);
    }

    /// Checks if the `word` is the magic word.
    pub fn guess(&self, word: String) -> bool {
        let env = self.env();
        let hash = env.hash(word.to_bytes().unwrap_or_revert(&env));
        hash == self.answer.get_or_default()
    }
}
```
</TabItem>

<TabItem value="sol" label="Solidity">

```sol showLineNumbers title="https://solidity-by-example.org/hashing/"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract HashFunction {
    function hash(string memory _text, uint256 _num, address _addr)
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(_text, _num, _addr));
    }
}

contract GuessTheMagicWord {
    bytes32 public answer =
        0x60298f78cc0b47170ba79c10aa3851d7648bd96f2f8e46a19dbc777c36fb0c00;

    // Magic word is "Solidity"
    function guess(string memory _word) public view returns (bool) {
        return keccak256(abi.encodePacked(_word)) == answer;
    }
}
```
</TabItem>
</Tabs>

The key difference between the two is that in Solidity, the `keccak256` function is used to hash data, while in Odra, the `env.hash()` function is used which implements `blake2b` algorithm. Both functions take a byte array as input and return a 32-byte hash.

### Try-catch

<Tabs>
<TabItem value="rust" label="Odra">

```rust showLineNumbers
use odra::{module::Module, Address, ContractRef, Var};

#[odra::module]
pub struct Example {
    other_contract: Var<Address>,
}

#[odra::module]
impl Example {
    pub fn init(&mut self, other_contract: Address) {
        self.other_contract.set(other_contract);
    }

    pub fn execute_external_call(&self) {
        if let Some(addr) = self.other_contract.get() {
            let result = OtherContractContractRef::new(self.env(), addr).some_function();
            match result {
                Ok(success) => {
                    // Code to execute if the external call was successful
                }
                Err(reason) => {
                    // Code to execute if the external call failed
                }
            }
        }
    }
}

#[odra::module]
pub struct OtherContract;

#[odra::module]
impl OtherContract {
    pub fn some_function(&self) -> Result<bool, ()> {
        Ok(true)
    }
}
```
</TabItem>

<TabItem value="sol" label="Solidity">

```sol showLineNumbers title="https://solidity-by-example.org/hashing/"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Example {
    OtherContract otherContract;

    constructor(address _otherContractAddress) public {
        otherContract = OtherContract(_otherContractAddress);
    }

    function executeExternalCall() public {
        try otherContract.someFunction() returns (bool success) {
            // Code to execute if the external call was successful
            require(success, "Call failed");
        } catch Error(string memory reason) {
            // Code to execute if the external call failed with a revert reason
            // Optionally handle specific revert reasons
            emit LogErrorString(reason);
        } catch (bytes memory lowLevelData) {
            // Code to execute if the external call failed without a revert reason
            emit LogErrorBytes(lowLevelData);
        }
    }

    event LogErrorString(string reason);
    event LogErrorBytes(bytes lowLevelData);
}

contract OtherContract {
    function someFunction() public returns (bool) {
        // Function logic
    }
}
```
</TabItem>
</Tabs>

In Solidity, `try/catch` is a feature that allows developers to handle exceptions and errors more gracefully. The `try/catch` statement allows developers to catch and handle exceptions that occur during external function calls and contract creation.

In Odra there is no direct equivalent to the `try/catch` statement in Solidity. However, you can use the `Result` type to handle errors in a similar way. The `Result` type is an enum that represents either success (`Ok`) or failure (`Err`). You can use the `match` statement to handle the `Result` type and execute different code based on the result. However, if an unexpected error occurs on the way, the whole transaction reverts.

## Conclusion
Congratulations! You've now learned the basics of writing smart contracts with the Odra Framework. By understanding the structure, initialization, error handling, and the composition pattern in Odra, you can effectively transition from Solidity to Odra for Casper blockchain development.

Experiment with the provided code samples, explore more advanced features, and unleash the full potential of the Odra Framework.

If you have any further questions or need clarification on specific topics, feel free to ask!
