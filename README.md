# 3D Learning Simulations — City of Wolverhampton College

A self-contained hub of interactive 3D learning simulations, organised by **curriculum area → course → simulation**. It's hosted on GitHub Pages and has no outside dependencies: the 3D library, QR code generator and narration audio are all stored in this repo.

## How it's organised

| Path | What it is |
|---|---|
| `index.html` | Hub home: the college's curriculum areas, plus a **General** section for cross-curricular simulations |
| `area.html?id=…` | One curriculum area: its courses and all of its simulations |
| `course.html?id=…` | One course: its simulations, with sharing buttons |
| `data/catalog.json` | The list of areas, courses and simulations. **Edit this to add things.** |
| `sims/<name>/` | Each simulation: `student.html`, `teacher.html`, `audio/`, `thumb.jpg` |
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
