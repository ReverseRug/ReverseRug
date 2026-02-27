# Security Policy

## Scope
This repository is a public-safe code snapshot. It intentionally excludes runtime secrets and private keys.

## Never commit
- Private key material (JSON, PEM, seed phrases)
- `.env` files with real credentials
- Build artifacts that may include generated keypairs
- Internal infrastructure paths or private endpoints

## Safe setup
1. Copy from `.env.example` files.
2. Inject real secrets only through local env or your secret manager.
3. Keep production signer keys outside the repository.

## Reporting
If you find a security issue, report it privately to the maintainers and avoid opening a public issue with exploit details.
