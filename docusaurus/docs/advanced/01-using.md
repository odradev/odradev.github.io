# Module reusing

This feature of the Odra Framework is designed to enhance the reusability and modularity of your smart contracts. It empowers developers to reuse modules and override custom namespaces. This guide provides an in-depth look at the module reusing feature, complete with practical code examples.

## Conceptual Overview
By default, each instance of a module has its own namespace, ensuring each internal value has a unique storage key.

```rust
#[odra::module]
struct Contract {
    value: Variable<u8>, // the default namespace would be "value"
    module: Module
}

#[odra::module]
struct Module {
    secret: Variable<String> // the default namespace would be "module_secret"
}
```
While this isolation often proves useful, there are scenarios where shared storage is beneficial.

## Usage
 Odra generates an array of keys, prefixing the storage key of child modules with the parent namespace, like in the example above. But what if you want to reuse the same instance of a module? Add a `#[odra(using)]` attribute to a module to override the default behavior. This is information for the module "Do not prefix storage keys for the given module." so effectively, the child and the parent use the same module instance.

Let's illustrate it with a simple example. The example provided below introduces some additional complexity by featuring deeper module nesting.

```rust
use odra::Variable;

#[odra::module]
pub struct SharedStorage {
    pub value: Variable<String>
}

#[odra::module]
pub struct MyStorage {
    pub shared: SharedStorage,
    pub version: Variable<u8>
}

#[odra::module]
pub struct ComposableContract {
    pub shared: SharedStorage,
    #[odra(using = "shared")]
    pub storage: MyStorage
}

#[odra::module]
impl ComposableContract {
    #[odra(init)]
    pub fn init(&mut self, version: u8, value: String) {
        self.storage.version.set(version);
        self.shared.value.set(value);
    }

    pub fn get_value(&self) -> String {
        self.shared.value.get_or_default()
    }

    pub fn get_value_via_storage(&self) -> String {
        self.storage.shared.value.get_or_default()
    }
}

#[cfg(test)]
mod test {
    use crate::composer::ComplexContractDeployer;

    #[test]
    fn t() {
        let shared_value = "shared_value".to_string();
        let extra_value: u32 = 314;
        let token = ComplexContractDeployer::init(1, shared_value.clone(), extra_value);

        assert_eq!(token.get_value(), shared_value);
        assert_eq!(token.get_value_via_storage(), shared_value);
        assert_eq!(token.get_extra_value(), extra_value);
    }
}
```

In this example, we've introduced a new module, `MoreStorage`, which nests `MyStorage` and includes an extra value. The `ComplexContract` contains `SharedStorage` and `MoreStorage`, creating a deeper nesting. Our test ensures that values can be successfully retrieved from different storage levels.

If we had used the default behavior, would have been created (so, they would no longer be shared), each having distinct namespaces:
1. On the contract level - `contract_shared_value`.
2. On the `MyStorage` module level - `contract_more_storage_shared_value`.

This example showcases how you can effectively use the module reusing feature to build intricate and efficient smart contracts.
