# Signatures

As each backend can use a different scheme for generating key pairs, 
Odra Framework provides a generic function for signature verification inside the contract context.
Thanks to this, you can write your code once, without worrying about underlying cryptography.

## Signature verification

Signature verification is conducted by a function in `contract_env`:

```rust
pub fn verify_signature(message: &Bytes, signature: &Bytes, public_key: &PublicKey) -> bool;
```

Here's the simplest example of this function used in a contract:

```rust title=examples/src/features/signature_verifier.rs
#[odra::module]
impl SignatureVerifier {
    pub fn verify_signature(
        &self,
        message: &Bytes,
        signature: &Bytes,
        public_key: &PublicKey
    ) -> bool {
        contract_env::verify_signature(message, signature, public_key)
    }
}
```

## Testing
Besides the above function in the contract context, Odra provides corresponding functions in the `test_env`:

```rust
pub fn sign_message(message: &Bytes, address: &Address) -> Bytes;

pub fn public_key(address: &Address) -> PublicKey;
```

`sign_message` will return a signed message. The signing itself will be performed using a private key
of an account behind the `address`.

`public_key` returns the PublicKey of an `address` account.

Thanks to those, you can write generic tests, that will work with all backends, despite differences
in signature schemes they use.

```rust title=examples/src/features/signature_verifier.rs
#[test]
fn signature_verification_works() {
    let message = "Message to be signed";
    let message_bytes = &Bytes::from(message.as_bytes().to_vec());
    let account = test_env::get_account(0);

    let signature = test_env::sign_message(message_bytes, &account);

    let public_key = test_env::public_key(&account);

    let signature_verifier = SignatureVerifierDeployer::default();
    assert!(signature_verifier.verify_signature(message_bytes, &signature, &public_key));
}
```

## ECRecover
[Odra Standard Library](https://github.com/odradev/odra-proposal#odra-standard-library)
part of the original Odra Proposal mentioned ECRecover as one of the functions that will be
implemented by the Odra Framework. We decided to add signatures verification instead.

The reasoning behind this decision is that the ECRecover works only with one type of signature.
Odra tries to be backend-agnostic, which implies that it should also be signature-type-agnostic.
This was possible to achieve when implementing generic signature verification, but not with ECRecover.

In short, the implementation of ECRecover would not depend on the backend, pushing it into some kind of
utils library, and those already exist, for example in 
[solana_program](https://docs.rs/solana-program/latest/solana_program/secp256k1_recover/index.html#)
crate.
