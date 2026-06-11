# Factory

The Factory pattern is a design pattern used in smart contracts to create, manage, and keep track of other smart contracts. A factory contract is a contract that deploys other contracts, acting as a centralized registry for all the contracts it has created. This pattern is particularly useful for applications that require standardized, on-demand contract creation, such as deploying new trading pairs for a DEX, launching NFT collections, or creating instances of multi-signature wallets.

## A Plain Odra Module

Before we create a factory, let's define the contract we want to produce. Here is a simple `Counter` contract. It's a standard Odra module with a constructor that initializes the counter value, an increment method, and a getter for the current value.

```rust
#[odra::module]
pub struct Counter {
    value: Var<u32>
}

#[odra::module]
impl Counter {
    pub fn init(&mut self, value: u32) {
        self.value.set(value);
    }

    pub fn increment(&mut self) {
        self.value.set(self.value.get_or_default() + 1);
    }

    pub fn value(&self) -> u32 {
        self.value.get_or_default()
    }
}
```

## Creating a Factory in Odra

Turning our `Counter` contract into a factory is as simple as adding the `factory=on` attribute to both the `struct` and `impl` blocks of the module.
Odra will use this to automatically generate the factory logic.

Let's update our `Counter` contract to be factory-enabled:

```rust
#[odra::module(factory=on)]
pub struct Counter {
    // ... previous fields remain unchanged ...
}

#[odra::module(factory=on)]
impl Counter {
   // ... previous methods remain unchanged ...
}
```

## Generated Factory Module

By adding `factory=on`, you instruct the framework to automatically generate a new, dedicated factory module for your
contract. For our `Counter` contract, Odra will generate a `CounterFactory` module.

This generated factory contract comes with a set of built-in entry points for managing the lifecycle of child contracts. 
You do not need to write any of this logic yourself. 

:::note
The generated factory contract does not include any public entry points beyond the factory management functions.
:::


## Factory Entry Points

The generated factory contract exposes a standardized set of management entry points. It does not have any other public entry points.

-  `new_contract(contract_name: String, name: String, price: u64) -> (Address, URref)`: Deploys a new instance of the child contract (`Product` in our case). The arguments required by the child's `init` function must be passed along with an unique contract name. It returns the address of the newly created contract and an access URref to it.
-  `upgrade_child_contract(contract_name: String)`: Upgrades a single child contract (previously created by this factory) to the latest version of the child contract's Wasm. Except the contract name, it also takes the `upgrade` function arguments of the child contract.
-  `batch_upgrade_child_contract<T: Into<odra::casper_types::RuntimeArgs>>(args: BTreeMap<String, T>)`: Upgrades a list of child contracts in a single transaction. This entry point is a more gas-efficient way to upgrade multiple child contracts at once but requires more complex argument handling.

## Testing the Factory

With the factory being automatically generated, testing becomes straightforward. 

You can still deploy and interact with the `Counter` contract as a standalone module,
but now you can also deploy it via the `CounterFactory`.

```rust
use odra::{
    host::{Deployer, HostRef, NoArgs},
    prelude::*,
};

use super::{
    Counter, CounterFactory, CounterFactoryContractDeployed, CounterHostRef, CounterInitArgs
};

#[test]
fn test_standalone_module() {
    let env = odra_test::env();
    let mut counter_ref = Counter::deploy(&env, CounterInitArgs { value: 1 });
    assert_eq!(counter_ref.value(), 1);
    counter_ref.increment();
    assert_eq!(counter_ref.value(), 2);
}

#[test]
fn test_factory() {
    let env = odra_test::env();
    // Deploy the factory contract
    let mut factory_ref = CounterFactory::deploy(&env, NoArgs);
    // Use the factory to deploy a new Counter contract with initial value 10
    let (address, _access_uref) = factory_ref.new_contract(String::from("Counter"), 10);
    assert!(env.emitted_event(
        &factory_ref,
        CounterFactoryContractDeployed {
            contract_address: address,
            contract_name: String::from("Counter")
        }
    ));
    // Interact with the newly deployed Counter contract
    let mut counter_ref = CounterHostRef::new(address, env);
    // Increment the counter
    counter_ref.increment();
    // The value should now be 11
    assert_eq!(counter_ref.value(), 11);
}

```

:::note
Along with the factory contract, Odra also generates an event struct for contract deployment events. In our case,
it's `CounterFactoryContractDeployed`, which is emitted every time a new `Counter` contract is created via the factory.
:::

## Upgrading Child Contracts
One of the powerful features of the factory pattern is the ability to upgrade child contracts. 
When you upgrade the factory contract itself, it can also upgrade all previously deployed child contracts to the new version.

To enable this, ensure that your factory contract is deployed with an upgradable configuration.
When you upgrade the factory, you can call the `upgrade_child_contract` or `batch_upgrade_child_contract` methods to upgrade 
individual or multiple child contracts respectively. Learn more about contract upgrades in the [Upgrades](../tutorials/upgrades.md) section.

```rust
#[odra::module(factory=on)]
pub struct CounterV2 {
    value: Var<u32>
}

#[odra::module(factory=on)]
impl CounterV2 {
    // ... v1 methods remain unchanged ...

    pub fn upgrade(&mut self, new_value: u32) {
        self.value.set(new_value);
    }
}

#[cfg(test)]
mod test {
    use odra::{
        host::{Deployer, HostRef, InstallConfig, NoArgs},
        prelude::*,
        VmError
    };
    use super::*;

    #[test]
    fn test_factory_upgrade_works() {
        let env = odra_test::env();
        // Deploy the factory contract
        let mut factory = CounterFactory::deploy_with_cfg(
            &env,
            NoArgs,
            InstallConfig::upgradable::<CounterFactory>()
        );
        let (ten_address, _) = factory.new_contract(String::from("FromTen"), 10);
        let (two_address, _) = factory.new_contract(String::from("FromTwo"), 2);
        let (three_address, _) = factory.new_contract(String::from("FromThree"), 3);
        let (hundred_address, _) = factory.new_contract(String::from("FromHundred"), 100);

        // Upgrade the factory contract
        let result = CounterV2Factory::try_upgrade(&env, factory.address(), NoArgs);
        assert!(result.is_ok());

        let mut factory = result.unwrap();
        // Upgrade individual child contracts
        factory.upgrade_child_contract(String::from("FromTen"), 122);
        factory.upgrade_child_contract(String::from("FromTwo"), 11);

        // Verify upgraded values
        assert_eq!(CounterHostRef::new(ten_address, env.clone()).value(), 122);
        assert_eq!(CounterHostRef::new(two_address, env.clone()).value(), 11);

        // Batch upgrade child contracts
        let args = vec![
            ("FromTwo".to_string(), 42u32),
            ("FromThree".to_string(), 42u32),
            ("FromHundred".to_string(), 1000u32),
        ]
        .into_iter()
        .map(|(contract_name, new_value)| (contract_name, CounterV2UpgradeArgs { new_value }))
        .collect::<BTreeMap<_, _>>();
        factory.batch_upgrade_child_contract(args);

        // Verify upgraded values
        assert_eq!(CounterHostRef::new(ten_address, env.clone()).value(), 122);
        assert_eq!(CounterHostRef::new(two_address, env.clone()).value(), 42);
        assert_eq!(CounterHostRef::new(three_address, env.clone()).value(), 42);
        assert_eq!(
            CounterHostRef::new(hundred_address, env.clone()).value(),
            1000
        );
    }
}
```

In the above example, we utilized the `CounterV2UpgradeArgs` struct to pass the new initialization parameters during the upgrade process.
We can do this becase any `UpgradeArgs` struct implements the `Into<RuntimeArgs>` trait, allowing seamless conversion when upgrading contracts.

## Conclusion

In this section, we explored how to implement the Factory pattern in Odra by simply adding the `factory=on` attribute to our module.
This enables automatic generation of a factory contract that can deploy and manage instances of the child contract.
We also discussed how to upgrade child contracts through the factory, leveraging Odra's built-in upgrade mechanisms.
