# Multiwing AWS Staging Foundation: Source Inventory and Rollback Runbook

**Scope:** This document authorizes discovery and empty staging infrastructure only. It does not authorize a production data export, media copy, DNS change, client communication, or alteration to the live Multiwing portal.

## Source Inventory

The current Multiwing portal has three information classes that must remain linked through a future migration: relational application data, client media objects, and time-limited access state.

| Information class | Current records to account for | Future migration control |
|---|---|---|
| Identity and portal access | `users`, `custom_sessions` | Preserve administrator/client compatibility at cutover; rotate all session tokens rather than treating them as permanent. |
| Creative projects and review history | `projects`, `deliverables`, `pillars`, `tracks`, `comments`, `deliverable_comments`, `approvals`, `track_approvals`, `activity_log` | Preserve identifiers and referential relationships; reconcile row counts and content hashes where appropriate. |
| Client contact and email evidence | `project_contacts`, `email_log`, `email_events`, `client_project_requests` | Preserve history while replacing Gmail SMTP with SES in staging. |
| Guest access and sharing | `project_shares`, `share_otps`, `share_sessions` | Treat unexpired guest sessions and OTPs as explicitly migrated, deliberately expired, or reissued during a final maintenance window. |
| Editable settings | `site_settings` | Export as part of the relational snapshot and reconcile key/value counts. |
| Media and document objects | audio source files, video source files, generated proxy video, documents, upload attachments, and image thumbnails referenced by object keys or URLs | Create a source manifest containing key, size, content type, ETag/checksum where available, and owning record identifier before any copy. |

## Current Compatibility Boundaries

The live portal uses an environment-backed shared client password, an administrator email/password, database-backed 30-day portal sessions, and separate guest-share OTP/session flows. The staging migration will preserve the client-facing behavior initially, but no legacy shared password or session token will be copied into the target without explicit cutover controls.

Current mail is sent through Gmail SMTP. Current storage code also includes Manus storage helpers, while parts of the portal use direct AWS S3 URLs and presigned links. Both patterns must be replaced in the AWS staging application by private S3 access and SES; no production data or media will be moved until this replacement passes synthetic acceptance tests.

The digest currently runs on a six-hour in-process cron schedule. The staging design will replace it with a managed schedule and a database-backed idempotency record, preventing missed or duplicate digest windows during a later parallel-run period.

## Read-Only Baseline Evidence to Capture Before Data Migration

The following evidence will be created only after a later, explicit approval for data-migration preparation. It is listed now to make the approval boundary clear.

| Evidence | Purpose | Acceptance condition |
|---|---|---|
| Database schema export and migration history | Detect source/target schema drift | Reviewed before first import. |
| Per-table record-count report | Detect omissions in initial and final imports | Counts reconcile exactly or every exception is documented. |
| Media object manifest | Detect missing, incorrectly named, or altered client media | Every expected source key has a target counterpart before cutover. |
| Relationship integrity report | Detect orphaned comments, approvals, shares, contacts, and deliverables | No unexpected orphaned foreign references. |
| Entry-flow checklist | Test client login, admin login, guest invitation, OTP, share revocation, comments, approvals, upload, download, email, and digest behavior | All critical flows pass against the isolated staging environment. |

## Rollback Authority and Rules

Before any production cutover, the Faderlabs owner must approve a written maintenance window and name the person authorized to make the DNS change or reverse it. DNS remains unchanged until all final reconciliation gates have passed.

Rollback is safe only before the AWS environment accepts any new authoritative write after the DNS change. During that brief validation window, a failed critical health check permits a manual DNS reversal to the legacy portal. Once the AWS environment begins accepting authoritative comments, approvals, uploads, or requests, an automatic DNS reversal can create split-brain data. At that point, the response changes from rollback to controlled forward repair.

| Trigger | Action | Data-safety rule |
|---|---|---|
| Missing or inaccessible client media before accepting writes | Keep legacy portal authoritative; do not change DNS | No AWS-side client write is accepted. |
| Client/admin/guest authentication failure in final validation | Keep legacy portal authoritative; correct staging | No DNS change until flow passes. |
| Final reconciliation discrepancy | Stop cutover; document and resolve exception | No production write freeze begins. |
| Failure after DNS change but before accepting AWS writes | Manually reverse DNS under approved authority | Verify legacy portal is still authoritative before reversal. |
| Failure after AWS accepts new authoritative writes | Preserve AWS as the write source; perform forward repair | Do not reverse DNS without a documented data-forwarding plan. |

## Staging Foundation Acceptance Gate

The next implementation phase is limited to an **empty** Multiwing AWS staging foundation: separate network boundary, empty RDS instance, private empty S3 bucket, CloudFront configuration, secrets, event-scheduling scaffold, media-processing roles, and GitHub OIDC deployment access. Completion of this phase does not grant permission to export client data, copy media, change `multiwing.faderlabs.ai`, or notify clients.
