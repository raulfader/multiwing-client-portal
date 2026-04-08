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
