---
sidebar_position: 9
---

# CEP-18

Not so different from ERC-20, the CEP-18 standard describes a fungible
token interface, but for the Casper network.
There are some differences, which will be shown in this tutorial.
The most visible one however, is the compatibility with the Casper Ecosystem.

In our example, we will implement a CEP-18 token with a simple self-governance mechanism.
We will also deploy our token on the Casper network, and interact with it.

:::warning
This implementation of the governance in this tutorial is by no means
a complete one, and should not be used in production.
:::

## Self-governing token

There are many ways to implement a governance mechanism for a token,
each more complex than the other. In our example, we will use a simple
one, where the community of token holders can vote to mint new tokens.

## Token implementation

Let's start by creating a new project, choosing a clever name and using
cep18 as our starting template:

```bash
cargo odra new --name ourcoin --template cep18
```

Let's glance at our token code:

```rust showLineNumbers title="src/token.rs"
#[odra::module]
pub struct MyToken {
    token: SubModule<Cep18>,
}

impl MyToken {
    // Delegate all Cep18 functions to the token sub-module.
    delegate! {
        to self.token {
            ...
            fn name(&self) -> String;
            fn symbol(&self) -> String;
            ...
```

As we can see, it indeed uses the `Cep18` module and delegates
all the methods to it.

The only thing to do is to change the name of the struct to more
appropriate `OurToken`, run the provided tests using `cargo odra test`,
and continue with the implementation of the governance.

:::note
Remember to change the name of the struct and its usages as well as
the struct name in the `Odra.toml` file!
:::

## Governance implementation

Let's go through the process of implementing the governance mechanism.
If we don't want to, we don't have to hide entrypoints from the public responsible
for minting new tokens. By default, minting [Modality](https://github.com/casper-ecosystem/cep18/tree/dev/cep18#modalities)
is turned off, so any attempt of direct minting will result in an error.

We will however implement a voting mechanism, where the token holders can vote
to mint new tokens.

### Voting mechanism

Our voting system will be straightforward:

1. Anyone with the tokens can propose a new mint.
2. Anyone with the tokens can vote for the new mint by staking their tokens.
3. If the majority of the token holders vote for the mint, it is executed.

#### Storage

We will need to store some additional information about the votes, so let's
add some fields to our token struct:

```rust showLineNumbers title="src/token.rs"
#[odra::module]
pub struct OurToken {
    /// A sub-module that implements the CEP-18 token standard.
    token: SubModule<Cep18>,
    /// The proposed mint.
    proposed_mint: Var<(Address, U256)>,
    /// The list of votes cast in the current vote.
    votes: List<Ballot>,
    /// Whether a vote is open.
    is_vote_open: Var<bool>,
    /// The time when the vote ends.
    vote_end_time: Var<u64>,
}

/// A ballot cast by a voter.
#[odra::odra_type]
struct Ballot {
    voter: Address,
    choice: bool,
    amount: U256,
}
```

Notice that `proposed_mint` contains a tuple containing the address of
the proposer and the amount of tokens to mint. Moreover, we need to keep track if
the vote time has ended, but also if it was already tallied, that's why
we need both `is_vote_open` and `vote_end_time`.

We will also use the power of the [List](../basics/storage-interaction#list)
type to store the `Ballots`.

#### Proposing a new mint

To implement the endpoint that allows token holders to propose a new mint,
we need to add a new function to our token module:

```rust showLineNumbers title="src/token.rs"
/// Proposes a new mint for the contract.
pub fn propose_new_mint(&mut self, account: Address, amount: U256) {
    // Only allow proposing a new mint if there is no vote in progress.
    if self.is_vote_open().get_or_default() {
        self.env().revert(GovernanceError::VoteAlreadyOpen);
    }

    // Only the token holders can propose a new mint.
    if self.balance_of(&self.env().caller()) == U256::zero() {
        self.env().revert(GovernanceError::OnlyTokenHoldersCanPropose);
    }

    // Set the proposed mint.
    self.proposed_mint.set((account, amount));
    // Open a vote.
    self.is_vote_open.set(true);
    // Set the vote end time to 10 minutes from now.
    self.vote_end_time
        .set(self.env().get_block_time() + 60 * 10 * 1000);
}
```

As a parameters to the function, we pass the address of the account that should be the receiver of
the minted tokens, and the amount.

After some validation, we open the vote by setting the `is_vote_open` to `true`,
and setting the `vote_end_time` to 10 minutes. In real-world scenarios,
the time could be configurable, but for the sake of simplicity, we hardcoded it.
Also, it should be quite longer than 10 minutes, but it will come in handy
when we test it on Livenet.

#### Voting for the mint

Next, we need an endpoint that will allow us to cast a ballot:

```rust showLineNumbers title="src/token.rs"
/// Votes on the proposed mint.
pub fn vote(&mut self, choice: bool, amount: U256) {
    // Only allow voting if there is a vote in progress.
    self.assert_vote_in_progress();

    let voter = self.env().caller();
    let contract = self.env().self_address();

    // Transfer the voting tokens from the voter to the contract.
    self.token
        .transfer(&contract, &amount);

    // Add the vote to the list.
    self.votes.push(Ballot {
        voter,
        choice,
        amount,
    });
}
```

The most interesting thing here is that we are using a mechanism of staking,
where we transfer our tokens to the contract, to show that we really mean it.

The tokens will be locked until the vote is over, and tallied.

Speaking of tallying...

#### Tallying the votes

The last step is to tally the votes and mint the tokens if the majority
of voters agreed to do so:

```rust showLineNumbers title="src/token.rs"
/// Count the votes and perform the action
pub fn tally(&mut self) {
    // Only allow tallying the votes once.
    if !self.is_vote_open.get_or_default()
    {
        self.env().revert(GovernanceError::NoVoteInProgress);
    }

    // Only allow tallying the votes after the vote has ended.
    let finish_time = self
        .vote_end_time
        .get_or_revert_with(GovernanceError::NoVoteInProgress);
    if self.env().get_block_time() < finish_time {
        self.env().revert(GovernanceError::VoteNotYetEnded);
    }

    // Count the votes
    let mut yes_votes = U256::zero();
    let mut no_votes = U256::zero();

    let contract = self.env().self_address();

    while let Some(vote) = self.votes.pop() {
        if vote.choice {
            yes_votes += vote.amount;
        } else {
            no_votes += vote.amount;
        }

        // Transfer back the voting tokens to the voter.
        self.token.raw_transfer(&contract, &vote.voter, &vote.amount);
    }

    // Perform the action if the vote has passed.
    if yes_votes > no_votes {
        let (account, amount) = self
            .proposed_mint
            .get_or_revert_with(GovernanceError::NoVoteInProgress);
        self.token.raw_mint(&account, &amount);
    }

    // Close the vote.
    self.is_vote_open.set(false);
}
```

Notice how we used `raw_transfer` from the `Cep18` module. We used it
to set the sender, so the contract's balance will be used, instead of
the caller's.

Additonally, we used `raw_mint` to mint the tokens, skipping the security
checks. We have no modality for minting, but even if we had, we don't
have anyone with permissions! The Contract needs to mint the tokens itself.

### Testing

Now, we will put our implementation to the test. One unit test, that we can
run both on OdraVM and on the CasperVM.

```rust showLineNumbers title="src/token.rs"
#[test]
fn it_works() {
    let env = odra_test::env();
    let init_args = OurTokenInitArgs {
        name: "OurToken".to_string(),
        symbol: "OT".to_string(),
        decimals: 0,
        initial_supply: U256::from(1_000u64),
    };

    let mut token = OurToken::deploy(&env, init_args);

    // The deployer, as the only token holder,
    // starts a new voting to mint 1000 tokens to account 1.
    // There is only 1 token holder, so there is one Ballot cast.
    token.propose_new_mint(env.get_account(1), U256::from(2000));
    token.vote(true, U256::from(1000));

    // The tokens should now be staked.
    assert_eq!(token.balance_of(&env.get_account(0)), U256::zero());

    // Wait for the vote to end.
    env.advance_block_time(60 * 11 * 1000);

    // Finish the vote.
    token.tally();

    // The tokens should now be minted.
    assert_eq!(token.balance_of(&env.get_account(1)), U256::from(2000));
    assert_eq!(token.total_supply(), 3000.into());

    // The stake should be returned.
    assert_eq!(token.balance_of(&env.get_account(0)), U256::from(1000));

    // Now account 1 can mint new tokens with their voting power...
    env.set_caller(env.get_account(1));
    token.propose_new_mint(env.get_account(1), U256::from(2000));
    token.vote(true, U256::from(2000));

    // ...Even if the deployer votes against it.
    env.set_caller(env.get_account(0));
    token.vote(false, U256::from(1000));

    env.advance_block_time(60 * 11 * 1000);

    token.tally();

    // The power of community governance!
    assert_eq!(token.balance_of(&env.get_account(1)), U256::from(4000));
}
```  

We can run the test using both methods:

```bash
cargo odra test
cargo odra test -b casper
```

It is all nice and green, but it would be really nice to see it in action.

How about deploying it on the Casper network?

## What's next

We will se our token in action, by [deploying it on the Casper network](deploying-on-casper),
and using tools from the Casper Ecosystem to interact with it.

## Complete code

Here is the complete code of the `OurToken` module:

```rust showLineNumbers title="src/token.rs"
use odra::{casper_types::U256, prelude::*};
use odra_modules::cep18_token::Cep18;

/// A ballot cast by a voter.
#[odra::odra_type]
struct Ballot {
    voter: Address,
    choice: bool,
    amount: U256,
}

/// Errors for the governed token.
#[odra::odra_error]
pub enum GovernanceError {
    /// The vote is already in progress.
    VoteAlreadyOpen = 0,
    /// No vote is in progress.
    NoVoteInProgress = 1,
    /// Cannot tally votes yet.
    VoteNotYetEnded = 2,
    /// Vote ended
    VoteEnded = 3,
    /// Only the token holders can propose a new mint.
    OnlyTokenHoldersCanPropose = 4,
}

/// A module definition. Each module struct consists of Vars and Mappings
/// or/and other modules.
#[odra::module(errors = GovernanceError)]
pub struct OurToken {
    /// A submodule that implements the CEP-18 token standard.
    token: SubModule<Cep18>,
    /// The proposed mint.
    proposed_mint: Var<(Address, U256)>,
    /// The list of votes cast in the current vote.
    votes: List<Ballot>,
    /// Whether a vote is open.
    is_vote_open: Var<bool>,
    /// The time when the vote ends.
    vote_end_time: Var<u64>,
}
/// Module implementation.
///
/// To generate entrypoints,
/// an implementation block must be marked as #[odra::module].
#[odra::module]
impl OurToken {
    /// Initializes the contract with the given metadata and initial supply.
    pub fn init(&mut self, name: String, symbol: String, decimals: u8, initial_supply: U256) {
        // We put the token address as an admin, so it can govern itself. Self-governing token!
        self.token.init(symbol, name, decimals, initial_supply);
    }

    // Delegate all Cep18 functions to the token submodule.
    delegate! {
        to self.token {
            /// Returns the name of the token.
            fn name(&self) -> String;

            /// Returns the symbol of the token.
            fn symbol(&self) -> String;

            /// Returns the number of decimals the token uses.
            fn decimals(&self) -> u8;

            /// Returns the total supply of the token.
            fn total_supply(&self) -> U256;

            /// Returns the balance of the given address.
            fn balance_of(&self, address: &Address) -> U256;

            /// Returns the amount of tokens the owner has allowed the spender to spend.
            fn allowance(&self, owner: &Address, spender: &Address) -> U256;

            /// Approves the spender to spend the given amount of tokens on behalf of the caller.
            fn approve(&mut self, spender: &Address, amount: &U256);

            /// Decreases the allowance of the spender by the given amount.
            fn decrease_allowance(&mut self, spender: &Address, decr_by: &U256);

            /// Increases the allowance of the spender by the given amount.
            fn increase_allowance(&mut self, spender: &Address, inc_by: &U256);

            /// Transfers tokens from the caller to the recipient.
            fn transfer(&mut self, recipient: &Address, amount: &U256);

            /// Transfers tokens from the owner to the recipient using the spender's allowance.
            fn transfer_from(&mut self, owner: &Address, recipient: &Address, amount: &U256);
        }
    }

    /// Burns the given amount of tokens from the given address.
    pub fn burn(&mut self, owner: &Address, amount: &U256) {
        self.token.assert_caller(owner);

        // Burn the tokens.
        self.token.raw_burn(owner, amount);
    }

    /// Proposes a new mint for the contract.
    pub fn propose_new_mint(&mut self, account: Address, amount: U256) {
        // Only allow proposing a new mint if there is no vote in progress.
        if self.is_vote_open.get_or_default() {
            self.env().revert(GovernanceError::VoteAlreadyOpen);
        }

        // Only the token holders can propose a new mint.
        if self.balance_of(&self.env().caller()) == U256::zero() {
            self.env()
                .revert(GovernanceError::OnlyTokenHoldersCanPropose);
        }

        // Set the proposed mint.
        self.proposed_mint.set((account, amount));
        // Open a vote.
        self.is_vote_open.set(true);
        // Set the vote end time to 10 minutes from now.
        self.vote_end_time
            .set(self.env().get_block_time() + 10 * 60 * 1000);
    }

    /// Votes on the proposed mint.
    pub fn vote(&mut self, choice: bool, amount: U256) {
        // Only allow voting if there is a vote in progress.
        self.assert_vote_in_progress();

        let voter = self.env().caller();
        let contract = self.env().self_address();

        // Transfer the voting tokens from the voter to the contract.
        self.token.transfer(&contract, &amount);

        // Add the vote to the list.
        self.votes.push(Ballot {
            voter,
            choice,
            amount,
        });
    }

    /// Count the votes and perform the action
    pub fn tally(&mut self) {
        // Only allow tallying the votes once.
        if !self.is_vote_open.get_or_default() {
            self.env().revert(GovernanceError::NoVoteInProgress);
        }

        // Only allow tallying the votes after the vote has ended.
        let finish_time = self
            .vote_end_time
            .get_or_revert_with(GovernanceError::NoVoteInProgress);
        if self.env().get_block_time() < finish_time {
            self.env().revert(GovernanceError::VoteNotYetEnded);
        }

        // Count the votes
        let mut yes_votes = U256::zero();
        let mut no_votes = U256::zero();

        let contract = self.env().self_address();

        while let Some(vote) = self.votes.pop() {
            if vote.choice {
                yes_votes += vote.amount;
            } else {
                no_votes += vote.amount;
            }

            // Transfer back the voting tokens to the voter.
            self.token
                .raw_transfer(&contract, &vote.voter, &vote.amount);
        }

        // Perform the action if the vote has passed.
        if yes_votes > no_votes {
            let (account, amount) = self
                .proposed_mint
                .get_or_revert_with(GovernanceError::NoVoteInProgress);
            self.token.raw_mint(&account, &amount);
        }

        // Close the vote.
        self.is_vote_open.set(false);
    }

    fn assert_vote_in_progress(&self) {
        if !self.is_vote_open.get_or_default() {
            self.env().revert(GovernanceError::NoVoteInProgress);
        }

        let finish_time = self
            .vote_end_time
            .get_or_revert_with(GovernanceError::NoVoteInProgress);

        if self.env().get_block_time() > finish_time {
            self.env().revert(GovernanceError::VoteEnded);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::Deployer;

    #[test]
    fn it_works() {
        let env = odra_test::env();
        let init_args = OurTokenInitArgs {
            name: "OurToken".to_string(),
            symbol: "OT".to_string(),
            decimals: 0,
            initial_supply: U256::from(1_000u64),
        };

        let mut token = OurToken::deploy(&env, init_args);

        // The deployer, as the only token holder,
        // starts a new voting to mint 1000 tokens to account 1.
        // There is only 1 token holder, so there is one Ballot cast.
        token.propose_new_mint(env.get_account(1), U256::from(2000));
        token.vote(true, U256::from(1000));

        // The tokens should now be staked.
        assert_eq!(token.balance_of(&env.get_account(0)), U256::zero());

        // Wait for the vote to end.
        env.advance_block_time(60 * 11 * 1000);

        // Finish the vote.
        token.tally();

        // The tokens should now be minted.
        assert_eq!(token.balance_of(&env.get_account(1)), U256::from(2000));
        assert_eq!(token.total_supply(), 3000.into());

        // The stake should be returned.
        assert_eq!(token.balance_of(&env.get_account(0)), U256::from(1000));

        // Now account 1 can mint new tokens with their voting power...
        env.set_caller(env.get_account(1));
        token.propose_new_mint(env.get_account(1), U256::from(2000));
        token.vote(true, U256::from(2000));

        // ...Even if the deployer votes against it.
        env.set_caller(env.get_account(0));
        token.vote(false, U256::from(1000));

        env.advance_block_time(60 * 11 * 1000);

        token.tally();

        // The power of community governance!
        assert_eq!(token.balance_of(&env.get_account(1)), U256::from(4000));
    }
}
```
