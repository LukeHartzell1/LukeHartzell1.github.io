# lukehartzell1.github.io

My personal site. Same sections as always (About, Education, Experience, Projects, Skills, Contact), but every section, role, and project is dressed as the thing it's about. It opens outside a galaxy: the camera dives in, a star ignites, and six planets (one per chapter of my story) swing into orbit while my name assembles and an "I'm a ..." reel spins and lands. About is my room as a little 3D diorama you can look around, Education is a notebook page with a report card, the Snowflake role is an agent session in a terminal, AWS is an ops console, Chamberlain is a test report, Gopu is a restroom map, LiftIQ is a workout tracker, and so on. The overviews and Contact share the hero's night sky (with a note for AI agents). Each world also has its own 3D sculpture, built in code with three.js.

Hand-written HTML, CSS, and vanilla JS. No build step, no frameworks, no trackers. GitHub Pages serves it straight from the repo.

## How it works

Every 3D piece is a `.stage` element on the page. One shared WebGL renderer (`js/engine.js`) draws each stage's scene and copies the pixels into that stage's own `<canvas>`, so the 3D scrolls perfectly with the page and many scenes can share a single GPU context. Only stages near the viewport render, quality drops automatically on slow devices, and `prefers-reduced-motion` gets still frames.

| File | What it is |
| --- | --- |
| `index.html` | The page: the universe (hero), then one themed world per section, role, and project |
| `style.css` | All styles, in numbered sections. Every world is a `.band` with a `theme-*` class that sets a few tokens (`--band-bg`, `--band-fg`, `--band-accent`...) on one shared skeleton. Three type families: Archivo, IBM Plex Mono, Literata |
| `js/main.js` | Page behavior: the hero's reveal and word reel, each world's one-time entrance, the nav that takes the colors of the world under it, the tour of my room, the quiz, the card, the projects gallery, booting the 3D |
| `js/engine.js` | The shared renderer, stage mounting, crossfades, input, and adaptive quality |
| `js/kit.js` | Shared palette, easing, materials, text labels, shadows, and the camera rig |
| `js/scenes/` | The scenes: `hero.js`, `room.js` (About), `work.js` (education + experience), `vip.js` (the two Georgia Tech VIP roles), `projects.js`, `extras.js` (keyboard + paper plane), `builders.js` (shared models) |
| `vendor/three/` | three.js r169 (only the files the site imports) |
| `gym-app.html`, `beelinguapp-redesign.html` | UX case studies |
| `images/opt/` | Optimized images the site loads (originals in `images/`) |
| `old_files/` | The 2023 site, for posterity |

## The 3D pieces

| Section | Scene | What it shows |
| --- | --- | --- |
| Hero | `hero` | A dive into a spiral galaxy; a liquid-pearl star ignites and six planets fly in, one per "I'm a ..." word (an ice world with a snowflake moon, a world ringed with practice cards, a neon world shedding hearts, an orange giant with a λ moon, a navy world with a mortarboard moon, a teal world with a dumbbell moon). The reel's word picks the planet in focus; labels ride along in HTML |
| About | `room` | My room at dusk: desk and CoCo terminal, a corkboard of practice cards, a skyline window, a ring-light phone shedding hearts, a bookshelf with my cap, a trophy shelf, a gym corner, and a beanbag by the TV. It builds itself, and every marked spot opens a line of my story |
| Education | `education` | A 4.0 built one course at a time, topped with a grad cap |
| Snowflake | `snowflakeRole` | An ice crystal growing its branches, orbited by my two CoCo skills: a clapperboard (agentic video editor) and a demo screen (agentic demo maker) |
| Interview Prepper | `habitLoop` | Practice cards riding a Möbius habit loop |
| TikTok effects | `arPhone` | My face on a phone; pixel shades drop on cue |
| AWS | `router` | Events stream in, a λ router drops the noise before on-call |
| Chamberlain | `garage` | A garage door of test cases: scan, escalate 2 bugs, ship |
| AI Makerspace Nexus | `studyBuddy` | StudyBuddy at work: a lecture is recorded and its slide OCR-scanned, the capture streams into a GPU rack, and notes write themselves (summary and tags too) before going out to students' phones |
| Intelligent Tutoring | `tutor` | A student's BST insert is missing its base case: the tutor bot hints in chat, the fix types in, the tests pass, 42 drops into the tree, and a quiz card checks the idea |
| Teaching assistant | `hall` | 900 students; help ripples out from the front |
| Projects | `spotify`, `identifai`, `gopu`, `fog`, `book`, `squat` | A record with a live EQ ring, a recognition reticle naming faces, restroom pins filtered down on a city map, you hidden among decoy personas, a story book with greetings, and a squat with an AI form coach |
| Skills | `keyboard` | A keyboard where every keycap is a skill (type on yours to press them) |
| Contact | `plane` | A paper plane among small planets; "Email me" launches it |

## Easter eggs

- **The trading card** in About tilts with your cursor (its foil shifts color) and flips on click.
- **My room** gives itself a tour until you pick a spot: click a marker or the thing itself.
- **The planets' labels** in the hero: hover one to spin the reel to that word.
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
