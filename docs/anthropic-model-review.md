# Multiwing AWS Migration — Independent Architecture Review

---

## Recommendation

Adopt the proposed isolated AWS stack with the following material changes: **defer Cognito** in favor of a lightweight JWT/OTP-first identity model, **enforce CloudFront signed cookies** as the sole media delivery path from day one, and **never cut DNS until a live delta-sync rehearsal completes cleanly under production load**. The architecture is sound in intent but underspecifies the rollback path, conflates hardening work with migration work in ways that increase cutover risk, and leaves media delivery security ambiguous at a point where a misconfiguration would expose all client content publicly.

The recommended stack: isolated VPC → RDS MySQL (Multi-AZ, encrypted at rest) → S3 private bucket (no public ACLs, no bucket policy public grants) → CloudFront with signed cookies and an Origin Access Control (OAC) → Lambda-based Express adapter behind API Gateway HTTP API → Secrets Manager for all credentials → SES for transactional mail → EventBridge Scheduler for digests → MediaConvert with EventBridge completion notifications posting to an API Gateway webhook endpoint → GitHub OIDC least-privilege deployment role. No application process holds long-lived AWS credentials at runtime. No media object is publicly addressable.

---

## Highest Risks

**1. Public media exposure during migration.** The existing setup mixes direct public S3 URLs with presigned URLs. If the new CloudFront distribution is stood up before OAC is correctly enforced and all old public object URLs are invalidated, client audio, video, and documents remain publicly accessible by anyone with the original URL. This is the single highest-severity risk.

**2. Silent data drift between export and cutover.** A live portal continues accepting writes after the initial export. Without a rigorous delta-sync and a row-count/checksum reconciliation gate, approvals, comments, and OTPs written between export and DNS flip will be silently lost. Clients will not know their approval was dropped.

**3. MediaConvert callback to a non-existent or wrong endpoint.** The existing webhook is tied to the current application host. During staging, if MediaConvert jobs are triggered, completion events may post to the wrong environment, corrupt the proxy media record, or silently fail. This must be environment-scoped before any MediaConvert test runs.

**4. OTP and guest session invalidation at cutover.** Email OTPs and guest sessions stored in the old database will not exist in the new database unless explicitly migrated. A client receiving an OTP email during the maintenance window and clicking it post-cutover will receive a hard authentication failure. This is a direct client-facing disruption.

**5. In-process cron carrying state across environments.** If the old cron job and the new EventBridge Scheduler are both active during a parallel-run period, digest emails will be sent twice. Conversely, if the scheduler is not seeded with the correct last-run timestamp, the first post-cutover digest may cover an incorrect time window.

**6. Secrets Manager bootstrapping gap.** The application must retrieve credentials from Secrets Manager before it can connect to RDS or S3. If the Lambda execution role is misconfigured or the secret ARN is wrong, the application fails silently at cold start with no fallback. This must be tested under cold-start conditions, not just warm.

**7. Schema drift between ORM and actual RDS state.** Drizzle migrations applied to the staging RDS must be reconciled against the production schema before export. Any divergence means either a failed import or silent column truncation.

---

## Reversible Sequence

Each phase is independently reversible to the prior phase. DNS is never touched until Phase 5.

**Phase 0 — Baseline Freeze (no AWS work)**
- Capture a full production schema dump and a representative media manifest (S3 object keys, sizes, ETags).
- Document every direct public media URL in the application codebase and templates.
- Record current Drizzle migration history; resolve any schema/test drift.
- Write a rollback runbook: what constitutes a trigger, who has authority to call it, and what the exact revert steps are. This document must exist before Phase 1 begins.
- Gate: rollback runbook signed off by Faderlabs technical lead.

**Phase 1 — AWS Infrastructure Provisioning (no data, no traffic)**
- Create isolated VPC, subnets, security groups, RDS MySQL (Multi-AZ), S3 private bucket, CloudFront distribution with OAC (Origin Access Control) and signed cookies enforced at the distribution level, Secrets Manager secrets, SES domain verification and DKIM, EventBridge Scheduler, API Gateway HTTP API, Lambda function (cold-start tested), MediaConvert IAM role scoped to the Multiwing S3 bucket only, GitHub OIDC deployment role.
- Confirm: no public S3 bucket policy, no public ACLs, bucket-level Block Public Access enabled, CloudFront OAC is the only authorized S3 reader.
- Gate: AWS Config rules passing, IAM Access Analyzer showing no unintended public resource exposure, CloudFront returning 403 for a direct S3 URL that bypasses the distribution.

**Phase 2 — Application Staging (no production data, synthetic data only)**
- Deploy the Express/Lambda adapter with all Manus-era helpers replaced (no legacy OAuth code, no Gmail SMTP, no application-held long-lived credentials).
- Run the full Drizzle migration sequence against the staging RDS.
- Seed synthetic data covering every entity type in the data model.
- Test every media upload path, every OTP flow, every share link, every approval, every comment, the six-hour digest via EventBridge (manually triggered), and a MediaConvert proxy creation with the new EventBridge completion webhook.
- Gate: all synthetic-data acceptance tests pass; no CloudWatch errors at cold start; no media accessible via direct S3 URL; signed cookie flow verified end-to-end.

**Phase 3 — Production Data Import (live portal remains authoritative)**
- Export production MySQL to a dump file; transfer via encrypted channel; import to staging RDS.
- Copy all S3 media objects using `aws s3 sync` with `--sse aws:kms` and server-side checksum verification (ETag comparison, or S3 Batch Operations with checksum). Do not delete source objects.
- Run row-count and checksum reconciliation across all tables; run media object count and size reconciliation.
- Replace all direct public media URLs in the imported data with CloudFront signed-cookie-compatible paths. Audit for any hardcoded S3 URLs remaining in the application layer.
- Gate: zero row-count discrepancies; zero media objects missing; zero direct S3 URLs reachable for any migrated object; staging application serving all imported client media correctly via signed cookies.

**Phase 4 — Parallel Run and Delta-Sync Rehearsal (live portal still authoritative)**
- Keep the production portal fully operational on Manus hosting.
- Perform at least two full delta-sync rehearsals: export only rows modified after a known timestamp (using `updated_at` or binlog if available), import into staging, reconcile again.
- Rehearse the maintenance-window procedure: how long does the delta take, is it within the acceptable downtime window, what is the exact sequence of steps.
- Disable the production cron job one cycle early and confirm the EventBridge Scheduler fires correctly and does not double-send.
- Gate: delta-sync rehearsal completes in under the agreed maintenance window; no double-digest emails; OTPs created in the delta window are importable and functional.

**Phase 5 — Cutover (maintenance window, reversible until DNS TTL expires)**
- Lower DNS TTL to 60 seconds at least 48 hours before the
