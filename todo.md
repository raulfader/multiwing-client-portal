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
