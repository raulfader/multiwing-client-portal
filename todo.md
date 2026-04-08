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
