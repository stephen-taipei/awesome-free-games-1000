# Security

This is a static browser-game collection. There is no configured account system or backend in this repository. Do not put private keys, service-account credentials, access tokens, or server secrets in source files or Vite environment variables: client-side values are public.

Dependency audits include development/build tools. A package advisory is not evidence that deployed games have been compromised. CI fails on high/critical dependency findings and verifies the actual production output.

Report reproducible security issues privately through the maintainer's GitHub contact channel or GitHub private vulnerability reporting when enabled. Do not publish credentials or exploitation details in a public issue. No response-time commitment or private reporting configuration is implied by this document.

The optional GA4 module is disabled unless explicitly initialized with a valid measurement ID. Deployers are responsible for their privacy disclosures and consent mechanism. Browser storage may be unavailable or tampered with; treat values as untrusted and retain safe fallbacks.

There is no LICENSE file granting general reuse permissions. Security hardening does not establish an open-source license.
