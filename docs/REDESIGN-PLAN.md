# UI/UX redesign plan: the rink as the hub (19 Oct 2026)

> Approved and implemented inline on 19 Oct 2026; kept as design history. `docs/HANDOFF.md`
> §10 records what shipped and what is still pending.

## Context

The site (https://figure-skating-explained.vercel.app, `main` at `2824f69`) has a solid 3D rink, rig, animation and scoring engine, but the shell around them still reads as an article site: the home page is a headline plus seven text cards, the rink is one nav link among four, and nothing on the rink explains what the skater just did or where the number came from. The maintainer wants visitors to **go through the rink first, then discover the elements and the scoring**, and asked for a UI/UX audit and a redo.

Decisions taken with the maintainer (19 Oct 2026): **home keeps a short landing with the live rink as its hero** (`/rink` stays the full-screen version); **full scope** (rink hub + nav + element pages + scoring pages, i.e. the overhaul plan's unfinished Wave 3 plus the hub); **all inline**, no agents, sequential commits, the usual implement → test → screenshot → commit loop, production deploy at the end.

## Audit: what is wrong today (production screenshots at 1280 and 390 px, taken at the time)

1. **No rink-first journey.** `/` is text-first (hero paragraph, two CTAs, cards, changes list); the rink is not even one of the seven cards. The rink is a dead end: it performs and tallies but never links to an element page or to `/scoring`; only the reverse link exists ("Perform it on the rink" in `JumpExplorer`/`SpinExplorer`).
2. **Rink chrome collides and hides the ice.** The HUD marker box (top-left, two lines) is overlapped by the palette header at `top-14`; the palette and protocol are exclusive (`panel: "palette" | "protocol" | null`), so the score is hidden while picking; on a phone the palette sheet covers 55 % of the screen with the steer pad floating over it (`rink-phone.png`); the two top-right icons (grid, clipboard) are unlabeled; hotkeys are explained only in grey text inside the Jumps tab; the palette's kind switcher is a `Segmented` that wraps ("Pairs" on its own row).
3. **Element pages open with prose, viewer below the fold.** `PageHeader` (eyebrow, 36–48 px title, paragraph) precedes every explorer; on the phone the Lutz viewer starts ~420 px down, on `/spins` the builder's viewer starts at y≈600 on desktop (three rows of controls first).
4. **Index pages are long articles with many canvases.** `/spins` mounts seven `ElementViewer`s (seven WebGL canvases, each with its own GLB clone and environment), `/jumps` three plus two in Flip-vs-Lutz. No lazy mounting.
5. **Controls are inconsistent.** `JumpExplorer`, `SpinExplorer`, `Calculator`, `Compare`, `FlipVsLutz`, `TurnExplorer`, `ChoreoExplorer`, `SpecialExplorer`, `PairExplorer`, `ScoringLab` hand-roll pills and native `<select>`s instead of `components/ui/*` (`Segmented`, `Select`, `Chip`, `Tabs`); the value card (code, base value, GOE table) is duplicated in `JumpExplorer` and `SpinExplorer`. `Compare` and `FlipVsLutz` still carry their own camera selects beside the player's camera menu (flagged in `docs/OVERHAUL-PLAN.md`, never removed).
6. **Nav shape.** "Compare" (a secondary tool) is top level; Sources only in the footer; the footer repeats nav links. No keyboard-shortcut help anywhere.
7. **Calculator on a phone** is a horizontally scrolling table; the total is below everything; AddElement is a wall of selects.
8. What is already good and must be kept: tokens and dark mode, focus rings, the player bar (one row, camera menu with "every preset is a starting point"), the drawer, the steering pad, the grouped nav skeleton, `data-camera`/`data-skater-ready` hooks for tests.

## The redesign

**The journey:** land on the ice → pick or trigger an element → read "what you just saw" (name, code, value, one line) → "About the Lutz" opens the lesson page (viewer first, with its rules and values in tabs) → "Perform on the rink" brings you back → the score dock explains the running total and hands the performed list to the calculator.

### Shell
- **Nav** (`components/SiteNav.tsx` `NAV`): `Rink` (link) · `Elements ▾` (Jumps, Spins, Steps, Choreo, Pairs, **Compare**) · `Scoring ▾` (How scoring works, Calculator, Decoder). Right side unchanged (Your skater, theme). Phone sheet gains Sources.
- **Footer** (`components/SiteFooter.tsx`): Sources · What changed for 2026-27 (`/sources#changes`) · Keyboard shortcuts (opens the dialog) · ISU credit. Still hidden on `/rink`.
- **Shortcuts dialog** (`components/ShortcutsDialog.tsx`, mounted in `app/layout.tsx`, `shortcuts` flag in `lib/uiStore.ts`, opened by `?` in the rink and the player, and from the footer): player keys (Space, ← →, F, C, T) and rink keys (← → hold, ↑ ↓ gear, B, 1–6, Q W E, R).
- **Home `/`** (`app/page.tsx`): hero = the live rink (`RinkApp mode="hero"`, `h-[min(75dvh,720px)] min-h-[480px]`, phone `70dvh`, rounded, bordered) with a one-line title above it; under it two door rows built from a new `ElementCard`: "Learn the elements" (Jumps, Spins, Steps, Choreo, Pairs, each with Watch + Perform) and "Understand the score" (How scoring works, Calculator, Decoder); then the 2026-27 changes as a `Disclosure`. The quad-Lutz hero viewer goes (one canvas on the home page, the rink).

### Rink hub (`app/rink/*`, used by `/rink` and the hero)
- **Two docks instead of one panel**: `Perform` (left) and `Score` (right), independently open on `sm+` (`/rink` opens Perform by default; the hero opens neither). Dock headers get text labels; the toggles stay top-right with labels. The HUD marker moves to top-centre in the rink (`Hud` gets `placement="top"`), so nothing collides.
- **Phone**: one non-modal bottom `Sheet` (new primitive) with tabs Perform / Score and a collapsed peek bar ("Now: triple Lutz · 5.90 total · Perform"), so the ice stays visible; `SteerPad` gets a compact form on `max-sm` (◀ ▶, one gear button that cycles coast → stroke → run → sprint, backward).
- **Perform dock** (`Palette.tsx` rebuilt on primitives): `Tabs` (scrollable) for Jumps / Spins / Steps / Choreo / Other / Pairs / **Programs**; jump call and edge as `Segmented` rows, the primary button reads "Perform 3Lz · 5.90"; spins grouped by position with the level `Segmented`; **Programs** = three mini programs (`app/rink/programs.ts`, hand-written `ViewerSpec[]`: a singles short-program set, a quad set, a pairs set) that queue everything and open the Score dock.
- **Learn card** ("What you just saw", `app/rink/LearnCard.tsx`): shown in the Score dock for the last performed element and as a dismissable toast above the bar when the dock is closed; title, code, base value, one-line blurb, buttons **About the {element}** and **How it is scored** (`/scoring#base-value`). Data from a new pure `learnFor(spec)` in `three/animation/catalog.ts` beside `captionFor`: jumps → `/jumps/[slug]` + `jump.summary`; spins with a family → `/spins/[code]` + family description; turns → `/steps?turn=bracket`; choreo → `/choreo?move=spiral`; specials → `/jumps?special=walley#not-listed`; pairs → `/pairs/[familyId]` via a `PairId → PairElementId` map. Protocol rows are clickable and show their card.
- **Score dock** (`Protocol.tsx`): Now / Up next / protocol rows / running total with one explanatory line ("every element at GOE 0; the judges' Grade of Execution adds or takes up to half the base value", link to `/scoring#goe`) / warnings / **Open in the calculator** (`/calculator?codes=4Lz,CCoSp4`, codes from `toElementSpecs` + `elementCode`) / Resurface / Clear.
- **First-visit intro** (`app/rink/Intro.tsx`, `localStorage` `fse-rink-intro`): one card, three lines (pick, steer, score), buttons "Show me" (queues the first mini program, opens Score) and "Got it"; reopenable from the shortcuts dialog.
- **Hero mode** (`RinkApp mode="hero"`): hotkeys bound to the rink container (focus on click) instead of `window`, so arrow keys still scroll the landing page; a `QuickStrip` of perform chips (3A, 4Lz, 3F, FCSp4, CCoSp4, twizzle, 5RLi, Mini program) above the bar; a "Full rink →" button to `/rink`. `?perform=` seeding stays on `/rink` only.

### Element pages (viewer first, lessons on tabs)
- New shared pieces: `components/ValueCard.tsx` (code, "Perform on the rink" as a primary `Button`, base value, GOE table; replaces the duplicated blocks in `JumpExplorer`/`SpinExplorer`), `components/ElementCard.tsx` (index and home doors: title, id, one line, Watch + Perform links, optional still), `components/LessonLayout.tsx` (compact header strip = eyebrow + h1 + one sentence; `lg:grid-cols-[1fr_320px]` with the rail `lg:sticky lg:top-20`; viewer 60 vh min 420 max 640 on desktop, 50 vh on phones; `Tabs` under the viewer for the long text), `PageHeader` gets `compact`.
- `ElementViewer` gains `lazy` (default on): a poster (ice-coloured box, caption, play icon) until it scrolls into view (`lib/useInView.ts`, IntersectionObserver, 200 px margin); the primary viewer of each page passes `lazy={false}`.
- `/jumps/[slug]`: controls as `Segmented` rows above the viewer; tabs How it works / How to spot it / Errors and calls / Where it is allowed; related jumps as `Chip`s. `/jumps`: compact header, `ElementCard` grid, base-value table, Flip vs Lutz (its camera chips removed; the left player's menu already drives both via the store subscription), then Reference (calling rules, signs, non-listed jumps) as `Disclosure`s; `SpecialExplorer` preselects from `?special=`; the standalone quad-Lutz viewer goes.
- `/spins` and `/spins/[code]`: builder first with regrouped controls (row 1 family `Select` + level `Segmented` + V `Chip`; row 2 feature `Chip`s, behind a `Disclosure` on phones; row 3 variation `Select`s); the four small viewers (FCSp, windmills, shapes, toe Arabian) become one `SpinGallery` with a `Segmented` chooser; positions keep their stills; the rest unchanged but lazy.
- `/steps`, `/choreo`, `/pairs`, `/pairs/[id]`: explorers on `Segmented`/`Chip`; `TurnExplorer`/`ChoreoExplorer` preselect from `?turn=`/`?move=` (wrapped in `Suspense`); compact headers; `PairExplorer` presets as `Chip`s.

### Scoring pages
- `/scoring`: `ScoringLab` as the hero on primitives; section anchors `#base-value`, `#goe`, `#levels`, `#components`, `#deductions` with an anchor-`Chip` row under the header (the rink links here).
- `/calculator`: segment/category as `Select`, examples as `Chip`s in a "Start from" row; element table becomes a card list under `md`; `AddElement` on `Tabs` + `Segmented` + `Select`; score panel sticky on desktop, a sticky bottom total bar on phones; **`?codes=`** import via new `elementSpecFromCode` in `lib/decoder/parse.ts` (reuses `parseJumpToken`; spins by family regex + level + V; `StSq`, `ChSq`, `ChSp`; otherwise `{ kind: "code" }` when `hasCode`). `app/calculator/page.tsx` wraps in `Suspense`.
- `/compare`: preset pairs as active `Chip`s, pickers as `Select`, its camera select removed (the left player's camera menu drives both).
- `/decoder`: breakdown as a card list, examples as `Chip`s.

## Waves (all inline; each step ends with tests green, screenshots viewed, a commit)

**Wave A: shell, home, rink hub**
1. Primitives and hooks: `components/ui/Sheet.tsx`, `components/ui/Disclosure.tsx`, `lib/useInView.ts`, `lib/useMediaQuery.ts` (`useSyncExternalStore`, server snapshot = desktop), `Hud` `placement`, `PageHeader` `compact`, `ValueCard`, `ElementCard`, `ShortcutsDialog` + `uiStore.shortcuts`, `ElementViewer` `lazy`. Commit.
2. Nav, footer, home landing with the hero rink (`RinkApp mode`, `QuickStrip`, container-scoped keys). Screenshots `/` at 1280 and 390. Commit.
3. Rink hub: `learnFor`, `LearnCard`, `programs.ts`, docks, rebuilt `Palette`, `Protocol` with the calculator link, `Intro`, compact `SteerPad`, phone `Sheet`. Unit tests `tests/learn.test.ts` (every spec kind yields an href among the site's routes; every mini program builds and its GOE-0 total matches `programTotal`). Screenshots `/rink` desktop and phone, hero, after a performed element. Commit.

**Wave B: element pages**
4. `LessonLayout` + jumps (`app/jumps/**`, `FlipVsLutz`, `SpecialExplorer`). Commit.
5. Spins (`app/spins/**`, `SpinGallery`). Commit.
6. Steps, choreo, pairs (`app/steps/**`, `app/choreo/**`, `app/pairs/**`, `PairExplorer`). Commit. Screenshots of every element route at both widths.

**Wave C: scoring pages**
7. `/scoring` anchors and lab. 8. `/calculator` (layout, primitives, `?codes=`, `tests/decoder.test.ts` round trip `elementSpecFromCode` → `elementCode` for the example programs). 9. `/compare`, `/decoder`. Commit each; screenshots.

**Wave D: ship**
10. Extend `tests/e2e/smoke.spec.ts`: `/` hero canvas mounts; `/rink` perform 3A from the dock → learn card with "About the Axel" linking to `/jumps/axel` and the total 8.00; phone viewport: sheet collapsed, canvas box ≥ 45 % of the viewport height, open Perform and perform; `/calculator?codes=4Lz,CCoSp4` shows 15.70; `/compare` has exactly one "Camera:" button; nav: Compare under Elements. `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm test:e2e`, `vercel deploy --prod --yes`, update `docs/HANDOFF.md` (§4 pages, §10 pending list) and the project memory. Commit.

## Files

- Shell: `app/layout.tsx`, `app/page.tsx`, `app/globals.css` (sheet/poster tokens only), `components/SiteNav.tsx`, `components/SiteFooter.tsx`, `components/Page.tsx`, `components/ShortcutsDialog.tsx` (new), `lib/uiStore.ts`, `lib/useInView.ts` (new), `lib/useMediaQuery.ts` (new), `components/ui/{Sheet,Disclosure}.tsx` (new) + `index.ts`.
- Rink: `app/rink/{RinkApp,Palette,Protocol,SteerPad,page}.tsx`, new `app/rink/{LearnCard,Intro,QuickStrip}.tsx`, `app/rink/programs.ts`, `three/animation/catalog.ts` (`learnFor`), `three/ElementPlayer.tsx` (`Hud` placement, `?` key), `three/RinkPlayer.tsx` (pass-through only).
- Elements: `components/{ElementViewer,ValueCard,ElementCard,LessonLayout,PairExplorer}.tsx`, `app/jumps/**`, `app/spins/**` (+ `SpinGallery.tsx`), `app/steps/**`, `app/choreo/**`, `app/pairs/**`.
- Scoring: `app/scoring/**`, `app/calculator/**`, `app/compare/Compare.tsx`, `app/decoder/Decoder.tsx`, `lib/decoder/parse.ts` (`elementSpecFromCode`).
- Tests: `tests/learn.test.ts`, `tests/decoder.test.ts` (new), `tests/e2e/smoke.spec.ts`.
- Not touched: `three/rig/**`, `three/animation/{timeline,jumps,spins,steps,special,pairs,place,stroking,program}.ts` (the program store API `perform/queue/history/marks/setSteer/setGear/setBackward/resurface/reset` is used as is), `three/Stage.tsx`, `three/Arena.tsx`, `three/SkaterModel.tsx`, `tools/blender/**`, `data/**` (read only; `?turn=`/`?move=` use existing ids).

## Reuse

`createProgramStore`, `programTotal`, `programWarnings` (`three/animation/program.ts`); `buildTimeline`, `captionFor`, `toElementSpecs`, `specFromCode` (`three/animation/catalog.ts`); `elementCode`, `jumpSovCode` (`lib/scoring/elements.ts`); `parseJumpToken`, `decode` (`lib/decoder/parse.ts`); `SOV`, `hasCode`, `baseValueOf` (`lib/scoring/sov.ts`); `scoreProgram`, `validateProgram`; `Actor/Trace/IceArrows/CameraRig/Hud/PlayerControls` exports of `three/ElementPlayer.tsx`; `components/ui/*` (`Button`, `IconButton`, `Segmented`, `Select`, `Chip`, `Tabs`/`TabPanel`, `Drawer`, `Swatches`, `cn`); `useUiStore`; `useSkaterStore`; `JUMPS`/`JUMP_BY_ID`/`JUMP_BY_SLUG`/`ROTATION_NAMES`, `SPIN_FAMILIES`, `TURN_SPECS`, `CHOREO`, `SPECIALS`, `PAIR_PRESETS`, `PAIR_ELEMENT_BY_ID`; `scripts/shot.mts` for screenshots (`CLIP`, `SKATER`).

## Verification (definition of done)

- `pnpm test` (360 + new learn/decoder suites), `pnpm typecheck`, `pnpm lint`, `pnpm build` (static pages unchanged plus nothing removed), `pnpm test:e2e` (21 + new) all green against `pnpm dev` on :3000 (`allowedDevOrigins` already covers 127.0.0.1).
- Screenshots viewed at 1280 and 390 px for every route: `/` shows the rink in the first screen and no second canvas; `/rink` desktop shows both docks open without overlapping the HUD; `/rink` phone shows the peek bar with more than half the viewport of ice; performing an element shows the learn card and the "About …" link lands on the right page; the element pages show the viewer within the first screen on desktop and no horizontal scroll on the phone; `/spins` mounts one canvas at load (others posters); `/compare` and `/jumps#flip-vs-lutz` have a single camera control; the calculator total is visible on a phone without scrolling the table.
- Lighthouse accessibility ≥ 95 on `/`, `/rink`, `/jumps/lutz`, `/calculator` (keyboard focus visible on every new control, labels on every icon button, the sheet is non-modal and reachable by Tab).
- Production deployed and `docs/HANDOFF.md` §10 updated with the new pending list (drawer preview stage, hair stills, finding [2], hair physics remain).

## Out of scope (unchanged from the handoff's later list)

Hair physics, drawer live-preview stage, hair-style stills, review finding [2], toe-pick starts and hockey stops, quiz mode, Ice Dance, localisation.
