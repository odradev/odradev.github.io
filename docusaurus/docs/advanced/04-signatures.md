# Signatures

TODO: Rephrase the following paragraph to be more casperish

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
        self.env().verify_signature(message, signature, public_key)
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
    let env = odra_test::env();
    let message = "Message to be signed";
    let message_bytes = &Bytes::from(message.as_bytes().to_vec());
    let account = env.get_account(0);

    let signature = env.sign_message(message_bytes, &account);

    let public_key = env.public_key(&account);

    let signature_verifier = SignatureVerifierDeployer::init(&env);
    assert!(signature_verifier.verify_signature(message_bytes, &signature, &public_key));
}
```

If you want, you can also test signatures that were created outside Odra.
However, you will need to prepare separate tests for each backend:

```rust title=examples/src/features/signature_verifier.rs
/// The following test checks that the signature verification works with the signature produced
/// by the casper wallet.
#[test]
fn verify_signature_casper_wallet() {
    use odra::casper_types::{bytesrepr::FromBytes, PublicKey};
    // Casper Wallet for the message "Ahoj przygodo!" signed using SECP256K1 key
    // produces the following signature:
    // 1e87e186238fa1df9c222b387a79910388c6ef56285924c7e4f6d7e77ed1d6c61815312cf66a5318db204c693b79e020b1d392dafe8c1b3841e1f6b4c41ca0fa
    // Casper Wallet adds "Casper Message:\n" prefix to the message:
    let message = "Casper Message:\nAhoj przygodo!";
    let message_bytes = Bytes::from(message.as_bytes());

    // Depending on the type of the key, we need to prefix the signature with a tag:
    // 0x01 for ED25519
    // 0x02 for SECP256K1
    let signature_hex = "021e87e186238fa1df9c222b387a79910388c6ef56285924c7e4f6d7e77ed1d6c61815312cf66a5318db204c693b79e020b1d392dafe8c1b3841e1f6b4c41ca0fa";
    let signature: [u8; 65] = hex::decode(signature_hex).unwrap().try_into().unwrap();
    let signature_bytes = Bytes::from(signature.as_slice());

    // Similar to the above, the public key is tagged:
    let public_key_hex = "02036d9b880e44254afaf34330e57703a63aec53b5918d4470059b67a4a906350105";
    let public_key_decoded = hex::decode(public_key_hex).unwrap();
    let (public_key, _) = PublicKey::from_bytes(public_key_decoded.as_slice()).unwrap();

    let signature_verifier = SignatureVerifierDeployer::init(&odra_test::env());
    assert!(signature_verifier.verify_signature(message_bytes, signature_bytes, public_key));
}
```

## ECRecover

TODO: Remove backend-agnostic mention

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
