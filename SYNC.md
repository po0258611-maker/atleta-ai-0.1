# ATHLETA AI — GitHub / Google AI Studio Sync

## Canonical source

The canonical development branch is `main`.

Repository: `po0258611-maker/atleta-ai-0.1`

## Safe synchronization procedure

1. Google AI Studio must be connected to this repository.
2. The connected branch must be `main`.
3. Pull/sync from GitHub before starting work when the workspace is stale.
4. Before pushing AI Studio changes, review the changed files and ensure they are based on the current `main`.
5. Do not create a second repository for the same application.
6. Do not use the old `fix/mercadopago-phase-1-security-baseline` branch as the integration source.
7. Never commit secrets, access tokens, private keys, or production credentials.

## Payment configuration

Mercado Pago credentials belong only in the deployment environment/secrets manager:

- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_WEBHOOK_SECRET`
- `MERCADOPAGO_NOTIFICATION_URL`

They must never be placed in source files or `.env` files committed to Git.

## Conflict policy

When Google AI Studio and GitHub contain different versions of the same file, do not blindly overwrite the newer version. Compare the changes, preserve unrelated AI Studio work, and apply only the required integration changes.

## Verification after synchronization

After a successful sync, verify that the workspace contains the current payment implementation and that the project builds/tests successfully before deploying.
