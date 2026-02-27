# Security Policy

## Security Philosophy

ReverseRug is built with a least-privilege, auditable-by-default mindset. The protocol separates critical enforcement (on-chain) from deterministic computation (off-chain), and avoids privileged shortcuts for fund access.

## What We Protect

- User round deposits and settlement integrity
- Claim correctness and replay resistance
- Admin surface minimization
- Operational secrets and signer key hygiene

## Repository Rules

Never commit:

- private key material (JSON, PEM, seed phrases)
- `.env` files with live credentials
- generated deploy keypairs or sensitive build artifacts
- private infrastructure endpoints or host-specific absolute paths

## Operational Guidance

1. Start from `.env.example` templates.
2. Inject secrets via a secret manager, not source control.
3. Keep signer keys outside the repository and enforce strict filesystem permissions.
4. Restrict admin operations to explicit wallet allowlists.

## Vulnerability Reporting

If you discover a security issue, report it privately to maintainers with reproduction details, impact, and affected components. Avoid posting exploit details publicly before remediation.
