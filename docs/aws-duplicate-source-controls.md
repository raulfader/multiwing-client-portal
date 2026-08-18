# Multiwing AWS Duplicate — Immutable Source Controls

## Decision

The Manus-hosted Multiwing Client Portal remains the live production source of truth throughout the duplication project. The AWS environment is a separate copy for validation only. No DNS record, client URL, Manus database row, Manus-hosted media object, production email destination, or live authentication setting may be changed as part of the duplication work.

## Allowed and Prohibited Actions

| Category | Allowed during duplication | Prohibited during duplication |
|---|---|---|
| Source database | Read-only export through a narrowly scoped, documented credential; counts and checksums | `INSERT`, `UPDATE`, `DELETE`, schema changes, seed writes, or any configuration change |
| Source media | Read object/list metadata and copy bytes into a separate AWS S3 bucket | Delete, overwrite, move, rename, re-encode in place, or alter ACLs/lifecycle rules |
| AWS duplicate | Create separate VPC, database, private media bucket, service roles, secrets, and staging host | Point `multiwing.faderlabs.ai` to the duplicate or reuse the production database/bucket |
| Client communications | Internal owner-only test email route, explicitly enabled after staging validation | Send portal notifications, digests, shares, OTPs, or password emails to existing clients |
| Authentication | Reproduce access logic in an isolated test environment | Replace the existing live portal password/session/guest-link behavior |

## Required Evidence Before and After Copy

Before every database or media copy, generate a time-stamped source manifest with table row counts, aggregate object count, aggregate stored bytes, and a list of immutable source identifiers. After each copy, generate the equivalent AWS manifest and compare counts, byte totals, and deterministic checksums where available. Any mismatch blocks acceptance and does not trigger a source-side retry or mutation.

## Rollback Model

The AWS duplicate can be destroyed, redeployed, or restored from an AWS snapshot without affecting Manus. If a copy process fails, the recovery action is to discard or rebuild only the AWS destination. The Manus source remains unchanged and continues serving users throughout the project.

## Explicit Cutover Gate

No DNS, client, email, or authentication cutover can occur until the owner reviews: (1) the pre-copy and post-copy reconciliation reports, (2) media playback and share-link staging tests, (3) data-integrity checks, (4) rollback evidence, and (5) a separate written production-cutover plan. This document does not authorize a cutover.
