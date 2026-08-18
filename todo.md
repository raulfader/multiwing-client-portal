# MultiWing Sonic Branding Portal — TODO

## Database & Backend
- [x] Define schema: pillars, tracks, comments, approvals tables
- [x] Generate and apply migration SQL
- [x] Add DB query helpers in server/db.ts
- [x] Admin procedures: createPillar, uploadTrack, listAllPillars (admin view)
- [x] Client procedures: listPillars, getTracksByPillar, addComment, setApproval
- [x] File upload endpoint for audio tracks (S3 via storagePut)
- [x] Owner notification on comment submission
- [x] Owner notification on approval decision

## Client Portal UI
- [x] Apply Faderlabs dark branding: #0A0A0A bg, #FFD600 accent, HK Nova font
- [x] Portal header with Faderlabs logo + MultiWing client logo
- [x] Manus OAuth login gate (redirect unauthenticated users)
- [x] Sonic Branding Pillars section with pillar cards
- [x] Audio player per track: play/pause, progress bar, duration display
- [x] Comment form per track with timestamped submission
- [x] Comments list display per track
- [x] Approve/Reject per pillar with visual status indicator

## Admin Interface
- [x] Admin-only route guard (role === 'admin')
- [x] Admin dashboard: all pillars, tracks, comments, approval statuses
- [x] Create new pillar form (title + description)
- [x] Upload track form per pillar (title, description, audio file — max 2 per pillar)
- [x] Delete/manage tracks

## App Structure
- [x] Update App.tsx with routes: /, /admin
- [x] Update index.css with Faderlabs design tokens
- [x] Add HK Nova font via CDN in index.html
- [x] Write vitest tests for key procedures (14 tests passing)

## Assets
- [x] Upload MWlogo.webp to CDN

## Bug Fixes
- [x] Fix approvals.myApproval returning undefined when no record exists (tRPC requires non-undefined)

## Visual Edits
- [x] Make Multi-Wing logo in header 10% smaller (h-8 → h-7)
- [x] Update hero text "MultiWing" → "Multi-Wing"

## Pillar Seeding & Layout
- [x] Delete test "TEst" pillar from database
- [x] Seed Pillar 1: People & Brand Storytelling
- [x] Seed Pillar 2: Products & Solutions
- [x] Seed Pillar 3: Engineering & Technology
- [x] Remove Multi-Wing logo from header bar
- [x] Place Multi-Wing logo in hero section of main page

## Content Hub Extension
- [x] Scrape all content from faderlabs.com/multiwing (5 projects: ACREX 2026, CONEXPO 2026, AHR 2026, Brand Video, Archive Footage)
- [x] Download and upload all project thumbnails to CDN
- [x] Extend DB schema: projects, deliverables, deliverable_comments tables
- [x] Seed all 5 projects with deliverables in database
- [x] Build Projects tab on client Home page with project cards grid
- [x] Build Project detail page (/projects/:slug) with deliverables, download links, and comments
- [x] Add deliverable comments with owner notifications
- [x] Update Admin dashboard with Projects tab (create/delete projects and deliverables)
- [x] Add /projects/:slug route in App.tsx

## Visual Fixes (Content Hub)
- [x] Fix broken project card cover images on Home page (re-uploaded to correct CDN, updated DB)
- [x] Add archive icon/placeholder for Archive Footage project card (no thumbnail) + onError fallback for all cards

## Portal Restructure & Visual Updates
- [x] Move Sonic Branding from separate tab into a project card on the Projects grid
- [x] Change 'Download' button text to 'My Files' on project detail page
- [x] Use ACREX 2026 thumbnail image for Archive Footage project card
- [x] Find and use real ACREX India logo for ACREX 2026 project card
- [x] Find and use real CONEXPO 2026 logo for CONEXPO project card
- [x] Find and use real AHR 2026 logo for AHR project card
- [x] Generate a video/film icon image for Brand Video project card
- [x] Move Multi-Wing logo to the right empty space in the hero section
- [x] Sonic Branding project page shows full pillar/track/approval UI at /projects/sonic-branding
- [x] Add audio category icon (Music2) for Sonic Branding project card

## Visual Polish (Round 2)
- [x] Make Multi-Wing logo in hero 25% smaller (h-20 → h-16)
- [x] Generate new Archive Footage icon in same dark neon style (neon cyan film reel)
- [x] Fix project card image sizing so logos/images are fully visible (object-contain with padding)

## Visual Polish (Round 3)
- [x] Remove white background from ACREX, CONEXPO, AHR logos on project cards (mix-blend-mode: lighten on #0A0A0A bg)
- [x] Change Sonic Branding icon color to yellow (#FFD600) - regenerated icon, updated DB
- [x] Fill project card image boxes edge-to-edge (object-cover, no padding)

## Icon Consistency
- [x] Regenerate Sonic Branding icon to match Brand Video icon style/size (golden neon waveform, 16:9, same glow)
- [x] Regenerate Archive Footage icon to match Brand Video icon style/size (golden neon film reel, 16:9, same glow)

## Project Page Visual Edits
- [x] Add archive footage icon in project detail page header
- [x] Replace Download icon with FolderOpen icon on all My Files buttons

## UX Cleanup
- [x] Remove comment buttons from next to My Files buttons on deliverable cards

## Bug Fixes (Round 2)
- [x] Fix React hooks ordering violation in ProjectPage (/projects/sonic-branding crashes with "fewer hooks than expected")

## Visual Edits (Round 4)
- [x] Remove Archive badge element from project header (line ~333)
- [x] Fix deliverable card image: object-contain + padding so logos show fully (line ~55)

## Asset Updates
- [x] Replace Archive Footage project icon with user-provided neon film reel image

## Visual Fixes (Round 5)
- [x] Fix DeliverableCard missing image placeholder — use Archive Footage icon as fallback

## Sonic Branding Improvements
- [x] Extend DB: add trackTimestamp field to track_comments; add track_approvals table (per-track, not per-pillar)
- [x] Backend: add/update procedures for timestamped comments and per-track approvals (approve/needs_changes/reject)
- [x] Client UI: Frame.io-style timestamped comments on audio player (click waveform/progress to set timestamp)
- [x] Client UI: Three per-track buttons — Approve (green), Needs Changes (yellow), Reject (red)
- [x] Client UI: Remove the "optional note" box from pillar approval section
- [x] Admin: Add pillar form (title + description)
- [x] Admin: Edit pillar title and description inline
- [x] Admin: Upload tracks per pillar (unlimited) with title and description
- [x] Admin: Delete pillar and tracks

## Pillar Color Customization
- [x] Pillar 1 border/accent: green (#64DD17); Pillar 2: yellow (#FFD600); Pillar 3: red (#d60000)

## Image Upload in Admin
- [x] Add image upload tRPC procedure (base64 → S3) for project cover and deliverable thumbnail
- [x] Replace project cover URL input in CreateProjectForm with file upload button
- [x] Add deliverable thumbnail upload in CreateDeliverableForm (no separate edit form exists)

## Email Notification Module
- [x] Research Manus API hub for email sending capability (used Gmail SMTP via nodemailer)
- [x] DB: add project_contacts table (firstName, lastName, email, projectId)
- [x] DB: add email_log table (contactId, projectId, subject, sentAt, status)
- [x] Server: build branded HTML email template (Faderlabs logo, salutation, project link, password MW@2025)
- [x] Server: add contacts CRUD procedures (add, list, delete)
- [x] Server: add sendNotification procedure (renders template, sends email via Gmail SMTP)
- [x] Admin UI: contacts management panel per project
- [x] Admin UI: send notification panel with editable subject line and preview

## Inline Editing in Admin
- [x] Backend: add projects.update procedure (title, description, coverImageUrl) — already existed
- [x] Backend: add deliverables.update procedure (title, description, thumbnailUrl, downloadUrl, fileType) — already existed
- [x] Admin UI: inline edit on ProjectAdminRow (edit title, description, cover image)
- [x] Admin UI: inline edit on each deliverable row (edit title, description, thumbnail, download URL)

## Sign-in Page Redesign
- [x] Remove client logo from sign-in page
- [x] Rename portal to "Content Hub" on sign-in page
- [x] Remove sonic branding mention from sign-in copy
- [x] Replace OAuth login with password-only gate (MW@2025)

## Custom Password Auth (Remove OAuth)
- [x] Add custom_sessions table to DB (token, role, createdAt, expiresAt)
- [x] Server: add auth.clientLogin procedure (checks portal password, issues session token)
- [x] Server: add auth.adminLogin procedure (checks email + admin password, issues admin session)
- [x] Server: add auth.me procedure using custom session token (replace Manus OAuth me)
- [x] Server: add auth.logout procedure (invalidates session token)
- [x] Store admin password securely via env secret (ADMIN_PASSWORD)
- [x] Client: update LoginScreen to password-only (no OAuth redirect)
- [x] Client: add AdminLogin page/modal for admin email+password
- [x] Client: update useAuth to use custom session cookie/token
- [x] Remove all Manus OAuth references (getLoginUrl, VITE_OAUTH_PORTAL_URL usage in login flow)
- [x] Update Admin page to use custom admin auth

## Admin Access
- [x] Add discreet admin link to login screen footer and portal nav bar

## Bug Fix: Admin Login Error
- [x] Fix "Please login (10001)" error on /admin — replaced local adminProcedure (which extended protectedProcedure) with the one from _core/trpc.ts that checks ctx.user?.role === 'admin' directly; also fixed Admin.tsx to reload page after login so token is available for all queries

## Comment Improvements
- [x] DB: add commenter_name column to track_comments and deliverable_comments tables
- [x] DB: add admin_response (text) and resolved_at (timestamp) columns to both comment tables
- [x] Backend: update addComment / add procedures to accept commenterName field
- [x] Backend: add resolveComment and respondToComment procedures (admin-only)
- [x] Client: add name input field to track comment form (required before submitting)
- [x] Client: display commenter name on each comment in the comment list
- [x] Admin: show commenter name on each comment row
- [x] Admin: add Resolve button per comment (marks resolved_at timestamp)
- [x] Admin: add Respond inline form per comment (saves admin_response text)
- [x] Admin: show admin response and resolved status on each comment row

## Deliverable Comments (Future)
- [x] Client: deliverable comments UI deferred — backend is ready but client UI not yet requested by user

## Project Drag-and-Drop Reordering
- [x] DB: add sort_order column to projects table (already existed)
- [x] Backend: add projects.reorder procedure (admin-only) to update sort order
- [x] Admin UI: install dnd-kit, implement drag-and-drop on project rows in admin panel
- [x] Client: projects are already displayed in sort_order order (getAllProjects orders by sortOrder asc)

## Email Template Updates
- [x] Change salutation from "Dear [Name]" to "Hi [First Name]" in regular (non-bold) font
- [x] Replace email font with Plus Jakarta Sans (closest Google Font to HK Nova) for all copy

## Admin Dashboard Stats
- [x] Remove Pillars box from dashboard stats bar
- [x] Replace approval boxes with Approved, Rejected, Needs Changes counts

## Pre-publish Cleanup
- [x] Remove Admin button from portal header (removed from login screen and main header)

## Email Fixes
- [x] Fix View Project button URL in notification email — now uses https://multiwing.faderlabs.ai/project/{slug}
- [x] Update portal URL to https://multiwing.faderlabs.ai/project/sonic-branding (hardcoded faderlabs.ai domain)
- [x] Make Hi [First Name] salutation font the same size as body copy (15px, matching .message)

## Email Link 404 Fix
- [x] Fix 404 when clicking View Project email link — added /project/:slug → /projects/:slug redirect in App.tsx; added auth guard to SonicBrandingProjectView

## Email Link Auth Redirect
- [x] Add returnTo query param support to Home.tsx login — after successful password login, redirect to returnTo path
- [x] Update Project.tsx to redirect unauthenticated users to /?returnTo=/projects/:slug instead of showing inline Sign In prompt

## Contacts Permission Fix
- [x] Fix "no permissions" error when adding contacts in admin panel email notifications — adminProcedure correctly checks role; page reload on login ensures token is available

## Email Tracking Dashboard
- [x] DB: add openedAt, clickedAt, openCount, clickCount to email_log table; add email_events table for per-event tracking
- [x] Server: add GET /track/open/:token endpoint (serves 1x1 transparent pixel, records open event)
- [x] Server: add GET /track/click/:token endpoint (redirects to destination URL, records click event)
- [x] Email: inject tracking pixel and wrap View Project button link with click tracking URL
- [x] Backend: add tRPC procedures to fetch email log with open/click stats (email.log and email.allLogs)
- [x] Admin UI: add email analytics dashboard showing per-email open/click stats (Sent, Unique Opens, Total Opens, Link Clicks)

## Email Sent History - Recipient Display
- [x] Show recipient name and email on each row in the admin email sent history

## Email Link 404 (Production)
- [x] Fix 404 on View Project and portal link in email — URLs must point to correct production paths on multiwing.faderlabs.ai

## Email Link Auth Redirect (Round 2)
- [x] Project page: redirect unauthenticated users to /?returnTo=/projects/:slug
- [x] Login screen (Home.tsx): after successful password login, redirect to returnTo path

## Track Approvals in Admin Dashboard
- [x] Show track approval statuses in admin dashboard (per track: approved/needs_changes/rejected/pending)

## Stats Bar Fix
- [x] Replace "Pillar Approvals" stat card with "Rejected" (track-level rejected count) in admin dashboard

## Needs Changes Count Fix
- [x] Fix "Needs Changes" stat showing 2 when client marked no tracks as needs_changes — deleted 2 orphaned stale records from DB

## Track Decisions Panel
- [x] Add Track Decisions panel to admin dashboard showing each track name with its approval status badge (approved/needs_changes/rejected/pending)

## Client Project Request Feature
- [x] Add client_project_requests table to schema (title, description, files JSON, status, submitterName, submitterEmail, createdAt)
- [x] Add tRPC procedures: getUploadUrl (presigned S3), submit, list (admin), updateStatus (admin)
- [x] Build client-facing Create New Project form at /new-project with direct S3 upload (no size limit)
- [x] Show client project requests in admin dashboard with status (new/in_review/completed) and downloadable file links
- [x] Send email notifications to raul@faderlabs.com and hello@faderlabs.com on new request

## Upload Fix & Form Cleanup
- [x] Fix S3 upload network error on New Project Request form — set CORS on bucket + disabled SDK checksum injection in presigned URL
- [x] Remove company field from Your Details section in New Project Request form

## Upload Error (Persistent)
- [x] Investigate and fix persistent S3 upload network error — resolved by updating S3 CORS to wildcard origin (dev preview domain was not in allowed list)

## Success Message Fix
- [x] Change success message from "Multi-Wing team" to "Faderlabs team" in NewProjectRequest.tsx

## Admin Page Crash Fix
- [x] Fix TypeError: req.files.map is not a function — files stored as JSON string, now parsed in getAllClientProjectRequests() in db.ts

## File Download Fix
- [x] Fix file download in admin Project Requests tab — now uses presigned S3 URL with Content-Disposition: attachment via server-side getDownloadUrl procedure

## Deliverable File Upload & Media Players
- [x] Add fileKey, fileName, fileSize fields to deliverables table (migration)
- [x] Add tRPC procedures: deliverables.getUploadUrl (admin), deliverables.update (with fileKey/fileName/fileSize), deliverables.getDownloadUrl (client)
- [x] Add file upload UI to admin deliverable editor (S3 direct upload, any file type, no size limit, with progress bar)
- [x] Add video player to client project page for deliverables with video files (HTML5 <video> with controls)
- [x] Add audio player to client project page for deliverables with audio files (matching Sonic Branding style)
- [x] Show download button for non-media deliverable files (PDFs, ZIPs, etc.) via presigned S3 URL
- [x] Client: option to download any deliverable file via presigned S3 URL (forced download)

## Video Player with Timestamped Comments
- [x] Add timestampSeconds column to deliverable_comments table (migration applied)
- [x] Update DB helpers: getCommentsByDeliverable and createDeliverableComment now include timestampSeconds
- [x] Update tRPC deliverableComments.add to accept timestampSeconds
- [x] Build DeliverableVideoPlayer component: custom controls, click-to-timestamp, comment markers on scrub bar, comment list with jump-to
- [x] Wire DeliverableVideoPlayer into DeliverableCard for S3 video files only; keep thumbnail+link cards unchanged
- [x] Ensure legacy downloadUrl-only deliverables (no fileKey) render thumbnail + link exactly as before

## Video Player & Download Fixes
- [x] Fix "Failed to load video" — added deliverables.getStreamUrl tRPC procedure (presigned GET, no Content-Disposition)
- [x] Fix download filename — pass original fileName to Content-Disposition header in generatePresignedDownloadUrl
- [x] DeliverableVideoPlayer: fetch presigned stream URL on mount before setting video src
- [x] DeliverableAudioCard: fetch presigned stream URL on mount before setting audio src
- [x] Fix duplicate DeliverableCard / DeliverableAudioCard function declarations (syntax errors)

## Video Player Bug Fixes (Round 2)
- [x] Fix timestamped comment: replaced range input with pure div + mousedown/touchstart handlers; click opens comment box at timestamp
- [x] Fix fullscreen: requestFullscreen now called on wrapperRef (outer container div) with cross-browser vendor prefix fallbacks

## Video Player Full Rewrite
- [x] Fix useEffect dependency: added [streamUrl] so video event listeners attach after video element mounts (was [] causing duration=0 forever)
- [x] Fix fullscreen: try/catch requestFullscreen, fall back to window.open(streamUrl) when blocked by iframe permissions policy
- [x] Scrub bar: pure div with onMouseDown/onTouchStart, no range input intercepting clicks

## Video Player Custom Fullscreen Overlay
- [x] Add isFullscreen state + fixed-position overlay (z-9999) that covers the entire viewport
- [x] Fullscreen overlay includes: video, custom scrub bar, comment markers, comment box, comment list, close button
- [x] Escape key closes the fullscreen overlay
- [x] Fullscreen button toggles the overlay (no browser fullscreen API — works inside iframes too)

## Deliverable Review Buttons (Video Player)
- [x] Add reviewStatus field to deliverables table (pending / approved / needs_changes) + migration applied
- [x] Add tRPC deliverables.setReviewStatus mutation (client-facing, protectedProcedure)
- [x] Add Approve / Needs Changes buttons to DeliverableVideoPlayer (inline + fullscreen), matching Sonic Branding style
- [x] Buttons toggle: clicking active status resets to pending; clicking inactive sets that status

## Fullscreen Video Sync Fix
- [x] Fix fullscreen overlay: create video element imperatively once, move it between inline/fullscreen slots via useLayoutEffect (no re-mount, no sync loss)
- [x] Use togglePlayRef to keep video.onclick pointing to latest togglePlay without stale closure

## Project Management (Admin)
- [x] Add projectStatus column to projects table (started / in_progress / completed), migration applied
- [x] Add tRPC projects.setStatus mutation (admin only)
- [x] Add projectStatus to updateProject db helper type
- [x] Admin panel: delete button already existed — confirmed working (with confirm dialog)
- [x] Admin panel: status selector dropdown (Started / In Progress / Completed) on each project row, color-coded
- [x] Client project page: project status badge shown in hero section next to category pill

## Project Request Delete & Client Dashboard
- [x] Add deleteClientProjectRequest to db.ts
- [x] Add tRPC clientRequests.delete mutation (admin only)
- [x] Admin panel: delete button (red trash icon with confirm dialog) added to each project request row
- [x] Client hub: Project Overview dashboard with 4 stat cards (Total, Started, In Progress, Completed) + color-coded progress bar

## Status Label & Color Update
- [x] Renamed 'Started' → 'In Queue' (grey #888888) in Admin.tsx, Home.tsx, Project.tsx
- [x] Changed 'Completed' from purple (#A78BFA) to green (#22C55E) in all three files

## Download Buttons for All S3 Files
- [x] Audit: sonicTracks table has audioKey + audioUrl columns; deliverables have fileKey/fileName/fileSize
- [x] Add tRPC tracks.getDownloadUrl + tracks.getStreamUrl procedures (protectedProcedure, uses audioKey)
- [x] Client Project page: Download button added to SonicTrackRow (yellow, right-aligned, presigned URL)
- [x] Admin panel: Download icon button added to TrackAdminRow (yellow, next to delete)
- [x] Client Project page: DeliverableAudioCard already had Download File button (confirmed)
- [x] Admin panel: AdminDeliverableDownloadButton component added to DeliverableEditRow file attachment row

## Download XML Fix
- [x] Diagnosed: Sonic Branding audio tracks stored on Manus CDN (not in S3 bucket) — S3 presigned URLs returned XML error
- [x] Fixed: tracks.getDownloadUrl now returns /api/tracks/download/:id proxy URL
- [x] Added registerTrackDownloadRoute Express handler: fetches from CDN, pipes back with Content-Disposition: attachment; filename="Track Title.wav"
- [x] Fixed: tracks.getStreamUrl now returns audioUrl (CDN) directly — no S3 presigning needed
- [x] Deliverable file downloads confirmed working (fileKey values exist in S3 bucket)

## Download Auth Fix
- [x] Fixed: trackDownload proxy route now reads x-session-token header (localStorage-based auth) in addition to cookie fallback
- [x] Fixed: Admin TrackAdminRow download handler updated to use fetch+blob approach (was using old anchor-click which caused JSON download)
- [x] Fixed: Both SonicTrackRow (client) and TrackAdminRow (admin) fetch calls now include x-session-token header from localStorage

## Hide Comments on Approve
- [x] Client view: hide all deliverable comments when reviewStatus === 'approved' (video player inline + fullscreen, audio card)
- [x] Comments reappear if client toggles back from Approved to Pending

## Project Status Badge on Cards
- [x] Show project status badge (In Queue / In Progress / Completed) on each project card in the Home.tsx grid

## Project Overview Filter
- [x] Make stat cards (Total, In Queue, In Progress, Completed) clickable filters for the project grid
- [x] Active filter card gets highlighted; clicking Total resets to show all projects

## Project Sharing (Vendor/Third-Party Access)
- [x] DB: project_shares table (id, projectId, grantedByUserId, email, accessLevel: read|download, token, expiresAt, createdAt)
- [x] DB: share_otps table (id, shareId, email, code, expiresAt, usedAt)
- [x] DB: share_sessions table (id, shareId, sessionToken, expiresAt)
- [x] Backend: shares.create procedure (client creates share for a project + email + access level, sends OTP email)
- [x] Backend: shares.requestOtp procedure (resend OTP to guest email)
- [x] Backend: shares.verifyOtp procedure (verify 6-digit code, return 24h session token scoped to share)
- [x] Backend: shares.getProject procedure (public, requires share token + verified session, returns project + deliverables)
- [x] Backend: shares.list procedure (client can see all active shares for a project)
- [x] Backend: shares.revoke procedure (client can revoke a share)
- [x] Backend: shares.checkToken procedure (guest landing page validation)
- [x] Client UI: Share button on project detail page (Project.tsx)
- [x] Client UI: Share modal — enter email, choose Read Only or Read + Download, copy shareable link
- [x] Client UI: Manage shares panel — list of active shares with revoke button
- [x] Guest UI: /share/:token route — email entry gate → OTP verification → project view (read or read+download)
- [x] Guest view: deliverables visible but download buttons hidden for read-only shares

## Share Feature Bug Fixes
- [x] Fix projects not loading on client hub (was stale Vite parse error; projects.list returns 200 correctly)
- [x] Fix share invite email not being sent to guest (SMTP verified OK; added error logging in shares.create)
- [x] Fix guest cannot access deliverables after OTP verification (wrong field name fileUrl → downloadUrl/fileKey; added shares.getDownloadUrl procedure; fixed session expiry handling)
- [x] Add Share button to Sonic Branding project page (/projects/sonic-branding uses project ID 30001)
- [x] Add GuestPillarCard + GuestTrackPlayer for Sonic Branding guest view (read-only audio player)
- [x] shares.getProject now returns pillars+tracks for audio/sonic-branding projects

## Share Guest Flow Fix
- [x] Fix: email link now skips straight to OTP entry screen (auto-sends code on load when email is known)
- [x] Fix: session stored in localStorage so it persists across page refreshes (was sessionStorage)

## Guest View/Download Fix
- [x] Fix: guest cannot view deliverables — added View File button + thumbnail click-to-open; getViewUrl procedure returns f.io link directly
- [x] Fix: guest cannot download files — getDownloadUrl now returns f.io downloadUrl when fileKey is null; Download button opens link in new tab

## Invite Email Flow Fix
- [x] First invite email: only project name + link, no OTP code (uses sendShareInviteEmail)
- [x] OTP is sent automatically when guest lands on the share link page (requestOtp called on page load in SharedProject.tsx)

## Full Mirror Shared Project View
- [x] auth.me now validates share session tokens (share_sessions table) and returns isGuest: true
- [x] server context validates share session tokens so protectedProcedure works for guests
- [x] checkToken returns projectSlug for redirect after OTP verification
- [x] SharedProject.tsx: after OTP verify, stores session as portal_session_token and redirects to /projects/:slug
- [x] Guest sees full 1:1 project view — same ProjectPage / SonicBrandingProjectView components, no restrictions
- [x] Share button hidden for guests (isGuest flag from useAuth in both ProjectPage and SonicBrandingProjectView)
- [x] All 19 tests pass, TypeScript clean

## Guest Restrictions
- [x] Remove access level selector from Share modal (all shares are full access)
- [x] Hide Share button for guests in ProjectPage and SonicBrandingProjectView (already done)
- [x] Hide New Project button for guests in Home.tsx

## Guest Access Restriction (Critical Fix)
- [x] Fix: projects.list now returns only the one shared project when ctx.shareId is set
- [x] Fix: Home.tsx redirects guests directly to their project when projects load (no full grid visible)
- [x] Fix: Share button hidden for guests in both ProjectPage and SonicBrandingProjectView (!isGuest guard)
- [x] Fix: New Project button hidden for guests on Home page

## Deliverable Drag-and-Drop Reorder (Admin)
- [x] Add sortOrder column to deliverables table
- [x] Add deliverables.reorder tRPC procedure
- [x] Install @dnd-kit/core and @dnd-kit/sortable
- [x] Add drag handle and DnD reordering to admin deliverable rows in Admin.tsx

## Multi-Email Share
- [x] Share modal: replace single email input with multi-email tag input (add email on Enter/comma, remove with ×)
- [x] Share modal: send one invite per email (loop shares.create calls on submit)
- [x] Backend: shares.create already handles one email — no backend change needed (called once per email from frontend)

## Guest Session Isolation Fix
- [x] Store guest share sessions under a separate key (guest_session_token) instead of portal_session_token
- [x] Update SharedProject.tsx to write to guest_session_token instead of portal_session_token
- [x] Update trpc.ts client to send guest_session_token only on /projects/ paths (not on root /)
- [x] Update Home.tsx: do not redirect guests who land on / — show normal login screen instead
- [x] Update useAuth.ts: logout clears both portal_session_token and guest_session_token
- [x] Ensure regular client login still writes to portal_session_token (no change needed)
- [x] Remove early-redirect shortcut in SharedProject.tsx (guests always verify OTP on share page)

## Back Home Button Fix (Guest)
- [x] Find all Back Home / back navigation buttons shown to guests in Project.tsx and Home.tsx
- [x] On click: clear guest_session_token from localStorage, then hard-navigate to / (login screen)
- [x] Regular (non-guest) Back Home links remain unchanged

## WAV File Upload Fix
- [x] Normalize audio/x-wav and audio/wave MIME types to audio/wav before generating presigned S3 URL
- [x] Apply same normalization in Sonic Branding track upload (base64 flow)
- [x] Improve XHR error handling to surface S3 XML error messages instead of just HTTP status codes

## Audio Player Fix & Track Limit Removal
- [x] Fix "Failed to load audio" in client Sonic Branding view (audio URL not accessible / CORS issue)
- [x] Remove 2-track-per-pillar limit from tracks.getUploadUrl and tracks.create procedures
- [x] Update admin UI to remove "Upload Track 1/2" numbering cap

## ProRes & Sonic Branding Comment Fixes
- [x] ProRes video: browser cannot decode ProRes codec — replace video player with a "Download to view" card for .mov/.prores files
- [x] Sonic Branding comments: fix timestamp comment submission not working in SonicTrackRow

## Sonic Branding Hero Text Editing
- [x] DB: add sonic_branding_settings table (heroTitle, heroSubtitle) or use a settings key-value store
- [x] Backend: add sonicBranding.getSettings and sonicBranding.updateSettings procedures
- [x] Admin UI: inline editable hero title and subtitle on Sonic Branding project page (pencil icon, click to edit)
- [x] Client view: hero title and subtitle rendered from DB (not hardcoded)

## Download Fix (Direct Public S3 URLs)
- [x] Fix Sonic Branding track download: use direct public S3 URL instead of proxy/presigned
- [x] Fix deliverable download (client + guest): use direct public S3 URL instead of presigned URL
- [x] Fix admin track/deliverable download: use direct public S3 URL

## ProRes Proxy Transcoding (AWS Lambda)
- [x] Add proxyUrl, proxyStatus (pending/processing/ready/failed), proxyKey columns to deliverables table
- [x] Run DB migration for new columns
- [x] Build AWS Lambda function with FFmpeg layer for ProRes→H.264 transcoding
- [x] Configure S3 event notification to trigger Lambda on deliverables/ prefix uploads
- [x] Add IAM permissions for Lambda to read/write S3 and call WebDev webhook
- [x] Add /api/transcoding/complete webhook endpoint in WebDev app
- [x] Update deliverables.getOne/list procedures to return proxyUrl and proxyStatus
- [x] Update frontend video player to use proxyUrl when available, original as fallback
- [x] Show "Transcoding…" badge on video deliverables while proxyStatus is pending/processing
- [x] Keep original file URL as the download target regardless of proxy status

## Transcoding Auto-Refresh
- [x] Add deliverables.getProxyStatus tRPC query (returns proxyStatus + proxyUrl for a single deliverable)
- [x] DeliverableVideoPlayer: poll getProxyStatus every 10s when proxyStatus is pending/processing
- [x] Stop polling once proxyStatus becomes ready or failed
- [x] When ready: update local state with proxyUrl and switch to video player without page reload

## Transcoding Progress Indicator
- [x] Add elapsed time counter to the "Generating Preview…" card (e.g. "Transcoding for 2m 30s…")
- [x] Use a useEffect + setInterval to tick every second from when the component mounts
- [x] Show a subtle animated progress bar that fills over an estimated 5-minute window

## Switch to AWS MediaConvert (Large ProRes Support)
- [x] Create MediaConvert IAM role with S3 read/write permissions
- [x] Get account-specific MediaConvert endpoint
- [x] Update trigger Lambda to submit MediaConvert jobs (not run FFmpeg)
- [x] Remove FFmpeg layer from trigger Lambda (no longer needed)
- [x] Create notification Lambda to receive MediaConvert EventBridge completion events
- [x] Configure EventBridge rule to route MediaConvert job state changes to notification Lambda
- [x] Test end-to-end with a ProRes file upload

## Download & Transcoding UX Improvements
- [x] Fix 1: Replace "Preparing…" with real download progress bar showing percentage (client + admin views)
- [x] Fix 2: Show dual download buttons (Download Original ProRes + Download Proxy MP4) when proxy is ready
- [x] Fix 3: Add full transcoding progress bar (elapsed time + animated fill) to admin AdminDeliverableCard

## Admin Transcoding Bar & Email Notifications
- [x] Fix/verify admin transcoding progress bar shows correctly when proxyStatus is pending/processing
- [x] Send email to raul@faderlabs.com when a comment is posted (any project/track)
- [x] Send email to raul@faderlabs.com when a file is downloaded (deliverable or track)

## Re-transcode, Client Bar Fix, Email Digest
- [x] Add re-transcode button in admin DeliverableEditRow (triggers Lambda via new tRPC adminProcedure)
- [x] Apply transcoding bar latch fix to client-side Project.tsx (same pattern as Admin.tsx)
- [x] Create activity_log DB table to record comments and downloads
- [x] Remove per-event fire-and-forget sendAdminAlertEmail calls from routers.ts
- [x] Add insertActivityLog helper to db.ts
- [x] Log comments and downloads to activity_log table instead of emailing immediately
- [x] Build digest email builder (groups activity by type, only sends if activity exists)
- [x] Set up 6-hour heartbeat schedule (6am/12pm/6pm/12am EST) via manus-config
- [x] Add heartbeat tRPC endpoint that queries activity_log since last 6h and sends digest

## Download Tracking & Count Badge
- [x] Log guest/share link downloads to activity_log in shares router
- [x] Add getDownloadCountByDeliverable DB helper
- [x] Add tRPC procedure to fetch download counts per deliverable
- [x] Show download count badge on each deliverable card in admin panel

## Guest Comment Tracking
- [x] Log guest comments (track + deliverable) via share links to activity_log

## Self-Contained Digest Cron (No Agent Credits)
- [x] Remove Manus heartbeat schedule config for digest
- [x] Install node-cron and add 6-hour digest cron job inside Express server (0 6,12,18,0 * * * America/New_York)

## AWS Migration Discovery
- [x] Inventory the portal’s Manus, database, media, sharing, email, analytics, and scheduled-digest dependencies for AWS migration
- [x] Obtain and reconcile independent OpenAI, Grok, and Anthropic critiques of the Multiwing AWS migration plan before implementation
- [ ] Create an AWS duplicate with strictly read-only source exports, copy-only media transfer, no Manus database writes, no Manus media deletes, no live DNS changes, and no client notifications
- [ ] Produce pre-copy manifests and post-copy reconciliation evidence before accepting the AWS duplicate as complete
- [x] Document immutable source controls, copy-only safeguards, rollback boundaries, and the separate cutover gate
- [x] Produce a read-only source schema/media inventory and written rollback runbook before any client-data migration
- [ ] Compare Manus-hosted and AWS-hosted Multiwing operating costs, portability, and operational risk before provisioning AWS staging resources
- [x] Estimate AWS-only Multiwing monthly infrastructure costs across transparent staging and production usage scenarios
- [x] Validate AWS cost assumptions against the actual Multi-wing Client Portal task source, media pipeline, and operational integrations
- [ ] Collect read-only aggregate Multiwing media-object counts and storage totals, without exposing client filenames or data
- [x] Collect and analyze read-only AWS monthly cost history for Multiwing media, playback, transcoding, and supporting services in the current AWS account
- [ ] Identify the AWS account that currently owns the legacy Multiwing S3/media-processing credentials if its charges are not billed to the current Faderlabs AWS account
- [x] Create an empty, isolated Multiwing AWS staging stack without changing the live portal or `multiwing.faderlabs.ai` DNS
- [x] Diagnose and safely recover the failed isolated Multiwing staging-foundation stack creation before retrying deployment
- [x] Establish GitHub OIDC deployment automation and a separate least-privilege Multiwing deployment role
- [x] Correct the browser-committed Multiwing staging workflow formatting and revalidate its separate deployment path
- [ ] Grant the Multiwing deployment role only the private portal-assets artifact upload permissions required for AWS Lambda packaging
- [ ] Grant the Multiwing CloudFormation execution role the narrow artifact-read, Lambda, HTTP API, and generated-role controls required for the reviewed duplicate runtime
- [ ] Adapt the Multiwing server bootstrap, configuration, database connection, storage abstraction, and safe staging flags for AWS without importing source data or enabling client-facing actions
- [ ] Create an isolated Multiwing AWS stack with separate VPC, RDS database, S3 media bucket, CloudFront distribution, Secrets Manager secret, and deployment role
- [ ] Replace Manus-specific authentication, storage, notification, and runtime helpers with AWS-managed equivalents
- [ ] Migrate client, project, deliverable, comment, approval, sharing, analytics, and activity-log data into the separate Multiwing RDS database
- [ ] Migrate all audio, video, documents, thumbnails, and proxy media to a private Multiwing S3 bucket with signed delivery
- [ ] Replace Gmail SMTP and in-process digest scheduling with Amazon SES and an AWS-managed scheduled task
- [ ] Preserve the existing MediaConvert pipeline with a separate least-privilege AWS event and callback design
- [ ] Resolve current schema drift and test-environment failures before production cutover
- [ ] Validate Multiwing staging before changing the `multiwing.faderlabs.ai` DNS record
