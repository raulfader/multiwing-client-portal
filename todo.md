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
