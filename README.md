# 3D Learning Simulations — City of Wolverhampton College

A self-contained hub of interactive 3D learning simulations, organised by **curriculum area → course → simulation**. It's hosted on GitHub Pages and has no outside dependencies: the 3D library, QR code generator and narration audio are all stored in this repo.

## How it's organised

| Path | What it is |
|---|---|
| `index.html` | Hub home: the college's curriculum areas, plus a **General** section for cross-curricular simulations |
| `area.html?id=…` | One curriculum area: its courses and all of its simulations |
| `course.html?id=…` | Old course links: redirects to `area.html?id=…&course=…` (the area page filtered to that course) |
| `data/catalog.json` | The list of areas, courses and simulations. **Edit this to add things.** |
| `sims/<name>/` | Each simulation: `student.html` + `teacher.html` (or a single `index.html` with teacher notes built in), `audio/`, `thumb.jpg`. Every asset lives in the repo so each page is standalone. |
| `vendor/` | three.js r160 and qrcode-generator (MIT licences included) |

Curriculum areas and Construction courses were taken from [wolvcoll.ac.uk](https://www.wolvcoll.ac.uk/) on 14 November 2026.

## Sharing

Every simulation and every course page has:
- **Copy link**
- **Share to Google Classroom** — the teacher signs in, picks a class, and posts it as an assignment, material or announcement
- **QR code** — for projecting in class

## Adding a simulation

1. Put the files in `sims/<name>/` (`student.html`, `teacher.html`, `audio/`, `thumb.jpg`).
2. Add an entry to `sims` in `data/catalog.json`, listing its `areas` and `courses` IDs. Set `"general": true` if it suits several areas.
3. To add courses for another area, add them to `courses` with that area's `areaId`.

## Simulations

- **Cavity wall explorer** (Construction → Bricklaying, Bricklaying Level 2 C&G Diploma). City & Guilds 6705-23, Unit 206. Narration is by ElevenLabs (voice: Alice, British), with the browser's own voice as a backup.

Note: the teacher version contains model answers and the quiz answer key, and is public like the rest of the site.

## Staff sign-in

Students see a clean view: courses, simulations and "Open simulation" only.
Staff press **Staff sign in** and use their `@wolvcoll.ac.uk` Google account to switch on teacher mode
(Copy link, Share to Google Classroom, QR code and teacher versions). Teacher mode is remembered for 30 days in that browser.
`@students.wolvcoll.ac.uk` accounts stay in student view.

- Google sign-in client: project **3DResources** (Google Cloud, wolvcoll.ac.uk), audience *Internal*, allowed origin `https://techntel4u.github.io`.
- The check runs in the browser, so it hides the tools rather than locking them. Keep anything confidential (answer keys) in Drive shared with staff only.

## Offline, transcripts and worksheets

- **Installable and offline:** each card has a "Save for offline" button (saved sims are kept in a separate cache across updates).
- **Installable and offline (how):** `manifest.webmanifest` + `sw.js`. Pages and data load from the network first (updates show at once) and fall back to the saved copy offline. Opening a simulation saves every file listed in `sims/<id>/offline.json`.
- **Transcripts** (`sims/<id>/transcript.html`, everyone) and **worksheets** (`sims/<id>/worksheet.html`, shown to staff) are generated:
  `node tools/extract-text.mjs && node tools/build-pages.mjs` — run after adding or changing a simulation (this also rebuilds `offline.json`).
- **Audio:** narration is MP3, mono, 44.1 kHz, 80 kbps.
- **New badge:** simulations added in the last 45 days (`added` in the catalog) show as New.

## Usage stats

`assets/stats.js` sends anonymous counts to GoatCounter (no cookies, no names). Set `CODE` to the GoatCounter site code to switch it on.
Counted: page views (`/hub`, `/area/<id>`, `/sim/<id>`), and per simulation `narration-started`, `tour-complete`, `quiz-complete`,
`faults-complete` (cavity wall), `challenge-complete` (disc brakes) and a time-spent band (`time-2-5-min` etc.).
Not counted: staff in teacher mode, browsers with Do Not Track, automated tests.
