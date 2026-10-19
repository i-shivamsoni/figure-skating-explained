# Figure Skating Explained

An interactive 3D guide to the elements of figure skating and to how the ISU Judging System
scores them, built from the International Skating Union documents for the 2026-27 season.

**Live site:** https://figure-skating-explained.vercel.app

## What it does

- **The rink** (`/rink`): a rigged 3D skater performs any element you pick, with a running
  protocol and score. Deep links such as `/rink?perform=4Lz,CCoSp4` queue a program.
- **Jumps** (`/jumps`): the six jumps from single to quint, every technical-panel call
  (q, <, <<, e, !) shown on the skater, and Flip against Lutz on one clock.
- **Spins, steps and choreographic elements** (`/spins`, `/steps`, `/choreo`): positions,
  the difficult variations, level features and turns, each performed by the skater, plus a
  spin builder that prices features.
- **Pairs** (`/pairs`): lifts, twists, throws, death spirals and pair spins.
- **Scoring** (`/scoring`, `/calculator`, `/decoder`): base values, GOE, the second-half bonus,
  repetition rules, the trimmed mean, program components and deductions; a program score
  calculator for singles and pairs; a decoder for protocol codes.
- **Compare** (`/compare`): two elements side by side.
- **Sources** (`/sources`): every ISU document used, what changed for 2026-27, and a glossary.

The site is static: no accounts, no backend. Vercel Web Analytics counts page views without cookies. The skater is a 25-bone rig driven by
named poses and pure timeline code, so every jump can be generated at any rotation count with
any call, and the physics model behind the jumps is tested on its own.

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS 4, three.js with React Three Fiber and drei,
zustand. Vitest for unit tests, Playwright for end-to-end tests. Deployed on Vercel.

## Quick start

Node.js 22 or newer and pnpm 11 (`corepack enable` picks up the version pinned in `package.json`).

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

| Script | What it does |
|---|---|
| `pnpm test` | Unit tests: scoring engine, decoder, rig, poses, timelines, physics, content |
| `pnpm test:e2e` | Playwright smoke tests; once: `pnpm exec playwright install chromium` |
| `pnpm typecheck`, `pnpm lint` | TypeScript and ESLint |
| `pnpm build` | Production build |
| `pnpm data:sov` | Regenerate `data/sov-2026-27.json` from the ISU Scale of Values (see Data) |

Dev-only labs for visual checks (they return 404 in production): `/dev/pose?pose=camel`,
`/dev/jump?type=lutz&rot=4&t=2.1&cam=side&play=0`, `/dev/spin?code=CCoSp`, `/dev/step?id=bracket`
and `/dev/pair`. Screenshot any page with
`node --experimental-strip-types scripts/shot.mts <url> <out.png>`.

## Project layout

| Path | Contents |
|---|---|
| `app/` | Routes: rink, jumps, spins, steps, choreo, pairs, scoring, calculator, decoder, compare, sources, dev labs |
| `components/` | UI, including the primitives in `components/ui/` |
| `three/` | The skater: rig and joint limits, poses, animation timelines, physics, players and the rink |
| `lib/scoring/`, `lib/decoder/` | Pure scoring engine and protocol-code parser |
| `data/` | Hand-written content modules with source references, and the generated Scale of Values |
| `docs/HANDOFF.md` | Architecture guide and project history; read it before changing the skater or the scoring |
| `scripts/` | ISU document fetcher, Scale of Values parser, screenshot helper |
| `tools/blender/` | Headless Blender script that builds the skater GLBs |
| `tests/` | Vitest suites and the Playwright tests in `tests/e2e/` |

## Data and sources

The ISU documents are copyrighted and are not in this repository. `scripts/fetch-isu.sh`
downloads them (it needs `curl` and `pdftotext`) into the gitignored `docs/isu/pdf/` and
`docs/isu/text/`; `links.md` lists the URLs and `docs/isu/README.md` says what each document
contains.

- `data/sov-2026-27.json` is generated from ISU Communication 2786 by `pnpm data:sov`
  (`scripts/parse-sov.mts`). Regenerate it when the ISU publishes a new Scale of Values.
- `data/*.ts` are hand-written, paraphrased content modules with source references. Numbers
  are copied exactly; rule text is reworded.
- `lib/scoring/` implements base value, GOE, the second-half bonus, +REP, the trimmed mean,
  program components, deductions, and Short Program and well-balanced program validation.

## 3D skater

`tools/blender/build_skater.py` builds `public/models/skater-female.glb` and
`skater-male.glb` headlessly from the CC0 Blender Studio Human Base Meshes:

```bash
tools/blender/fetch-assets.sh        # downloads the base-mesh bundle
<blender> -b --python tools/blender/build_skater.py -- --body female --preview /tmp/preview
```

It appends the base mesh, builds a 25-bone FK armature, adds boots, blades, hair styles and
costumes, assigns materials by dominant bone and exports glTF. Animation is not baked into the
file: `three/rig/poses*.ts` hold named poses (bone directions in skater space) and
`three/animation/*` compose them into timelines with root motion. `three/physics/jump.ts` is the
pure model behind the jumps (ballistics, angular momentum with a tuck inertia schedule, edge
lean, landing absorption); `tests/physics.test.ts` pins its behaviour.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The project is built with AI coding agents and expects
contributors to use them; [AGENTS.md](AGENTS.md) is the entry point for an agent, and the
contributing guide says what you remain responsible for. Corrections to rule content are
especially welcome: name the element, what the site shows, and what the ISU document says and where.

## Licence and disclaimers

The code and content of this repository are released under the [MIT licence](LICENSE).
The character meshes derive from the Blender Studio Human Base Meshes (CC0). Rule text is
paraphrased from the ISU documents listed on `/sources`, which remain the property of the
International Skating Union; the documents themselves are not redistributed here. This site is
independent and not affiliated with the ISU.
