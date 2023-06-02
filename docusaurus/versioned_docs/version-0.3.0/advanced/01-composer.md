# Module Composer

## Introduction
The Module Composer is a feature of the Odra Framework designed to enhance the reusability and modularity of your smart contracts. It empowers developers to reuse modules and override custom namespaces. This guide provides an in-depth look at the Module Composer feature, complete with practical code examples.

## Conceptual Overview
By default, each instance of a module has its own namespace, ensuring each internal value has a unique storage key. While this isolation often proves useful, there are scenarios where shared storage is beneficial. Here, the Module Composer comes to the fore.

Additionally, the Module Composer shortens the storage key - a handy side effect of shared storage. For each module, Odra generates a corresponding Composer struct (e.g., `MyContractComposer` for `MyContract` module), which aids in manual module composition.

## Usage
By default, the #[odra::module] macro generates an implementation of the odra::Instance trait, prefixing the storage key of child modules with the parent namespace. To disable this behavior, pass the skip_instance argument to the #[odra::module] macro.

Let's write a simple code example. The example provided below introduces some additional complexity by featuring deeper module nesting.

```rust
use odra::{Instance, Variable};

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
pub struct MoreStorage {
    pub my_storage: MyStorage,
    pub extra: Variable<u32>
}

#[odra::module(skip_instance)]
pub struct ComplexContract {
    pub shared: SharedStorage,
    pub more_storage: MoreStorage
}

#[odra::module]
impl ComplexContract {
    #[odra(init)]
    pub fn init(&mut self, version: u8, value: String, extra: u32) {
       self.more_storage.my_storage.version.set(version);
        self.shared.value.set(value);
        self.more_storage.extra.set(extra);
    }

    pub fn get_value(&self) -> String {
        self.shared.value.get_or_default()
    }

    pub fn get_value_via_storage(&self) -> String {
        self.more_storage.my_storage.shared.value.get_or_default()
    }

    pub fn get_extra_value(&self) -> u32 {
      self.more_storage.extra.get_or_default()
    }
}

impl Instance for ComplexContract {
    fn instance(namespace: &str) -> Self {
        let shared = SharedStorageComposer::new(namespace, "shared").compose();
        let my_storage = MyStorageComposer::new(namespace, "my_storage")
            .with_shared(&shared)
            .compose();
        let more_storage = MoreStorageComposer::new(namespace, "more_storage")
            .with_my_storage(&my_storage)
            .compose();
        Self { shared, more_storage }
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

This example showcases how you can effectively use the Module Composer feature to build intricate and efficient smart contracts.

## Conclusion
The Module Composer in Odra provides developers with a high level of flexibility and control over module behavior in their smart contracts. This guide, complete with a practical example, should give you a good understanding of the feature. Embrace the power of the Module Composer and unleash the full potential of your smart contracts!