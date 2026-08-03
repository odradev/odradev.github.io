# Signatures

Odra Framework provides a function for easy signature verification inside the contract context and
corresponding functions in the `HostEnv` for testing purposes.

## Signature verification

Signature verification is conducted by a function in contract's `env()`:

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
Besides the above function in the contract context, Odra provides corresponding functions in the `HostEnv`:

```rust
pub fn sign_message(message: &Bytes, address: &Address) -> Bytes;

pub fn public_key(address: &Address) -> PublicKey;
```

`sign_message` will return a signed message. The signing itself will be performed using a private key
of an account behind the `address`.

`public_key` returns the PublicKey of an `address` account.

Here's a complete example of how to test the signature verification
in the contract:
```rust title=examples/src/features/signature_verifier.rs
#[test]
fn signature_verification_works() {
    let test_env = odra_test::env();
    let message = "Message to be signed";
    let message_bytes = Bytes::from(message.as_bytes());
    let account = test_env.get_account(0);

    let signature = test_env.sign_message(&message_bytes, &account);

    let public_key = test_env.public_key(&account);

    let signature_verifier = SignatureVerifier::deploy(&test_env, NoArgs);
    assert!(signature_verifier.verify_signature(&message_bytes, &signature, &public_key));
}
```

If you want, you can also test signatures created outside Odra:

```rust title=examples/src/features/signature_verifier.rs
#[test]
fn verify_signature_casper_wallet() {
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

    let signature_verifier = SignatureVerifier::deploy(&odra_test::env(), NoArgs);
    assert!(signature_verifier.verify_signature(&message_bytes, &signature_bytes, &public_key));
}
```