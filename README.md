# lukehartzell1.github.io

My personal site. Same sections as always (About, Education, Experience, Projects, Skills, Contact), but every section, role, and project is dressed as the thing it's about: About is a game's character-select screen, Education is a notebook page with a report card, the Snowflake role is an agent session in a terminal, AWS is an ops console, Chamberlain is a test report, Gopu is a restroom map, LiftIQ is a workout tracker, and so on. The hero cycles through "I'm a ..." with each word dressed as its world, and Contact ends back in the lobby (with a note for AI agents). Each one also has its own 3D sculpture, built in code with three.js.

Hand-written HTML, CSS, and vanilla JS. No build step, no frameworks, no trackers. GitHub Pages serves it straight from the repo.

## How it works

Every 3D piece is a `.stage` element on the page. One shared WebGL renderer (`js/engine.js`) draws each stage's scene and copies the pixels into that stage's own `<canvas>`, so the 3D scrolls perfectly with the page and many scenes can share a single GPU context. Only stages near the viewport render, quality drops automatically on slow devices, and `prefers-reduced-motion` gets still frames.

| File | What it is |
| --- | --- |
| `index.html` | The page: the lobby (hero), then one themed world per section, role, and project |
| `style.css` | All styles, in numbered sections. Every world is a `.band` with a `theme-*` class that sets a few tokens (`--band-bg`, `--band-fg`, `--band-accent`...) on one shared skeleton. Three type families: Archivo, IBM Plex Mono, Literata |
| `js/main.js` | Page behavior: the hero's lights-up moment, each world's one-time entrance, the nav that takes the colors of the world under it, the RPG dialogue, the quiz, the card, the projects gallery, 8-bit mode, booting the 3D |
| `js/engine.js` | The shared renderer, stage mounting, crossfades, input, adaptive quality, and the 8-bit pixel pass |
| `js/kit.js` | Shared palette, easing, materials, text labels, shadows, and the camera rig |
| `js/scenes/` | The scenes: `hero.js`, `work.js` (education + experience), `projects.js`, `extras.js` (keyboard + paper plane), `builders.js` (shared models) |
| `vendor/three/` | three.js r169 (only the files the site imports) |
| `gym-app.html`, `beelinguapp-redesign.html` | UX case studies |
| `images/opt/` | Optimized images the site loads (originals in `images/`) |
| `old_files/` | The 2023 site, for posterity |

## The 3D pieces

| Section | Scene | What it shows |
| --- | --- | --- |
| Hero | `hero` | A liquid pearl with six miniatures in orbit, one per "I'm a ..." word; the current word's miniature swings to the front |
| About | `profile` | A character-select pedestal for the trading card, with the card's five energy types orbiting |
| Education | `education` | A 4.0 built one course at a time, topped with a grad cap |
| Snowflake | `snowflakeRole` | An ice crystal growing its branches, orbited by my two CoCo skills: a clapperboard (agentic video editor) and a demo screen (agentic demo maker) |
| Interview Prepper | `habitLoop` | Practice cards riding a Möbius habit loop |
| TikTok effects | `arPhone` | My face on a phone; pixel shades drop on cue |
| AWS | `router` | Events stream in, a λ router drops the noise before on-call |
| Chamberlain | `garage` | A garage door of test cases: scan, escalate 2 bugs, ship |
| AI Makerspace Nexus | `gpuScan` | A lecture slide gets scanned on a GPU; tags and a summary pop out |
| Intelligent Tutoring | `bstTutor` | A tutor orb walks a binary search tree |
| Teaching assistant | `hall` | 900 students; help ripples out from the front |
| Projects | `spotify`, `identifai`, `gopu`, `fog`, `book`, `squat` | A record with a live EQ ring, a recognition reticle naming faces, restroom pins filtered down on a city map, you hidden among decoy personas, a story book with greetings, and a squat with an AI form coach |
| Skills | `keyboard` | A keyboard where every keycap is a skill (type on yours to press them) |
| Contact | `plane` | A paper plane; "Email me" launches it |

## Easter eggs

- **8-bit mode** (top-right button, the footer link, or ↑↑↓↓←→←→BA): every 3D scene drops to a dithered four-color palette.
- **The trading card** in About tilts with your cursor and flips on click; the dialogue box next to it pages through like an RPG.
- **The quiz** in the tutoring world actually checks your answer.

## Editing

- **Copy:** it's all in `index.html`.
- **A new 3D scene:** add a function to one of the files in `js/scenes/` that returns `{ scene, camera, update(state) }` (use `stage()` and `rig()` from `js/kit.js`), register it in `js/scenes/index.js`, then put `<div class="stage" data-scene="yourName"></div>` in the page.
- **A new role or project:** copy an `<article class="band theme-…">` (or a `.slide` in the gallery), point its `.stage` at a scene with `data-scene`, and pick or add a `theme-*` block in `style.css`. Mark anything that should appear in sequence with `data-step`.

## Run it locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```
