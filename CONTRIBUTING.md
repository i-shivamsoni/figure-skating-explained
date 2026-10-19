# Contributing

Thanks for helping. Figure Skating Explained is a static Next.js site with a 3D skater and a
scoring engine, built from the ISU documents for the 2026-27 season. Bug reports, corrections to
rule content, and pull requests are all welcome.

## Setting up

Node.js 22 or newer and pnpm 11 (`corepack enable` picks up the version pinned in `package.json`).

```bash
pnpm install
pnpm dev                 # http://localhost:3000
pnpm test                # unit tests (Vitest)
pnpm exec playwright install chromium   # once, for the end-to-end tests
pnpm test:e2e            # Playwright, starts its own dev server
pnpm typecheck && pnpm lint && pnpm build
```

`docs/HANDOFF.md` is the architecture guide: where the rig, poses, timelines, physics, scoring
engine and content modules live, and the conventions each follows. Read it before changing the
skater or the scoring code.

## What a good change looks like

- **Rule content** (`data/*.ts`): cite the ISU document and the rule, section or page in the
  `SourceRef`, keep numbers exactly as published, and paraphrase text rather than copying it.
  If a number comes from the Scale of Values, change nothing by hand: run `scripts/fetch-isu.sh`
  and `pnpm data:sov` so `data/sov-2026-27.json` is regenerated from the source.
- **Scoring and decoding** (`lib/`): pure functions with a test in `tests/` that quotes the
  rule it implements.
- **The skater** (`three/`, `tools/blender/`): poses live in `three/rig/poses*.ts` as bone
  directions, timelines in `three/animation/`, and the joint limits in `three/rig/limits.ts`
  are checked by `tests/poses.test.ts`. If you change the mesh or the rig, rebuild both GLBs
  with `tools/blender/build_skater.py` and say so in the pull request. Include screenshots
  at a desktop width (1280) and a phone width (390) for anything visual; the dev labs under
  `/dev/` and `scripts/shot.mts` make that quick.
- **UI** (`app/`, `components/`): keep it keyboard-reachable and readable on a phone, and reuse
  the primitives in `components/ui/` and `components/Page.tsx`.

## Before opening a pull request

1. `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build` pass. CI runs the same checks
   plus the Playwright tests.
2. The pull request says what changed and why, names the ISU source for any rule or number,
   and carries screenshots for visual changes.
3. Commit messages use an imperative summary line and explain the reason in the body when it
   is not obvious.

## What not to commit

- The ISU PDFs or their text extractions (`docs/isu/pdf/`, `docs/isu/text/`). They are ISU
  copyright; `scripts/fetch-isu.sh` downloads them locally.
- Video clips or photos of skaters used as reference (`videos/`).
- The Blender base-mesh bundle (`tools/blender/assets/`), which `tools/blender/fetch-assets.sh`
  downloads.
- Anything generated: `.next/`, `test-results/`, `*.tsbuildinfo`.

## Reporting problems

Use the issue templates. For a scoring or rule error, the most useful report names the element
or protocol code, what the site shows, what the ISU document says, and where it says it.
