# Multi-Wing Content Hub MCP server

An [MCP](https://modelcontextprotocol.io) server that lets the Faderlabs team operate the Multi-Wing client
content hub (`multiwing.faderlabs.ai`) from any MCP client (Grok Bot, Claude, Cursor, …) instead of only the
web UI: triage and answer client review comments, upload and download project files, track review status,
create projects, notify clients when work is finished, manage guest shares, client requests and the
sonic-branding proposal.

It exposes **70 tools** (30 read-only). Every tool calls the portal's existing tRPC API.

## How it works

```
MCP client ──stdio──▶ multiwing-mcp ──HTTPS /api/trpc (x-session-token)──▶ portal backend ──▶ MySQL / S3 / SMTP
```

- **Same backend as the web app.** Tools call the same `appRouter` procedures the admin UI uses
  (`server/routers.ts`). There's no second backend and no direct database access. Team members' machines never
  hold database, AWS or SMTP credentials.
- **Same auth model.** The portal authenticates with DB-backed session tokens sent in the `x-session-token`
  header (`server/_core/context.ts`). The MCP server either uses an existing admin session token or calls
  `auth.adminLogin` with the admin credentials. If a session expires mid-run, it logs in again once. When it
  exits, it logs out any session it created.
- **Type-safe against the backend.** The client is typed with `import type { AppRouter } from "../../server/routers"`,
  so `pnpm check` fails if a backend procedure changes shape.
- **Files move over presigned S3 URLs**, exactly like the browser uploader. They stream from and to local
  disk, so there's no size limit and no base64.

## Setup

Requires Node.js 20+ and pnpm.

```bash
cd mcp-server
pnpm install
pnpm build          # -> dist/index.js
```

Quick start-up check (logs the tool count, portal URL and auth mode to stderr, then exits when stdin closes):

```bash
MULTIWING_API_URL=https://multiwing.faderlabs.ai \
MULTIWING_SESSION_TOKEN=... \
node dist/index.js < /dev/null
```

To try tools interactively, run `pnpm inspect`, which opens the MCP Inspector.

## Environment variables

Only variable names are documented here. Put values in your MCP client's `env` block or your shell, never in git.
[`.env.example`](.env.example) lists them all.

| Variable | Required | Description |
| --- | --- | --- |
| `MULTIWING_API_URL` | yes (defaults to `http://localhost:3000`) | Portal origin serving `/api/trpc`, e.g. `https://multiwing.faderlabs.ai` or a local/staging portal. |
| `MULTIWING_SESSION_TOKEN` | one of the two auth options | An existing **admin** session token. Log in at `/admin`, then copy `portal_session_token` from the browser's localStorage. Valid 30 days. |
| `MULTIWING_ADMIN_EMAIL` + `MULTIWING_ADMIN_PASSWORD` | one of the two auth options | The portal admin login (the server's `ADMIN_EMAIL` / `ADMIN_PASSWORD`). The MCP server logs in on first use and logs out on exit. |
| `MULTIWING_PUBLIC_URL` | no | Origin used in client-facing links (share invites, `portalUrl`). Defaults to `MULTIWING_API_URL`. |
| `MULTIWING_MCP_READ_ONLY` | no | `true` registers only the 30 read-only tools. Recommended for people who only need to look things up. |
| `MULTIWING_TEAM_NAME` | no | Commenter name for comments posted with `add_comment`. Default `Faderlabs`. |
| `MULTIWING_DOWNLOAD_DIR` | no | Default folder for downloads. Default `~/Downloads/multiwing`. |
| `MULTIWING_FILE_ROOTS` | no | Directories separated by `:` (`;` on Windows). When set, uploads may only read from, and downloads may only write to, these folders. Recommended so an agent can't upload arbitrary local files. |
| `MULTIWING_REQUEST_TIMEOUT_MS` | no | Portal API timeout. Default `60000`. |

Session tokens and the admin password grant full admin access to client data. Treat them like the admin
password: keep them out of repos, chats and screenshots, and prefer a session token you can let expire.

## Connecting an MCP client

Any MCP client that launches **stdio** servers works. Most clients use the common `mcpServers` JSON shape.
Use an absolute path to `dist/index.js`:

```json
{
  "mcpServers": {
    "multiwing": {
      "command": "node",
      "args": ["/absolute/path/to/multiwing-client-portal/mcp-server/dist/index.js"],
      "env": {
        "MULTIWING_API_URL": "https://multiwing.faderlabs.ai",
        "MULTIWING_SESSION_TOKEN": "<admin session token>",
        "MULTIWING_FILE_ROOTS": "/Users/you/Projects/multiwing"
      }
    }
  }
}
```

- **Grok Bot / other agents:** register the command above as a stdio MCP server in the bot's MCP settings,
  with the same `command`, `args` and `env`.
- **Cursor:** add the block to `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global).
- **Claude Desktop:** add it to `claude_desktop_config.json`.
- **Claude Code:** `claude mcp add multiwing --env MULTIWING_API_URL=... --env MULTIWING_SESSION_TOKEN=... -- node /abs/path/mcp-server/dist/index.js`

To skip the build step, use `"command": "npx", "args": ["tsx", "/abs/path/mcp-server/src/index.ts"]`.

After connecting, ask the agent to run `whoami`. It should report `"ok": true` with `session.role` `admin`.

## Safety rails

- Destructive tools (`delete_*`, `remove_project_contact`) require `confirm: true`. Tools carry MCP
  `readOnlyHint`/`destructiveHint` annotations so clients can ask before running them.
- `notify_project_finished` supports `dryRun: true`, which previews recipients, subject and copy without
  changing anything.
- Emails go to real clients. The portal's own guard still applies: when the server runs with
  `DUPLICATE_MODE=true` and without `CLIENT_EMAIL_ENABLED=true`, sends are recorded as failed and no email
  leaves the server.
- `MULTIWING_MCP_READ_ONLY` and `MULTIWING_FILE_ROOTS` limit what an agent can do from a given machine.

## Backend compatibility

This package ships with a few thin backend additions (in the same PR):

- `server/routers/ops.ts`: `ops.commentInbox`, `ops.reviewSummary`, `ops.activity`, `ops.search`. These are
  admin-only, read-only and backed by new helpers in `server/db.ts`.
- `projects.byId` and `deliverables.byId`.
- `pillars/tracks/projects/deliverables.create` now also return the new row's `id`.
- Resolving a comment without a message keeps the team's existing reply. Before, it erased the reply.

Until those are deployed, the core tools still work against the current production backend. The comment
inbox, review summary, id lookups and create-then-upload fall back to older procedures. `search_hub` and
`list_activity` need the new backend; on an older portal they return an error that says so.

## Tool inventory

### Session & system

| Tool | Access | What it does |
| --- | --- | --- |
| `whoami` | read | Show which portal this MCP server talks to, how it authenticates, and the role of the current session (should be admin). |
| `health_check` | read | Ping the portal API. |
| `list_activity` | read | Recent portal activity (client/guest comments and file downloads), newest first. This is the feed behind the 6-hour digest email. |
| `search_hub` | read | Search projects, deliverables, comments, tracks, contacts and client requests by text (case-insensitive substring match). |
| `send_activity_digest` | write | Email the admin digest of the last 6 hours of comments and downloads immediately (normally sent by the scheduled job). Does nothing if there was no activity. |
| `notify_owner` | write | Push a notification to the portal owner's notification feed. |

### Projects

| Tool | Access | What it does |
| --- | --- | --- |
| `list_projects` | read | List content-hub projects with their status, visibility, category and portal URL. Includes unpublished (hidden) projects unless publishedOnly is true. |
| `get_project` | read | Fetch one project by id or slug, optionally with its deliverables (files) and email contacts. |
| `create_project` | write | Create a new content-hub project. The slug becomes the client URL (/projects/<slug>) and must be unique; it is derived from the title when omitted. New projects are published (visible) by default, matching the admin UI. |
| `update_project` | write | Edit a project's title, description, cover image, category, sort order, visibility or status. Only provided fields change. The slug cannot be changed. |
| `set_project_status` | write | Move a project between In Queue (started), In Progress (in_progress) and Completed (completed). Does not email anyone; use notify_project_finished to complete and notify in one step. |
| `set_project_visibility` | write | Publish (show to clients) or hide a project from the client portal without deleting it. |
| `reorder_projects` | write | Set the display order of projects in the portal. Pass project ids in the desired order; each gets sortOrder = its index. |
| `delete_project` | write, destructive | Permanently delete a project row. The portal backend does not cascade, so its deliverables, contacts and shares are left orphaned; prefer set_project_visibility(published=false) to hide a project instead. |

### Deliverables

| Tool | Access | What it does |
| --- | --- | --- |
| `list_deliverables` | read | List the deliverables (files/links) in a project with review status, file info and transcoding state. Optionally include per-file download counts (guest share-link downloads). |
| `get_deliverable` | read | Fetch one deliverable with its client comments, transcoding (proxy) status and download count. |
| `create_deliverable` | write | Add a deliverable entry to a project without uploading a file, e.g. an external link (Frame.io / OneDrive) or a placeholder to attach a file to later. To upload a local file use upload_file_to_project instead. |
| `update_deliverable` | write | Edit a deliverable's title, description, link, thumbnail, type or sort order. Only provided fields change. |
| `delete_deliverable` | write, destructive | Permanently remove a deliverable from its project (the stored S3 object is not deleted). |
| `reorder_deliverables` | write | Set the display order of deliverables inside a project. Pass deliverable ids in the desired order. |
| `get_deliverable_stream_url` | read | Get a signed, time-limited (2h) URL to play/view a deliverable in a browser. Uses the H.264 proxy when transcoding is ready. |
| `get_transcoding_status` | read | Check the browser-playback proxy status for a deliverable (none, pending, processing, ready, failed). ProRes/MOV/MXF uploads are transcoded automatically. |
| `retranscode_deliverable` | write | Reset the proxy and re-run the AWS transcoder for a deliverable's source file. The existing proxy is replaced (usually 1-5 minutes). |
| `get_download_counts` | read | Per-deliverable download counts from the portal activity log. Note: the portal only attributes guest share-link downloads to a deliverable; portal-session downloads appear in list_activity but are not counted here. |

### File transfer

| Tool | Access | What it does |
| --- | --- | --- |
| `upload_file_to_project` | write | Upload a local file to a project as a deliverable, using the same presigned-S3 flow as the admin UI (any size). Creates a new deliverable unless deliverableId is given, in which case that deliverable's file is replaced. MOV/ProRes/MXF files are queued for browser-proxy transcoding automatically. |
| `create_upload_url` | write | Get a presigned S3 PUT URL (valid 1h) for uploading a file yourself, e.g. from another machine. PUT the raw bytes with the returned Content-Type header, then call attach_uploaded_file. |
| `attach_uploaded_file` | write | Record a file already uploaded via create_upload_url on a deliverable (sets file key, name, size, type and download reference). |
| `download_deliverable_file` | read | Download a deliverable's file from a project to the local machine (or return a signed URL with urlOnly). Deliverables that only have an external link return that link instead. Downloads are logged in the portal's activity log like UI downloads. |
| `download_project_files` | read | Download every stored file in a project into a local folder (<saveTo>/<project-slug>/). External-link deliverables are listed rather than downloaded. |
| `upload_image` | write | Upload a local image to portal storage and return its URL. Optionally set it directly as a project's cover image or a deliverable's thumbnail. |

### Review comments & status

| Tool | Access | What it does |
| --- | --- | --- |
| `list_review_comments` | read | Review inbox: client comments across all projects (and sonic-branding tracks), newest first, with project/deliverable context, timestamps into the media, and any team reply. Defaults to open (unresolved) comments. |
| `get_deliverable_comments` | read | All comments on one deliverable in chronological order, including media timestamps and team replies. |
| `get_track_comments` | read | All client comments on one sonic-branding track in chronological order. |
| `reply_to_comment` | write | Post (or replace) the Faderlabs team reply on a client comment; the client sees it under their comment in the portal. Set resolve=true to also mark the comment resolved. |
| `resolve_comment` | write | Mark a client comment as resolved, optionally with a final reply. |
| `reopen_comment` | write | Mark a previously resolved client comment as open again. |
| `add_comment` | write | Post a new top-level comment on a deliverable or track as the Faderlabs team (visible to the client, logged in activity and the owner notification feed). To answer a client, prefer reply_to_comment. |
| `get_review_summary` | read | Per-project review tracker: deliverable counts by review status (pending / approved / needs changes), open comment count, last comment time, and whether the project is ready to be marked completed. |
| `set_review_status` | write | Set a deliverable's review status (pending, approved, needs_changes). Clients normally set this in the portal; use it to record a decision received by email or call. |

### Sonic-branding approvals

| Tool | Access | What it does |
| --- | --- | --- |
| `list_track_approvals` | read | Sonic-branding per-track decisions (approved / needs_changes / rejected / pending), for one track or all tracks. |
| `set_track_approval` | write | Record a decision on a sonic-branding track. Portal sessions are shared (no per-person user ids), so this records the same approval slot the client uses in the portal and overwrites it. |
| `list_pillar_approvals` | read | Legacy per-pillar approvals from the original sonic-branding proposal, for one pillar or all. |
| `set_pillar_approval` | write | Record a legacy per-pillar decision with an optional note. Portal sessions are shared (no per-person user ids), so this records the same approval slot the client uses in the portal and overwrites it. |

### Contacts & email notifications

| Tool | Access | What it does |
| --- | --- | --- |
| `list_project_contacts` | read | Email recipients configured for a project's notifications. |
| `add_project_contact` | write | Add an email recipient to a project's notification list. |
| `remove_project_contact` | write, destructive | Remove an email recipient from a project (their email history is kept). |
| `send_project_notification` | write | Send the branded Faderlabs project email (with the project link, login password and open/click tracking) to a project's contacts. Same as Compose Notification in the admin UI. |
| `notify_project_finished` | write | Finish a project: set its status to Completed and email the project's contacts that final deliverables are ready. Use dryRun=true to preview recipients and copy without changing or sending anything. |
| `get_email_log` | read | Sent-notification history with delivery status and open/click tracking, for one project or all projects. |

### Guest / vendor shares

| Tool | Access | What it does |
| --- | --- | --- |
| `list_project_shares` | read | Active vendor / third-party access grants for a project (email, access level, share token). |
| `share_project` | write | Grant a vendor/guest email access to one project and email them an invite link. "read" = view only, "download" = view and download files. Re-sharing to the same email updates the access level. |
| `revoke_project_share` | write, destructive | Revoke a guest's access to a project immediately. |
| `check_share_link` | read | Check whether a share link is still valid and which project, guest email and access level it grants. |
| `resend_share_verification_code` | write | Email a fresh 6-digit sign-in code to a guest for their share link (valid 15 minutes). The email must match the invited address. |

### Client project requests

| Tool | Access | What it does |
| --- | --- | --- |
| `list_client_requests` | read | New-project requests submitted by clients through the portal's request form, newest first, with attached files. |
| `update_client_request` | write | Move a client request between new, in_review and completed, and/or edit the internal admin notes (existing notes are kept unless replaced). |
| `delete_client_request` | write, destructive | Permanently delete a client project request. |
| `download_client_request_files` | read | Download the files a client attached to a project request (all files, or one by name/key), or return signed URLs with urlOnly. |
| `submit_client_request` | write | Log a new project request exactly as if the client used the portal's request form (optionally uploading local files). Emails the Faderlabs team like a normal submission. |

### Sonic branding

| Tool | Access | What it does |
| --- | --- | --- |
| `list_pillars` | read | Sonic-branding proposal pillars in display order, optionally with their audio tracks. |
| `create_pillar` | write | Add a sonic-branding pillar (a themed group of tracks). |
| `update_pillar` | write | Edit a pillar's title, description or sort order. |
| `delete_pillar` | write, destructive | Permanently delete a sonic-branding pillar. |
| `list_tracks` | read | Audio tracks for one pillar, or all tracks across pillars. |
| `upload_track` | write | Upload a local audio file (WAV, MP3, …) as a new track in a pillar, using the same presigned-S3 flow as the admin UI. |
| `delete_track` | write, destructive | Permanently remove a sonic-branding track. |
| `download_track` | read | Download a sonic-branding track's audio file locally, or return a signed URL with urlOnly. |
| `get_track_stream_url` | read | Signed, time-limited (2h) URL for playing a track in a browser. |
| `get_sonic_branding_settings` | read | Hero title and subtitle shown on the client's sonic-branding proposal page. |
| `update_sonic_branding_settings` | write | Edit the hero title and/or subtitle on the sonic-branding proposal page. |

### Deliberately not exposed

| Portal capability | Why |
| --- | --- |
| Guest share sign-in (`shares.verifyOtp`, `shares.getProject`, `shares.getViewUrl`, `shares.getDownloadUrl`) | These run inside a guest's own email-verified session. The team uses the admin equivalents above. |
| `auth.clientLogin` / `auth.adminLogin` / `auth.logout` | Handled internally by the MCP session. |
| User and role management | The portal has none: one admin login plus a shared client password. Per-project access is managed through shares. |
| `/api/transcoding/complete`, `/api/track/open\|click/*`, `/api/tracks/download\|stream/*` | Machine callbacks for the AWS transcoder, email clients and legacy audio proxying, not operator actions. |

## Development

```bash
pnpm dev            # run from source with tsx
pnpm check          # typecheck (needs `pnpm install` at the repo root too: server types are imported)
pnpm test           # unit tests (tool registry, auth/session, file streaming, tool behaviour)
pnpm build          # bundle to dist/index.js
```

To add a tool, define it with `defineTool` in `src/tools/<area>.ts` and add it to that area's array. Registration,
read-only filtering, annotations and error formatting are handled centrally in `src/tool.ts`. If the portal
can't do the operation yet, add a thin procedure next to the existing ones in `server/` first, then call it
through `ctx.portal`.

### Running against a local portal

1. Point `DATABASE_URL` at a scratch MySQL/MariaDB database and run `npx drizzle-kit migrate` from the repo root.
2. Start the portal API with that `DATABASE_URL`, `ADMIN_EMAIL`/`ADMIN_PASSWORD`, and `DUPLICATE_MODE=true` (no
   outgoing email). For file tools without real AWS, set `AWS_ENDPOINT_URL_S3` to an S3-compatible endpoint
   (e.g. MinIO) plus `PORTAL_MEDIA_BUCKET`.
3. Set `MULTIWING_API_URL=http://localhost:3000` (or your port) and the same admin credentials for the MCP server.
