# Overhaul plan: simpler UI, a freeplay rink, a free camera, and a skater appearance editor

Approved by the user on 15 Oct 2026. Wave 0 landed in commit `b67ce06` (this file is the brief every wave agent reads first).

## Context

The site (https://figure-skating-explained.vercel.app, `main` at `bed2818`) teaches the ISU 2026-27 elements with a 3D rigged skater, and the animation, rig and scoring layers are now solid after waves 0–2. The user's verdict on the shell around them: the UI/UX is "a bit terrible", and three things are missing:

1. A **freeplay area**: a full rink/arena where the visitor picks elements and the skater performs them there, one after another, with the elements we already have shown in that arena.
2. A **free camera**: zoom and look from any angle, in addition to the preset angles we offer.
3. An **appearance editor** for the athlete: hair style, length and colour, skin tone, dress/outfit choices and colours, costumes, for both bodies.

What the screenshots of the current site show (desktop 1280 px and phone 390 px, scratchpad `ux/`): a 10-link top nav that wraps to three rows on a phone; every element page opens with a paragraph before the viewer; the player bar wraps into two rows because the Skater and Costume selects live in it; the same camera choice exists twice (a select in the player and chips under the viewer on `/jumps/[slug]`, `/spins`, `/compare`, `/jumps#flip-vs-lutz`); HUD boxes stack top-left and cover the skater; the "Free orbit" camera is a separate mode, so dragging in the default Follow view does nothing.

Everything below reuses the existing player (`three/ElementPlayer.tsx`), stage (`three/Stage.tsx`, `three/Rink.tsx`), timelines (`three/animation/*`), the pose catalogue, the scoring engine (`lib/scoring/*`) and the Blender pipeline (`tools/blender/build_skater.py`). No new 3D assets are needed beyond what that script builds.

## Decisions taken (change any of these before we start)

| Decision | Chosen | Alternative |
|---|---|---|
| Freeplay interaction | **Pick-and-perform**: click an element (or press a hotkey) and the skater performs it from where she is; elements queue; a short stroking link joins them; the trace stays on the ice; a running protocol and TES tally beside the rink | Arcade steering (arrow keys to stroke/turn, trigger elements on the fly): listed as a stretch item at the end, not in the core waves |
| Appearance variants | **One GLB per body** carrying every hair style, both skirts and sleeve regions; the viewer toggles node visibility and recolours materials by name (GLB grows from ~1.2 MB to an estimated ≤2.5 MB; fonts and the Three bundle are bigger) | One GLB per outfit combination (9+ files per body, every change refetches) |
| Icons | add `lucide-react` (tree-shaken, ~1 KB per icon) | hand-written inline SVGs |
| Navigation | 4 top-level entries (Elements, Scoring, Rink, Compare) + "Your skater" button + theme toggle; Sources in the footer | keep 10 flat links behind a hamburger |
| Execution | the user's orchestrated-waves process (worktree agents, two at a time, orchestrator verifies, stop when the usage hook blocks, 75 % cap) | inline, one track at a time |

Prerequisites before Wave 0: the Wave 3 review workflow (`wf_b84b04f1-323`, still in its verify phase) lands first (apply confirmed findings, test, commit, deploy); delete the stray untracked `tests/_verify_biellmann.test.ts` a refuter left in the main checkout; `pnpm add lucide-react`.

## Wave 0: contracts (orchestrator, inline, one commit)

Everything two agents would both touch is written first, with failing tests.

- **`three/skaterStore.ts` v2.** Replace the costume-id model with an `Appearance`:
  `{ skin: hex; hair: { style: HairStyle; length?: "short"|"medium"|"long"; colour: hex }; outfit: { sleeves: "none"|"short"|"long"; skirt: "short"|"long"|"none" (woman only); gloves: boolean; colours: { top, skirt, legs, glove, boot } } }`, one per body (`variant` stays `"female"|"male"`). `HAIR_STYLES` per body (woman: `lowBun` (today's), `highBun`, `ponytail`, `loose`, `bob`; man: `quiff` (today's), `crop`, `sidePart`, `sweptBack`), `SKIN_TONES` (6 swatches), `LOOKS` (today's 9 costume presets become full looks, plus 3 new ones), `lookFor`, `defaultAppearance(variant)`. Persist `fse-skater` **version 2** with a `migrate` from v1 (`costume.female = "ruby"` → the ruby look). `useSkaterStore` keeps `variant/setVariant`; `setAppearance(variant, patch)` deep-merges.
- **GLB contract** (constants in the same file, asserted by a test): material names `skin, hair, top, skirt, legs, glove, boot, sleeve_upper, sleeve_lower`; variant node names `hair.<style>` (ponytail and loose also `hair.ponytail.<length>`, `hair.loose.<length>`), `skirt.short`, `skirt.long`. Sleeve length is a recolour (upper/lower regions take the top colour or the skin colour); gloves off recolours `glove` to skin. Bone names and the bind pose stay the hard contract they already are.
- **`three/animation/place.ts`.** `Placement = { x, z, yaw }`; `placeTimeline(tl, p)` returns a new `Timeline` with `root`, `trace`, `arrows` (centre and `startAngle`), `focus`, `heading` and the `partner` track moved by the rigid transform; `endOf(tl)` (position and heading at `duration`); `linkTimeline(from: Placement, turn: radians, seconds)` (a stroking connector built from `POSES.glideFO/glideBO/stand`, flat/outside trace, used between elements and for the idle loop); `keepInRink(p, aheadMetres)` (turns the heading toward the centre when the next path would leave the 60 × 30 m surface from `RINK` in `three/Rink.tsx`).
- **`three/animation/store.ts`.** Camera state becomes `{ preset: CameraPreset; track: boolean }` with `CameraPreset = "follow"|"side"|"front"|"overhead"|"low"|"close"|"arena"|"free"`; `setPreset`, `setTrack`. `CameraMode` stays as a type alias of `CameraPreset` so the dev labs compile; `"orbit"` is removed.
- **`components/ui/`** primitives on the existing tokens: `Button`, `IconButton`, `Segmented`, `Select`, `Chip`, `Tabs`, `Drawer` (right sheet, focus-trapped, Escape closes), `Toolbar`, `Swatches` (+ a `<input type="color">` custom swatch). Tokens in `app/globals.css`: a tighter type scale, `--radius`, consistent control height (36 px), touch targets ≥ 40 px, and a `[data-theme]` override so a toggle can force light/dark.
- **Nav shell.** `components/SiteNav.tsx`: Elements (Jumps, Spins, Steps, Choreo, Pairs) as a dropdown on desktop and a sheet on mobile, Scoring (How scoring works, Calculator, Decoder), Rink, Compare; right side "Your skater" (opens the drawer, Wave 2 fills it) and the theme toggle. `components/SiteFooter.tsx` gets Sources and the ISU credit. `app/layout.tsx` mounts the drawer once.
- **Failing tests:** `tests/place.test.ts` (rigid transform keeps distances and relative yaw; `endOf` of a placed Lutz equals the placed end point; `linkTimeline` starts at `from` and ends turned by `turn`; `keepInRink` turns a heading pointing at the boards back inside), `tests/glb.test.ts` (reads the GLB JSON chunk with `fs`, asserts the material names and variant nodes above exist in both bodies and that `hair.lowBun` / `hair.quiff` and `skirt.short` are the only variant nodes visible by default), `tests/appearance.test.ts` (v1 → v2 migration, every look resolves, `applyAppearance` on a fake wardrobe sets the right colours and visibilities, sleeves and gloves map to skin colour).

## Wave 1: two agents in worktrees

### Agent 1A, model (owns `tools/blender/build_skater.py`, `public/models/*.glb`, `three/SkaterModel.tsx`, `tests/glb.test.ts`)

- Build every hair style into the GLB, each as its own object named per the contract, parented to `head`: the existing cap + bun become `hair.lowBun`; `hair.highBun` (bun at the crown); `hair.ponytail.{short,medium,long}` (cap + a tapered `skin_chain` from the nape, like the boot shaft, 12/22/32 cm; weighted head); `hair.loose.{short,medium,long}` (cap + a hair shell: an enlarged ellipsoid cut below the jaw / at the shoulders / at the shoulder blades, weighted head→neck→chest by height so it drapes in a layback); `hair.bob` (cap cut at jaw level, fringe kept). Man: `hair.quiff` (today's), `hair.crop` (cap only, hairline 1 cm higher), `hair.sidePart` (cap + a fringe ellipsoid swept to one side), `hair.sweptBack` (quiff rotated back). Only the default style has `hide_render`/visibility on at export (glTF exports visibility as node extras; the runtime sets visibility by name anyway).
- Paint `sleeve_upper` (shoulder→elbow, `u ≤ 0.50` on the arm axis) and `sleeve_lower` (elbow→wrist up to the glove) as separate materials on both bodies inside `region()`; the woman's dress shell stays sleeveless (sleeves are skin-tight, painted, like the man's shirt). Build both skirts (`skirt.short`, `skirt.long`) with the existing ring builder and weighting. Keep one `skin` material. Drop `--sleeves/--skirt` (runtime now); keep `--palette`, `--neckline`, `--preview`.
- `three/SkaterModel.tsx`: `applyAppearance(wardrobe, appearance)` replaces `applyCostume`: colours by material name (sleeves/gloves to skin when off), visibility by node name (unknown names ignored so an older cached GLB still renders). `cloneMaterials` also indexes nodes by name.
- Verify: Blender `--preview` renders per style; `/dev/pose?pose=stand|layback|biellmann&cam=iso` shots per hair style and skirt (loose hair must not pierce the back in the layback; the long skirt must clear the knee in a sit); GLB sizes; `tests/glb.test.ts` green; stills in `public/poses` unchanged (default look identical, same byte size is the goal).

### Agent 1B, player (owns `three/ElementPlayer.tsx`, `three/Stage.tsx`, `three/animation/place.ts`, `three/animation/store.ts`, `tests/place.test.ts`, the camera chips in `app/jumps/[slug]/JumpExplorer.tsx`, `app/spins/SpinExplorer.tsx`, `app/compare/Compare.tsx`, `app/jumps/FlipVsLutz.tsx`)

- **Camera.** `OrbitControls` always enabled (`enablePan` off, touch: one finger rotates, two fingers zoom, wheel zooms, `minDistance` 1.2, `maxDistance` 60). Each frame with `track` on, `CameraRig` moves `controls.target` to the skater and shifts the camera by the same delta, so the viewer's own angle and zoom survive. A preset animates the spherical offset (`follow` = today's offset, `side`, `front`, `overhead` = polar 2°, `low` = eye 0.4 m, `close` = 2.2 m at the chest, `arena` = (0, 18, 30) looking at the rink centre with `track` off). The controls' `start` event sets `preset = "free"` without touching `track`. Result: every angle we offer is a starting point the viewer can orbit and zoom from.
- **Toolbar and HUD.** One row: play/pause icon, scrubber, time, speed cycle button (¼ ½ 1×), camera menu (preset chips + "Track skater" switch), loop toggle, fullscreen (container `requestFullscreen`), "Your skater" icon (opens the global drawer). Skater and Costume selects leave the player. HUD: one compact top bar (marker label, detail on hover/tap, rotation counter right), arrow legend as small chips bottom-left, caption pill bottom-centre above the bar, value pop beside the counter. Keyboard: Space, ←/→, F fullscreen, C cycles presets, T toggles tracking.
- Remove the duplicate camera chips in the four files above (FlipVsLutz keeps its shared camera by calling `setPreset` on both stores).
- Implement `place.ts` per the contract; make `tests/place.test.ts` green.
- Verify: Playwright drags on the canvas and asserts the camera position changed and the preset reads "free"; wheel changes distance; preset chips restore; screenshots of `/jumps/lutz` desktop and 390 px with the new bar (one row), `/compare` in sync.

## Wave 2: two agents in worktrees

### Agent 2A, rink (owns `app/rink/*`, `three/RinkPlayer.tsx`, `three/Arena.tsx`, `three/animation/program.ts`, `three/animation/catalog.ts` additions, `tests/program.test.ts`, "Perform on the rink" buttons)

- **Route `/rink`** ("Rink" in the nav): the stage fills the viewport under the nav (footer hidden on this route); a collapsible palette on the left (phone: bottom sheet), the protocol panel on the right (phone: a tab).
- **`three/Arena.tsx`**: `Rink` plus plexiglass above the boards, kick plate, a ring of stepped dark stands, two light rigs; markings toggle; persistent traces (history from the program store, fading by age) and a "Resurface" button that clears them.
- **`three/animation/program.ts`** (zustand store): `queue: ViewerSpec[]`, `history: { spec, placement, timeline, protocol }[]`, `current`, `placement`; `perform(spec)` = `placeTimeline(buildTimeline(spec), keepInRink(endOf(previous)))` after a `linkTimeline` connector (2 s, turning toward the rink when needed); idle = a looping stroking circle from `linkTimeline` so the skater never freezes; `reset()` returns to centre ice. Pairs: specs of `kind: "pair"` switch the partner on; placement moves both tracks (already supported by `placeTimeline`).
- **`three/RinkPlayer.tsx`**: the existing `Actor`, `Trace`, `IceArrows`, `CameraRig` from `ElementPlayer` (export them) driven by the program store; the player store's `time` runs within the current timeline; `arena` and `follow` presets; the HUD counter and caption as in the player.
- **`app/rink/Palette.tsx`**: tabs Jumps (jump × rotations × call/edge, from `JUMPS` and `jumpSovCode`), Spins (`SPIN_PRESETS` plus any family at a level via `spinFromSpec`), Steps (`TURN_SPECS`), Choreo (`CHOREO`), Special (`SPECIALS`), Pairs (`PAIR_PRESETS`); click performs now or queues; queue chips removable; hotkeys 1–6 = T S Lo F Lz A at the chosen rotation, Q W E = camel, sit, combination spin, R resurface, Space pause.
- **`app/rink/Protocol.tsx`**: each performed element with its code and base value (`captionFor`), GOE 0, running TES via `scoreElement` (`lib/scoring/value.ts`) through a new `toElementSpec(ViewerSpec): ElementSpec | undefined` in `three/animation/catalog.ts`; warnings from `validate.ts` (repetition/Zayak, box counts) as the list grows; "Clear".
- Deep link `/rink?perform=4Lz,CCoSp4` preloads the queue; "Perform on the rink" buttons in `JumpExplorer`, `SpinExplorer` and the pair pages.
- Verify: `tests/program.test.ts` (consecutive placements are continuous in position and yaw; a Lutz performed near the boards is turned inside; TES after 4Lz + CCoSp4 = 15.70 with GOE 0; a third 4Lz raises the repetition warning); Playwright performs 3A then CCoSp4 and reads the tally; screenshots `arena` preset with three traces, phone layout.

### Agent 2B, appearance (owns `components/SkaterDrawer.tsx`, `three/skaterStore.ts` looks and defaults, `tests/appearance.test.ts`, `public/looks/*`)

- **`components/SkaterDrawer.tsx`** (global, opened from the nav and the player): sections Body (Woman / Man), Skin (6 swatches + custom), Hair (style cards with small stills, length segmented control where the style has one, colour swatches + custom), Outfit (sleeves none/short/long, skirt short/long/none for the woman, gloves on/off, colour per piece: top, skirt, legs, gloves, boots, swatches + custom), Looks (the preset gallery, "Reset to default"). A live preview `Stage` inside the drawer with the skater in `stand`, orbitable, so changes are seen before closing.
- Generate the hair/look stills into `public/looks/` with `scripts/shot.mts` against `/dev/pose?pose=stand&cam=head&hair=<style>` (add the `hair`/`look` query handling to `app/dev/pose/PoseLab.tsx`).
- Verify: `tests/appearance.test.ts` green; Playwright opens the drawer, picks the ponytail and the long skirt, reloads `/jumps/axel` and asserts (via a `data-appearance` attribute the model sets on `body`) that the choice persisted; screenshots of 4 looks in the layback and the sit.

## Wave 3: two agents in worktrees, the content pages

Both work on the Wave 0 primitives; the orchestrator splits the files so they never overlap.

- **Agent 3A, Elements pages** (`app/page.tsx`, `app/jumps/**`, `app/spins/**`, `app/steps/**`, `app/choreo/**`, `app/pairs/**`): viewer first on every element page (full width, 60 vh, min 420 px), one-sentence intro with an "About this element" disclosure for the long text, `Tabs` Watch / Rules / Values beside or under the viewer, controls as `Segmented` rows (rotations, call, edge; family, level, features), the value card sticky on desktop, index pages as compact card grids (spins keep the stills), the home page as the Lutz hero plus four big doors (Elements, Scoring, Rink, Compare) and the 2026-27 changes strip.
- **Agent 3B, Scoring pages** (`app/scoring/**`, `app/calculator/**`, `app/compare/**`, `app/decoder/**`, `app/sources/**`): calculator as two columns with a sticky score panel and the element picker on `Tabs`, compare with the preset pairs as chips and one camera menu for both, decoder with the breakdown as a card list, scoring page with the GOE slider demo as the hero.
- Both: phone layout at 390 px (no horizontal scroll, controls wrap into `Segmented` rows, viewer height 50 vh), keyboard focus visible, `prefers-reduced-motion` respected (already in the player).
- Verify: desktop and phone screenshots of every route; `pnpm test:e2e` (extend `tests/e2e/smoke.spec.ts` with `/rink`, the drawer, the camera drag, the new nav).

## Wave 4: review and ship (orchestrator)

One review workflow over `git diff <wave0>..HEAD` with two lenses (UX and accessibility; code correctness over the placement maths, the program store, the appearance mapping and the Blender changes) and two refuters per finding, two agents at a time; fix confirmed findings only. Then `pnpm test && pnpm typecheck && pnpm lint && pnpm build`, `pnpm test:e2e`, production deploy with `vercel deploy --prod --yes`, update `docs/HANDOFF.md` (§4 architecture, §7 log, §9 gaps) and the project memory.

Usage: report usage between waves; if the hook blocks, stop and ask for `fetch-usage.sh`; stay under 75 %.

## Verification (definition of done, checked by the orchestrator)

- Unit: `pnpm test` green with the new `place`, `glb`, `appearance`, `program` suites; `pnpm typecheck`, `pnpm lint`.
- Camera: on `/jumps/lutz` a drag changes the view and keeps following the skater; wheel zooms; every preset chip restores its angle; the same on a phone viewport with touch.
- Rink: perform 3A, CCoSp4, 4Lz from the palette and by hotkeys; the skater stays on the ice, traces persist, the protocol shows 8.00, 4.20, 11.50 and the running total; `arena` preset shows the whole rink; `?perform=` deep link works.
- Appearance: change hair, skin, sleeves, skirt, colours in the drawer; every viewer on the site and the rink reflects it after reload; the default look renders byte-identical stills.
- UI: nav fits in one row at 390 px (sheet for groups); player bar is one row at 1280 px and two at 390 px; no page has the duplicate camera control; Lighthouse accessibility ≥ 95 on `/jumps/lutz` and `/rink`.
- `pnpm build` (61 static pages with `/rink`), production deploy, handoff updated.

## Later (not in these waves)

Arcade steering on the rink (arrow keys stroke and turn, elements triggered on the fly), program timer with SP/FS limits on the rink, shareable look URLs, hair physics, face variants, Ice Dance, quiz mode.
