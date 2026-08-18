# Multiwing AWS Migration — Independent Architecture Review Brief

## Review Objective

Evaluate the safest, most reversible migration of the existing Multiwing client portal from Manus-managed hosting to a fully Faderlabs-controlled AWS environment. The portal contains months of client work, including project metadata, comments, approvals, client contact information, email analytics, shared-access records, audio, video, documents, thumbnails, and generated media proxies. The migration must preserve data integrity, protect client media, avoid disruption to the live portal, and support an explicit rollback path.

## Current Application Surface

The portal is a React 19, Express 4, tRPC 11, Drizzle ORM, and MySQL application. It currently operates at `multiwing.faderlabs.ai` and includes a private client content hub, an administrator interface, audio track reviews, video and audio deliverable playback, timestamped comments, client approvals, downloadable files, project requests with uploads, share links, email OTP verification for guests, email tracking, and a six-hour activity digest.

The existing data model includes users, client/admin sessions, projects, deliverables, sonic-branding pillars and tracks, comments, approvals, project contacts, email logs/events, client project requests, share links, OTPs, guest sessions, editable site settings, and activity logs. Existing media includes audio, large video source files, browser-playable proxy media, documents, and image thumbnails.

## Existing Dependencies and Risks

The portal currently retains Manus-era database, storage, OAuth, and notification helpers. Its active client access uses a shared portal password plus an administrator email/password; guests use emailed OTPs and scoped temporary share sessions. Current emails use Gmail SMTP. Media uploads use an existing AWS S3 bucket with application-held credentials and several direct public-object URLs. A MediaConvert-based workflow creates browser proxies and posts completion back to an application webhook. A `node-cron` job inside the app sends activity digests every six hours in the America/New_York timezone.

The migration must also correct known weaknesses: public media delivery, application-held long-lived AWS credentials, mixed direct and presigned media URLs, legacy OAuth code, Gmail SMTP dependence, in-process scheduling, incomplete test isolation, and schema/test drift.

## Proposed Baseline Architecture

Use an isolated Multiwing AWS stack in the same AWS account but separate from Faderlabs: a distinct VPC, RDS MySQL database, S3 media bucket, CloudFront distribution, Secrets Manager secret, Cognito user pool or equivalent identity system, API Gateway and Lambda/Express adapter, Amazon SES for transactional mail, EventBridge Scheduler for digests, MediaConvert plus event notifications for proxy media, and GitHub OIDC with a separate least-privilege deployment role.

No production DNS change should occur until a parallel AWS staging environment passes data reconciliation, media sampling, client-share/OTP tests, email tests, scheduled-digest tests, MediaConvert tests, security review, and a written rollback rehearsal. The existing portal should stay live and read/write during initial staging work. A final data-freeze or delta-sync strategy is required before DNS cutover.

## Decisions Requiring Review

1. Should the shared portal password be retained temporarily, or should the migration adopt individual client identities and OTP-based guest access before cutover?
2. What is the safest approach for media migration and delivery: private S3 plus signed CloudFront URLs/cookies, application-generated presigned URLs, or a hybrid?
3. What is the recommended data migration pattern for a live portal: initial export/import followed by a maintenance window and final delta reconciliation, or another approach?
4. How should the MediaConvert callback and scheduling be designed to avoid dependency on an always-running server process?
5. What explicit pre-cutover acceptance tests, rollback triggers, and backup retention controls are required?
6. Which steps should be deferred to a later hardening release to reduce cutover risk without accepting unacceptable security exposure?

## Required Response Format

Return a concise but rigorous architecture critique that includes: a recommended target architecture; highest-priority migration risks; a phased, reversible migration sequence; authentication recommendation; media-storage/delivery recommendation; data-integrity controls; test and rollback gates; major disagreements with the proposed baseline; and a list of non-negotiable requirements before the DNS cutover. Do not assume access to sensitive client data or credentials.
