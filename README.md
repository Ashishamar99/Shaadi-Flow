# Shaadi Flow

A joyful, stress-free wedding logistics app built with React, TypeScript, Supabase, and Mapbox.

**Live:** [shaadi-flow.vercel.app](https://shaadi-flow.vercel.app)

## Features

### Guest Book
- Add guests individually or as families with named members and unnamed +N extras
- Auto-geocode addresses and Google Maps links
- CSV/Excel import and export
- Search by name, address, phone, or tags
- Filter by RSVP status, side (bride/groom/mutual), priority, creator, headcount, and event attendance
- Sort by name (A-Z/Z-A) or date (newest/oldest)
- Collapsible family rows with cascading visited status
- Tags system with preset suggestions and custom freeform tags
- Event attendance tracking (Reception, Muhurtham, Half & Half)
- Half & Half splits headcount across events (ceil of total/2 per event)
- KPI cards update based on active filters
- Optimistic delete with 5-second undo toast
- RSVP entries from viewers protected (admin/owner only can edit)

### Route Planner
- Interactive Mapbox map with streets and satellite views
- Heatmap toggle for guest density visualization
- K-means geographic clustering with nearest-neighbor route optimization
- Round-trip routes (home -> stops -> home)
- Smart optimal days suggestion based on 15km cluster radius
- Daily travel hour limits (weekday/weekend configurable)
- Over-time warnings per day
- Start location via address or Google Maps link with home marker on map
- Excludes visited guests from calculations
- Unlocated guest warnings with names listed
- Mark guests as visited directly from the route manifest
- Save and load route plans (shared across team via Supabase)
- Directions API response caching to reduce Mapbox costs
- Map/Satellite style toggle with route re-render

### Timeline Builder
- Multi-day event scheduler with pre-event days (Day -3 through Day N)
- Drag-and-drop event reordering via @dnd-kit
- 15-minute time snapping
- Conflict detection (overlapping events highlighted in red)
- Timezone-independent time storage (same time displayed globally)
- Clickable Google Maps links in event locations
- Export as PNG image or CSV

### Viewer Experience
- Dedicated read-only page for viewers (no admin UI)
- RSVP form with name, phone, address, maps link, side, relationship tag
- Event attendance checkboxes (Muhurtham/Reception)
- Editable RSVP (viewers can update their response)
- Schedule with dates and day labels (no Day 0)
- Shareable schedule image (Web Share API on mobile, PNG download on desktop)
- Emoji reactions on events (seeded from guest count)
- "Preview as Viewer" toggle for admins

### Dashboard
- Wedding countdown with inline date editing
- Headcount, RSVPs confirmed, visited, and pending stat cards
- Upcoming events from timeline
- Quick action buttons

### Team & Settings
- Google OAuth + email/password authentication
- Wedding space creation and join-by-link (Space ID as invite token)
- Role-based access: Owner, Admin, Editor, Viewer
- Admins can promote/demote members and manage roles
- Invite link generation for admins/owners
- Wedding name, date, and budget editing
- Member profile display with Google avatar and email

### Design System
- Blush & Mint editorial palette (#F4C2C2, #B5EAD7)
- Quicksand typography
- Pill-shaped buttons and inputs (99px radius), 24px card radius
- Dark mode toggle with full CSS variable overrides
- Responsive mobile layout with hamburger sidebar
- Skeleton loading screens

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite 6, Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL + Row Level Security + Google OAuth)
- **Maps:** Mapbox GL JS (streets, satellite, heatmap, directions)
- **Drag & Drop:** @dnd-kit/core + @dnd-kit/sortable
- **State:** TanStack Query v5 + Zustand
- **Export:** SheetJS (CSV/Excel), html-to-image (PNG)
- **Hosting:** Vercel

## Setup

1. Clone the repo
2. `npm install`
3. Copy `.env.example` to `.env` and fill in:
   - `VITE_SUPABASE_URL` - Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Supabase anon/public key
   - `VITE_MAPBOX_TOKEN` - Mapbox public access token
4. Run all SQL migrations in `supabase/migrations/` (001 through 011) in your Supabase SQL Editor
5. Enable Google OAuth in Supabase Authentication > Providers > Google
6. Add `http://localhost:5173` to Supabase Authentication > URL Configuration > Redirect URLs
7. `npm run dev`

## Deploy

```bash
vercel --prod
```
