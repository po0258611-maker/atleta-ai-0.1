# Google AI Studio ↔ GitHub — ATHLETA AI

## Fonte única do projeto

Use exclusivamente:

- Repository: `po0258611-maker/atleta-ai-0.1`
- Branch: `main`

Do not use the legacy payment fix branch as the AI Studio integration branch.

## When AI Studio does not show GitHub changes

1. Save any work currently open in AI Studio.
2. Open the project's GitHub settings.
3. Confirm the repository is exactly `po0258611-maker/atleta-ai-0.1`.
4. Confirm the branch is exactly `main`.
5. Refresh/reconnect the GitHub integration if the workspace is stale.
6. Pull/sync the current GitHub state into the existing AI Studio workspace.
7. Do not create a new repository or a parallel branch for the same application.

## When AI Studio has newer changes

Before pushing:

1. Sync/pull the current `main`.
2. Review the diff.
3. Keep unrelated AI Studio changes.
4. Resolve only actual conflicts.
5. Push to `main` only after build/tests succeed.

## Safety

Never put these values in source code:

- Mercado Pago Access Token
- Mercado Pago Webhook Secret
- Firebase private credentials
- API keys or other production secrets

Use the deployment environment/secrets manager instead.

## Expected architecture

`main` is the shared source of truth. AI Studio is an editor/workspace connected to that source; it is not a separate copy of the application.
