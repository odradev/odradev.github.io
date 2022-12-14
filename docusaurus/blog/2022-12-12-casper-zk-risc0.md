---
slug: casper-zk-risc0
title: Zero Knowledge on Casper
authors: [zie1ony]
image: https://github.com/odradev.png
---

In this post, I present how to verify a zero knowledge proof on Casper.
<!--truncate-->

## Zero Knowledge
In my opinion, the **zero knowledge** (ZK) is the largest revolution in 
blockchains, since Ethereum introduced Turing-complete, account-based 
smart contracts.
To put it in simple words, ZK enables two use cases not possible before:

1. Computation scaling - I can perform expensive computation off-chain
and put the result on a chain with the proof.
2. Anonymity - I can prove to you, I know something without revealing it. 

## Risc Zero
I'd like to introduce you to [Risc Zero](https://www.risczero.com/).
It is the general purpose zero-knowledge virtual machine.
Go ahead and spend time reading their website!
For us, the key component is the proof verifier that can be compiled into WASM.
Sooo... we can run it on Casper :)
Yes! We can prove any program, produce proof, and send it to Casper's
smart contract for verification.

## Example

Let's dive into the example to see how it works.
[The full example code](https://github.com/odradev/casper-zk-with-risc0)
you can find on our GitHub. 
It is based on Risc Zero's [Hello, Multiply!](https://www.risczero.com/docs/examples/hello_multiply)
example. So make sure you understand it first.
[Guest](#guest) and [Prover](#prover) sections are taken from this example.

### Guest

The program we are proving is called a **guest** in Risc Zero.
Our goal is to prove we know the factors of an arbitrary number.
Given `a` and `b` below guest program computes `a * b` and produces
a proof of computation.

```rust title="methods/guest/src/multiply.rs"
pub fn main() {
    // Load the first number from the host
    let a: u64 = env::read();
    // Load the second number from the host
    let b: u64 = env::read();
    // Verify that neither of them are 1 (i.e. nontrivial factors)
    if a == 1 || b == 1 {
        panic!("Trivial factors")
    }
    // Compute the product while being careful with integer overflow
    let product = a.checked_mul(b).expect("Integer overflow");
    env::commit(&product);
}
```

### Prover

It's time to run the guest program and build the proof for 
a specific `a` and `b` values.

```rust title="prover/src/main.rs"
fn main() {
    // Pick two numbers.
    let a: u64 = 17;
    let b: u64 = 23;

    // First, we make the prover, loading the 'multiply' method.
    let multiply_src = std::fs::read(MULTIPLY_PATH)
        .expect("Method code should be present at the specified path.");
    let mut prover = Prover::new(&multiply_src, MULTIPLY_ID)
        .expect("Prover should be constructed.",);

    // Next we send a & b to the guest.
    prover.add_input_u32_slice(to_vec(&a).unwrap().as_slice());
    prover.add_input_u32_slice(to_vec(&b).unwrap().as_slice());
    
    // Run prover & generate receipt
    let receipt = prover.run()
        .expect("Valid code should be provable.");

    // Extract journal of receipt (i.e. output c, where c = a * b)
    let c: u64 = from_slice(&receipt.journal)
        .expect("Journal output should deserialize.");

    // Print an assertion
    println!("I know the factors of {}, and I can prove it!", c);

    // Verify receipt, panic if it's wrong.
    receipt.verify(MULTIPLY_ID).expect(
        "Code you have proven should successfully verify.",
    );

    // Convert journal to string and store on disk.
    let journal = serde_json::to_string(&receipt.journal).unwrap();
    write_to_file("../data/journal", &journal);

    // Convert seal to string and store on disk.
    let seal = serde_json::to_string(&receipt.seal).unwrap();
    write_to_file("../data/seal", &seal);

    // Convert method_id to string and store on disk.
    let result = serde_json::to_string(MULTIPLY_ID).unwrap();
    write_to_file("../data/method", &result);
}
```

### Verifier

Now the verification step.
Given the proof (journal + seal) and the guest program definition (method),
Casper's smart contract checks its correctness. This one is written
just for the demonstration, but in general you want `METHOD_ID` to be
stored in your contract and both `SEAL` and `JOURNAL` to be passed to
the contract via arguments from the outside.

```rust title="verifier/src/verifier_contract.rs"
// Import the proof and the method.
const METHOD_ID: &[u8] = &include!("../../data/method");
const SEAL: &[u32] = &include!("../../data/seal");
const JOURNAL: &[u32] = &include!("../../data/journal");

// Verifier contract holds a result of the zk verification. 
#[odra::module]
pub struct Verifier {
    result: Variable<String>,
}

#[odra::module]
impl Verifier {
    // Calling this entry point triggers the zk proof verification.
    pub fn verify(&mut self) {
        let result = verify(JOURNAL, SEAL, METHOD_ID);
        self.result.set(result);
    }

    // Result getter.
    pub fn result(&self) -> String {
        self.result.get().unwrap_or(String::from("Not processed"))
    }
}

// The verification method. It constructs new Receipt and verifies it.
fn verify(journal: &[u32], seal: &[u32], method_id: &[u8]) -> String {
    let result = Receipt::new(&journal, &seal).verify(method_id);

    match result {
        Ok(()) => String::from("Ok"),
        Err(err) => format!("Error: {}", err.to_string())
    }
}
```

There is one more thing. After the compilation, the WASM file contains 
floating-point arithmetic opcodes. Unfortunately, Casper's WASM VM doesn't
support that. To overcome that I used
[wasm-float-transpiler](https://github.com/chipshort/wasm-float-transpiler).
It converts a wasm file with floating point instructions (f32, f64) to one 
without such instructions.
The instructions are replaced with deterministic software implementations
of these instructions.

### Livenet results
I have deployed it to the testnet and called the `verify` method.
The `result` was `Ok`. Wow, first-ever ZK proof verification on Casper.
Trustless bridging, layer 2 here we come :)

The cost of running the `verify` method is `2324 CSPR`. That's a lot, but
we have to start somewhere.

## What next
I think it is a good place to outline Casper ZK goals for moving this forward.
The community should discuss: 
1. Building more examples. Risc Zero has a nice battleship game to port over
to Casper.
2. Rethink including floating-point arithmetic. The argument for not having
those, was always non-determinism, but there are
[other voices](https://medium.com/haderech-dev/determinism-wasm-40e0a03a9b45).
3. Adding Risc Zero verification method to Casper's FFI.
4. Supporting Risc Zero team. We should help develop this awesome
open-source project and gain the ZK expertise.

## Join us

Interested in zero knowledge on Casper?

Join [our Discord][odra-discord], [our Twitter][odra-twitter] or write us
at contact@odra.dev.

[odra-discord]:    https://discord.gg/Mm5ABc9P8k
[odra-twitter]:    https://twitter.com/odradev