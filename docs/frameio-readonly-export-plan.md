# Frame.io Read-Only Export Plan

## Decision Record

The completed browser-only mapping established a one-to-one correspondence between the 19 approved legacy portal references and visible Frame.io share metadata. The record is sufficient to identify the migration allowlist, but it does not authorize media access or prove a programmatic download path.

OpenAI and Grok independently selected a **temporary read-only credential** plus a single audited export run. Claude could not provide a response because the configured service returned a permissions error through both supported client paths. Under the owner's stated majority rule, the decision is to prepare—not yet execute—a temporary read-only credential approach. This decision is constrained by the official provider documentation below, which supersedes any assumptions in the board prompt.

## Provider Constraints

Frame.io's current V4 API uses Adobe IMS OAuth 2.0. V4 authorization derives from the user's Frame.io roles and permissions; documented OAuth scopes are static rather than project-specific. User access tokens are short-lived, typically about one hour. [1] [2]

> The export process must therefore be **allowlist-enforced in our code**. It must never interpret an OAuth scope or a Frame.io role as permission to traverse, copy, or alter anything outside the 19 approved mappings.

Frame.io documents a legacy `Get an Asset` endpoint that accepts a developer token and returns an `original` download URL where the authenticated user may download the asset. The developer portal also states that V2 endpoints are scheduled for removal on 2026-12-01. [3] [4] A legacy developer token is transitional, does not expire automatically, and must carry the documented legacy-token header when used with V4; it therefore must be revoked by the owner immediately after a successful or failed one-time run. [1]

| Item | Required control |
|---|---|
| Credential | Prefer a one-time Adobe IMS user access token **without** a refresh token where the account supports V4 OAuth. If only a legacy developer token is available, the owner must revoke it immediately after the run. |
| Authorization | The owner must use an existing Frame.io identity with download permission. No new share, role, project, workspace, or archive permission may be created or changed. |
| API surface | Permit only documented `GET` operations needed to resolve the 19 already-mapped records and obtain each provider-issued download URL. No POST, PUT, PATCH, DELETE, copy, move, upload, share, comment, webhook, or permission endpoint is permitted. |
| Allowlist | Code must contain exactly the 19 verified mapping identifiers, enforce a maximum of 19 destination objects, reject duplicates and unexpected resource IDs, and fail closed on ambiguity. |
| Download | Use only provider-returned URLs; do not construct URLs. Stream one object at a time directly into private versioned S3 storage. |
| Verification | Record source metadata permitted by the provider, destination S3 version ID, byte count, SHA-256 digest, timestamp, and allowlist ID. Stop on the first mismatch. |
| Source protection | Never change Frame.io share settings, archive assets, metadata, folder structure, roles, public links, or client access. The owner-created test share remains excluded. |
| Duplicate protection | Rewrite only the 19 corresponding isolated staging references after each destination object is verified. Keep live Manus portal data and outbound email behavior unchanged. |

## Fail-Closed Execution Gates

The export cannot start until all of the following are true:

1. The owner explicitly authorizes a one-time read-only preflight and export.
2. The account's supported authentication mode is confirmed in the owner-controlled browser: V4 OAuth when available, otherwise a revocable legacy developer token.
3. The preflight resolves every mapped share to exactly one provider resource using documented read-only calls. A missing, ambiguous, inaccessible, or non-downloadable resource stops the run.
4. The credential is stored only in a protected secret input and never sent in chat, source control, logs, manifests, or browser screenshots.
5. An immutable audit destination and the private isolated S3 destination are confirmed before the first byte transfer.

No source operation will be performed while any gate is incomplete. The separate OneDrive links remain deferred because the owner does not have provider access.

## 2026-08-19 Credential Decision

After the owner requested a second board review of the exact choice between creating a temporary legacy developer token and deferring, OpenAI and Grok both selected **DEFER**. Claude again did not provide a vote because its request failed with an HTTP authorization error. The coordinating agent also selects **DEFER** because the owner's requirement for four-way alignment has not been satisfied and the source archive does not require an urgent change.

Accordingly, no legacy token, OAuth app, secret, preflight request, download, or export workflow will be created or run. The 19 mapped Frame.io references and the two inaccessible OneDrive links remain deferred. Reopening the export decision requires a new unanimous review after Claude access is restored and a fresh owner authorization.

## 2026-08-19 Unanimous Review Confirmation

Claude's direct API Messages endpoint continued to return an organization-level permission denial even after a new Default-workspace key was created and secured. A read-only models validation succeeded only through an isolated protected variable; it did not grant message-generation permission. With the owner's explicit authorization, Claude's independent vote was therefore obtained through the signed-in Claude Console Playground using Sonnet 5.

Claude selected **DEFER**, stating that the AWS duplicate already holds the approved data and the remaining 19 non-urgent Frame.io bytes do not justify creating a new temporary or persistent credential. This matches the OpenAI, Grok, and coordinating-agent votes. The result is a unanimous four-way decision to retain deferral and make no Frame.io credential or source-archive change.

## Standing Technical Decision Protocol

The owner has instructed that future technical migration choices be decided through unanimous agreement among ChatGPT, Grok, Claude, and the coordinating agent. Where consensus supports a safe direction, the work may proceed without requiring the owner to make a technical judgment. This protocol does not override explicit owner authorization requirements for credentials, paid actions, destructive operations, or other externally consequential actions.

## 2026-08-19 Direct Claude Access Restored

A subsequent minimal direct Messages API check using the isolated protected key and the Console-listed `claude-opus-5` model returned HTTP 200. Claude can therefore participate in future board reviews directly without using the Console Playground. This restores the review pathway only; it does not change the unanimous decision to defer Frame.io credentials, exports, or source-archive changes.

## References

[1]: https://next.developer.frame.io/platform/docs/guides/authentication/overview "Frame.io V4 Authentication"
[2]: https://next.developer.frame.io/platform/docs/getting-started "Frame.io V4 Getting Started"
[3]: https://developer.frame.io/api/reference/operation/getAsset "Frame.io V2 Get an Asset"
[4]: https://developer.frame.io/ "Frame.io Developer Site"
