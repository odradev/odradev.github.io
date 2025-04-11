# Delegating CSPR to Validators
Casper 2.0 introduced a feature, that allows delegating CSPR tokens to validators by contracts.
This can be useful, especially if you want to implement some kind of liquid staking solution.
That's why Odra since v2.0.0 provides a way to delegate CSPR tokens to validators by contracts.

## Sample implementation

The following code shows how to implement a simple contract that allows delegating CSPR tokens to a validator.

```rust title=examples/src/features/validators.rs
use odra::{
    casper_types::{PublicKey, U512},
    prelude::*
};

#[odra::module]
pub struct ValidatorsContract {
    /// In this variable we store the validator's public key, this is the only way we can identify the validator
    validator: Var<PublicKey>
}

/// Implementation of the TestingContract
#[odra::module]
impl ValidatorsContract {
    /// Initializes the contract with the validator's public key
    pub fn init(&mut self, validator: PublicKey) {
        self.validator.set(validator);
    }

    /// Stake the amount of tokens
    #[odra(payable)]
    pub fn stake(&mut self) {
        // Get the amount of tokens attached to the call
        let amount = self.env().attached_value();
        if amount.is_zero() {
            self.env().revert(ValError::InsufficientBalance);
        }
        
        // Use the ContractEnv's delegate method to delegate the tokens to the validator
        self.env().delegate(self.validator.get().unwrap(), amount);
    }

    /// Undelegate the amount from the validator
    pub fn unstake(&mut self, amount: U512) {
        self.env().undelegate(self.validator.get().unwrap(), amount);
    }

    /// Withdraw the amount from the validator
    pub fn withdraw(&mut self, amount: U512) {
        self.env().transfer_tokens(&self.env().caller(), &amount);
    }

    ...
}
```

## Explanation
The above example can be a good starting point for implementing a liquid staking solution. The main things to
remember are the new api methods in ContractEnv:

```rust
pub fn delegate(&self, validator: PublicKey, amount: U512);
pub fn undelegate(&self, validator: PublicKey, amount: U512);
pub fn delegated_amount(&self, validator: PublicKey) -> U512;
```

As you can see, we identify the validator by its public key. Funds delegated to the validator are assigned to the
calling contract.

Remember, that the delegation and undelegation takes some time, depending on the configuration of the blockchain - it's
not instant. For example in the Casper mainnet, the delegation takes 1 era and the undelegation takes 7 eras.

## Testing

It is possible to test the delegation and undelegation of tokens in the contract. The following code shows how to do it:

```rust title=examples/src/features/validators.rs
...
        let test_env = odra_test::env();
        let auction_delay = test_env.auction_delay();
        let unbonding_delay = test_env.unbonding_delay();

        test_env.set_caller(test_env.get_account(0));
        let mut staking = ValidatorsContract::deploy(
            &test_env,
            ValidatorsContractInitArgs {
                validator: test_env.get_validator(0)
            }
        );

        let inital_account_balance = test_env.balance_of(&test_env.get_account(0));

        // Stake some amount
        let staking_amount = U512::from(1_000_000_000_000u64);
        staking.with_tokens(staking_amount).stake();
        assert_eq!(staking.currently_delegated_amount(), staking_amount);
        assert_eq!(
            test_env.balance_of(&test_env.get_account(0)),
            inital_account_balance - staking_amount
        );

        // Advance time, run auctions and give off rewards
        test_env.advance_with_auctions(auction_delay * 2);

        // Check that the amount is greater than the staking amount
        let staking_with_reward = staking.currently_delegated_amount();
        assert!(staking_with_reward > staking_amount);

...
```

You can see, that we use the new methods from HostEnv, namely:

```rust
    fn advance_with_auctions(&self, time_diff: u64);
    fn auction_delay(&self) -> u64; 
    fn unbonding_delay(&self) -> u64;
    fn delegated_amount(&self, delegator: Address, validator: PublicKey) -> U512;
```

`advance_with_auctions` work in similar way to `advance_block_time`, but it also runs the auctions and to give off
rewards. The `auction_delay` and `unbonding_delay` methods return the values of the auction and unbonding delays 
specific to the network or backend.

We used `currently_delegated_amount` in the example, it uses `delegated_amount` method from ContractEnv, but it is also
possible to query this information from the HostEnv using `delegated_amount` method.
