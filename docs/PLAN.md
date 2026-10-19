# Figure Skating Explained — interactive 3D guide to ISU elements (2026-27 rules)

## Context

You want a public website (deployed on Vercel) that teaches people what the components of figure skating are: the six jump types and their rotation counts (singles through quads, now quints), spins and their positions/levels, step and choreographic sequences, and how the ISU Judging System scores them. The content must come from the official ISU documents you listed in `links.md`.

Decisions already made with you:
- **3D approach:** rigged humanoid character with authored animation clips (not a procedural stick figure).
- **Scope v1:** Single Skating only. Pair Skating (lifts, twists, throws, death spirals) is phase 2; the data model is designed so pairs slot in later.
- **Extras:** program score calculator, side-by-side compare mode, protocol abbreviation decoder. (Quiz deferred.)

Environment facts checked: Node 22.23, pnpm 11.18, Vercel CLI 54.14 logged in (outdated, upgrade recommended), git 2.43, project dir is not a git repo yet. Blender 5.1.2 is installed locally (usable headless; the Blender MCP server is not currently running). The Agent tool is blocked by your usage-cap hook, so this plan was written without sub-agents.

## Source material (saved in the repo)

All 9 links in `links.md` resolved, plus two ISU Communications that were missing from the list. Original PDFs are in `docs/isu/pdf/`, text extractions in `docs/isu/text/`, and `docs/isu/README.md` describes each one.

| Document | Text file in `docs/isu/text/` |
|---|---|
| TP Handbook Singles 2026-27 (34 pp) – element definitions, spin positions, level features, jump rules | `TP-Handbook-Singles-2026-27.txt` |
| TP Handbook Pairs 2026-27 (43 pp) | `TP-Handbook-Pairs-2026-27.txt` |
| Special Regulations & Technical Rules S&P 2026 (96 pp) – Rules 610-621, 352-353, 500-504 | `ISU-Special-Regulations-Technical-Rules-Single-Pair-2026.txt` |
| Handbook for Referees & Judges 2026-27 (19 pp) – GOE Q&A | `Handbook-Referees-Judges-Single-Pair-2026-27.txt` |
| Program Components chart (Jul 2024), S&P component charts, thinking words, deductions responsibility, RTD guidelines | `Program-Components-Chart-2024-07.txt`, `Single-Pair-Component-Charts-2024.txt`, `Thinking-Words-Program-Components-Scale.txt`, `Who-Is-Responsible-For-Deductions-2024-25.txt`, `RTD-Guidelines-2025-07.txt` |
| **ISU Comm. 2786 – Scale of Values 2026-27** (added) | `ISU-Comm-2786-Scale-of-Values-2026-27.txt` |
| **ISU Comm. 2788 – Levels of Difficulty + GOE guidelines 2026-27** (added) | `ISU-Comm-2788-Levels-and-GOE-2026-27.txt`, `ISU-Comm-2788-GOE-Guidelines-Chart-2026-27.txt` |

Two gaps in the original list were the Scale of Values (base values) and the GOE/Levels communication. Both are now saved and listed in `links.md`.

## Key rule facts the site must encode (verified against the documents)

**Jumps** (SOV 2786): 6 listed jumps in difficulty order T, S, Lo, F, Lz, A plus Euler (Eu, BV 0). Base values: 1T .40 … 1Lz .60, 1A 1.10; 2T 1.30, 2S 1.30, 2Lo 1.70, 2F 1.80, 2Lz 2.10, 2A 3.30; 3T 4.20, 3S 4.30, 3Lo 4.90, 3F 5.30, 3Lz 5.90, 3A 8.00; 4T 9.50, 4S 9.70, 4Lo 10.50, 4F 11.00, 4Lz 11.50, 4A 12.50; 5T/5S/5Lo/5F/5Lz 14.00. Variants: `q` (quarter, same BV, GOE −2), `<` (under-rotated, 80% BV), `<<` (downgraded, BV of one rotation less), `e` (wrong edge F/Lz, reduced BV), `!` (unclear edge, BV unchanged), `b` (Advanced Novice bonus). GOE steps are ±10% of BV per grade (±50% max). Quints: not allowed in SP; FS solo only, never in combo/sequence.

**Short Program (Senior)**: 7 elements, 2:40. Men: 2A/3A; any triple or quad; combo (2+3, 3+3, 4+2, 4+3); flying spin; camel or sit spin with one change of foot; spin combination with one change of foot; step sequence. Women: 2A/3A; any triple; combo (2+3 or 3+3); flying spin; layback/sideways or sit/camel without change of foot; spin combo; step sequence. Junior 2026-27: prescribed jump is Lutz, flying camel, etc. (Rule 611). Second-half 1.1 factor: last 1 jump element in SP, last 3 in FS.

**Free Skating (Senior & Junior)**: 4:00 Sr / 3:30 Jr. Max 6 jump elements (one Axel type), max 3 spins (combo, flying, choreographic spin), 1 step sequence (Senior only), 1 choreographic sequence. Repetition rules: same jump type max 3 times across all rotations; any double max twice; of triples/quads/quints only two may be repeated and only one of those a quad/quint; second solo repeat gets `+REP` 80%; up to two combos or one combo (no Euler) + one sequence; one of them up to 3 jumps, other up to 2; Euler once; sequence = jump(s) + Axel-type via direct step.

**Spins**: 3 basic positions (camel, sit, upright; layback/sideways/Biellmann are upright). Min 2 revs per position, 3 revs before/after a change of foot. 10 difficult-variation categories: CF/CS/CU, SF/SS/SB, UF/US/UB, UL. 15 level features (Basic–4 by feature count; 4 needs one of 6 mandatory features). Abbreviation grammar: `[F][C](U|L|C|S|Co)Sp(B|1-4)[V]`. SOV rows for every code (e.g. CCoSp4 4.20, FCCoSp4 4.20, FSSp4 3.60, LSp4 3.20, CCSp4 3.80).

**Step sequence**: turns (twizzle, bracket, loop, counter, rocker, three turn) and steps (toe steps, chassés, mohawks, choctaws, change of edge, cross rolls); difficult = twizzle, bracket, loop, counter, rocker, choctaw. Variety thresholds 2/5/7/9/11; 5 features. StSqB 1.60 … StSq4 4.10. Choreographic sequence ChSq1 3.50, choreographic spin ChSp1 3.50 (fixed BV, GOE ±0.50 per step).

**Scoring**: trimmed mean of judges' GOE (drop high/low when ≥5 judges), combos summed with GOE of the most difficult jump, PCS = Composition, Presentation, Skating Skills (0.25–10) × factor (Men SP 1.67 / FS 3.33; Women & Pairs SP 1.33 / FS 2.67). Deductions: time −1 per 5 s, falls (Senior singles −1,−1,−2,−2,−3…; Junior −1 each), costume −1, illegal element −2, interruption −1/−2/−3, late start −1. PCS caps with serious errors: 9.50 (one), 8.75 (two or more). GOE positive bullets and reduction ranges per element type from Comm. 2788 §II–III; errors that cap starting GOE at +2 from §IV.

## Stack

- Next.js 16.4 (App Router, TypeScript, static rendering; no server functions needed), React 19.3, Tailwind 4.3.
- `three` 0.186, `@react-three/fiber` 9.8, `@react-three/drei` 10.7, `zustand` 5 for viewer/calculator state.
- Vitest for the scoring engine and parsers; Playwright for a smoke test of the 3D pages.
- pnpm. Deploy with Vercel CLI (`vercel` preview, `vercel --prod`), Next.js preset, no env vars.

## Repository layout

```
figure-sakting/
  links.md                     (rename from links..md; add 2786 + 2788)
  README.md
  app/                         Next.js routes (see below)
  components/                  UI (nav, cards, tables, panels)
  three/                       R3F scene code
    Rink.tsx                   ice, markings, boards, blade-trace line
    Skater.tsx                 loads /models/skater.glb, AnimationMixer
    ElementPlayer.tsx          canvas + controls (play/scrub/camera presets)
    Annotations.tsx            drei <Html> labels: edge, toe pick, rotation counter
    playback/                  timeline composition (takeoff → air×N → landing)
    paths/                     entry/exit edge curves, flight parabola, step tracings
  data/
    sov-2026-27.json           generated from Comm 2786 text (base values + GOE table)
    jumps.ts spins.ts steps.ts choreo.ts
    programs.ts                SP required elements, FS well-balanced rules per category
    goe.ts                     positive bullets, reductions, +2 cap list (Comm 2788)
    pcs.ts                     components, criteria, scale words, serious-error caps
    deductions.ts glossary.ts sources.ts
  lib/
    scoring/                   pure functions: element value, combo value, 2nd-half, REP,
                               repetition validator (Zayak), SP/FS requirement validator, PCS
    decoder/                   protocol code parser (4Lz+3T, 3F!q, FCCoSp4V, 2A+1Eu+3S, StSq3)
  scripts/parse-sov.ts         text dump → data/sov-2026-27.json (run once, output committed)
  tools/blender/build_skater.py  headless Blender: base mesh + FK rig + authored clips → GLB
  public/models/skater.glb
  tests/                       vitest unit tests, playwright smoke
```

## Routes

- `/` hero: skater on the rink looping a 3A → camel spin → twizzles; cards into sections; "what changed in 2026-27" strip.
- `/jumps` ladder chart of base values single→quint for all six jumps; `/jumps/[type]` (toe-loop, salchow, loop, flip, lutz, axel, euler): 3D viewer with rotation selector 1–5, play/scrub, camera presets (side, overhead edge trace, follow), annotations (take-off edge, toe pick, landing edge), rotation counter, calls panel (q, <, <<, e, !) showing BV and GOE table for the selected variant, where it may be used (SP/FS rules).
- `/spins` positions gallery (3 basic + layback/sideways/Biellmann) and the 10 difficult-variation categories as 3D poses; level features explained; `/spins/[code]` for each SOV family (USp, LSp, CSp, SSp, F*, C*, CoSp, CCoSp, FCCoSp…) with V-sign rules and SP/FS requirements.
- `/steps` turns & steps catalogue with blade-trace diagrams (3D rink top view: three turn vs bracket vs rocker vs counter cusps, twizzle, choctaw) and level features / variety thresholds.
- `/choreo` choreographic sequence and choreographic spin.
- `/scoring` IJS walkthrough: BV + GOE (interactive slider on a sample 4T), trimmed mean demo, levels, PCS and factors, second-half bonus, deductions, serious-error caps.
- `/calculator` program builder: choose segment and category, add elements from a picker (jump builder with rotations/variants/combos, spins with level/V, StSq level, ChSq/ChSp), set GOE and 2nd-half flags, live TES/PCS/deductions/TSS, validation warnings (Zayak, SP requirements, box counts, Euler/sequence limits, quint rules).
- `/compare` two viewers side by side with a shared scrubber (default Flip vs Lutz; 3A vs 4T).
- `/decoder` type or click a protocol code → plain-language breakdown + BV.
- `/sources` the ISU documents with links and a changelog of 2026-27 changes (quints solo-only, GOE +2 caps, step "small pattern" reduction removed, etc.).

## 3D character pipeline (authored animations)

1. **Mesh**: Blender Studio *Human Base Meshes* v1.4.1 (CC0, blender.org/download/demo). Use the realistic adult mesh, decimate to ~15–20k tris, add simple skate boots/blades as primitives, flat material + outline-free toon or PBR.
2. **Rig**: in `tools/blender/build_skater.py` (run as `blender -b --python …`), build a plain FK armature (~22 bones: hips, spine×2, chest, neck, head, clavicle/upper arm/forearm/hand ×2, thigh/shin/foot/blade ×2), parent with automatic weights. FK keeps every clip scriptable and exports cleanly to glTF.
3. **Clips** (keyframed in the same script, so they are reproducible and tweakable by parameters):
   - Jump takeoffs ×7: `to_T` (back outside + left toe pick), `to_S` (back inside edge), `to_Lo` (back outside edge), `to_F` (back inside + toe pick), `to_Lz` (back outside + toe pick, counter-rotated), `to_A` (forward outside), `to_Eu`.
   - `air_tuck` (1 revolution loop, arms crossed), `air_open` (single/double variant), `land` (back outside check-out), `land_eu` (lands on back inside).
   - Spins: `spin_upright`, `spin_camel`, `spin_sit`, `spin_layback`, `spin_sideways`, `spin_biellmann`, plus variation poses CF/CS/CU, SF/SS/SB, UF/US/UB, `fly_camel`, `fly_sit`, `windmill`, `crossfoot`, `change_foot_jump`.
   - Steps: `three_turn`, `bracket`, `rocker`, `counter`, `loop_turn`, `twizzle` (2 revs), `mohawk`, `choctaw`, `chasse`, `cross_roll`.
   - Choreo: `spiral`, `spread_eagle`, `ina_bauer`, `hydroblade`, `arabesque`.
   - `glide_bo`, `glide_bi`, `glide_fo`, `stroke` for travel between elements.
4. **Playback composition** in `three/playback/`: an element = sequence of clip segments with root motion computed in code (entry curve on the correct edge, parabola whose duration scales with rotations, N×360° yaw plus 180° for Axel, exit curve). Scrubber maps 0–1 across the whole timeline; crossfades between clips. Under-rotation visualised by stopping yaw short and showing the q/</<< threshold wedge on the ice.
5. **Fallback**: if GLB is not ready, `Skater.tsx` renders a primitive mannequin with the same bone names so all pages work; swap in the GLB later with no page changes.

## Implementation steps

1. **Scaffold**: `pnpm create next-app@latest . --ts --tailwind --app --eslint --src-dir=false --import-alias "@/*"`; add R3F/drei/three/zustand, vitest, playwright; `git init`; `links.md` already updated with 2786/2788 URLs; `vercel link` (new project `figure-skating-explained`, framework Next.js).
2. **Data**: write `scripts/parse-sov.ts` against the Comm 2786 text dump (handle the two unlabeled 3A/3Ab rows at 8.00 and comma decimals), commit `data/sov-2026-27.json`. Hand-author `jumps.ts`, `spins.ts`, `steps.ts`, `choreo.ts`, `programs.ts`, `goe.ts`, `pcs.ts`, `deductions.ts`, `glossary.ts`, `sources.ts` from the extracted handbook/rules text (paraphrased, with source refs).
3. **Scoring engine + decoder** in `lib/` with vitest: element value (BV × variant, GOE lookup), combo/sequence value (sum BV, GOE from most difficult jump), second-half 1.1, +REP 80%, repetition validator with the handbook's worked examples (e.g. `3S+2A+Seq` then `3A+Eu+3F*+3T*+REP`), SP requirement checks per category, PCS factors, deductions, serious-error caps. Decoder grammar covers `+`, `+COMBO`, `+SEQ`, `+REP`, `*`, `q <  << e ! V b`, spin codes, StSq/ChSq/ChSp.
4. **3D**: `tools/blender/build_skater.py` → `public/models/skater.glb` (verify in a glTF viewer); `Rink`, `Skater`, `ElementPlayer`, paths, annotations; jump and spin playback first, steps and choreo after.
5. **Pages** in the order `/jumps` → `/spins` → `/scoring` → `/steps` → `/choreo` → `/` → `/sources`, reusing one `ElementPlayer` and one `ValueTable` component.
6. **Extras**: `/calculator` (zustand store + validators), `/compare` (two players, shared timeline store), `/decoder`.
7. **Polish**: dynamic import of Three with `ssr:false`, `frameloop="demand"` when paused, DPR cap, static poster + reduced-motion fallback on mobile, metadata/OG images, keyboard access for the scrubber, dark/light theme.
8. **Deploy**: `vercel` preview → review → `vercel --prod`; write README with the asset pipeline and how to update data when the ISU publishes a new SOV.

## Verification

- `pnpm lint && pnpm typecheck && pnpm test` – scoring tests must pin known values: 4T 9.50, 3A 8.00, 4A 12.50, 3Lz< 4.72, 3F!q 5.30, 4Lz+3T BV 15.70 with GOE from 4Lz, second-half 4T 10.45, +REP 3A 6.40, CCoSp4V 3.15; validator cases from the TP Handbook examples.
- `pnpm build` passes with no client/server boundary errors; GLB loads under 3 MB gzipped.
- Playwright smoke: each route renders, the canvas mounts, scrubber moves the rotation counter, decoder round-trips sample codes.
- Manual check in the browser (`/run` skill): play 3Lz vs 3F in `/compare` and confirm take-off edges differ; build a Senior Men SP in `/calculator` and trigger a Zayak warning.
- `vercel` preview URL opens on desktop and phone; Lighthouse performance ≥ 80 on `/jumps/lutz`.

## Follow-ups (not in v1)

Pair Skating elements (data model already has `discipline` field), quiz mode, Ice Dance, localisation, per-skater protocol import (ISU results PDFs).
