# ATLETA AI — F1 REMEDIATION AUDIT

Date: 2026-08-29
Base commit: `98426de9c102c60d92c9f1808d45ff42918c5a94`
Branch: `fix/F1-stability-security`

## Scope

F1 addresses application stability, data integrity, authentication/authorization boundaries, diagnostics, subscription authority, client-side fail-closed behavior, configuration safety, CI consistency and documentation.

Real payment gateway implementation is explicitly excluded from F1. Payment creation/status/webhook routes are fail-closed until a later gateway implementation enables them explicitly.

## Corrections applied

- Removed hardcoded Supabase URL/key fallbacks from database diagnostics.
- Protected database status, ping and schema diagnostics with Firebase authentication.
- Restricted integrity inspection to ADMIN.
- Removed anonymous/demo entitlement fallback.
- Changed entitlement backend failures from successful `FREE` responses to `503`.
- Removed client-side subscription migration into Firestore.
- Removed the client Firestore subscription write path from the central data service.
- Made client subscription state fail-closed to FREE when the server authority is unavailable.
- Removed an active Premium subscription default from local client state.
- Made workout log creation/progression updates transactional and idempotent.
- Added progression rebuild after workout deletion.
- Corrected immediate-vs-period-end cancellation semantics.
- Prevented `changePlan` from manufacturing a synthetic paid subscription for FREE transitions.
- Normalized CI to the repository's Bun lockfile.
- Added explicit payment feature gating so unfinished mock providers cannot be mistaken for real payments.
- Added a readiness endpoint and synchronized API/package versioning to 2.6.0.
- Removed the case-variant duplicate `projectmaster.md` that could cause checkout problems on case-insensitive filesystems.
- Synchronized `Project_Master.md` with the corrected architecture.

## Intentionally unchanged

Payment provider internals remain in the repository for the future implementation phase. F1 does not claim them to be real or production-ready.

## Validation

The GitHub Actions pipeline is configured to run typecheck, build and tests on this branch/PR. The authoritative validation result is the CI status attached to the F1 pull request.
