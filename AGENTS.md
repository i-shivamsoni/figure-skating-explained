<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Figure Skating Explained: instructions for AI coding agents

This repository expects to be worked on with agents. The person you work for is responsible for
everything you produce (see the AI usage policy in [CONTRIBUTING.md](CONTRIBUTING.md)), so your job
is to make their verification easy and your claims checkable.

## Read first

1. [docs/HANDOFF.md](docs/HANDOFF.md): architecture, conventions, history and known gaps. Read the
   sections for the area you touch before writing code.
2. The files you will change, and the suite in `tests/` that covers them.
3. [CONTRIBUTING.md](CONTRIBUTING.md) when the work will become a pull request.

## The ISU data is the ground truth, not your memory

- Base values, GOE, level features, calls and deductions for 2026-27 differ from earlier
  seasons. Never type a number from recall. Read `data/sov-2026-27.json` or the fetched ISU text
  in `docs/isu/text/` (run `scripts/fetch-isu.sh`; the documents are not committed).
- Rule text in `data/*.ts` is paraphrased and carries a `SourceRef`. Keep that pattern.

## Where things live

- `app/`: routes. `components/`: UI, with the primitives in `components/ui/`.
- `three/rig/`: bones, joint limits, poses (bone directions in skater space).
  `three/animation/`: timelines, programs, placement on the rink. `three/physics/`: the jump
  model. `three/*.tsx`: the players, the rink and the skater model.
- `lib/scoring/`, `lib/decoder/`: pure functions. `data/`: content modules and the generated
  Scale of Values.
- `tools/blender/build_skater.py` builds `public/models/*.glb`; never edit a GLB by hand.

## Verify before you report

- `pnpm typecheck && pnpm lint && pnpm test && pnpm build`, and `pnpm test:e2e` when pages or
  the player change.
- Anything visual: screenshots at 1280 and 390 wide with `scripts/shot.mts` against a running
  dev server. The labs under `/dev/` isolate one pose, jump, spin, step or pair element.
- When you report, separate what you verified from what you believe, and say which commands
  you ran and what they printed.

## Conventions

- Match the surrounding code: strict TypeScript, two-space indentation, double quotes,
  semicolons, no wrapping to a column. No new runtime dependency without discussion.
- Pure logic stays pure: no React or three.js rendering in `lib/`, `three/rig/`,
  `three/animation/` or `three/physics/`.
- Comments say why, in one or two lines. No notes addressed to the person who asked.
- Tests go into the existing suite for the area. Pin rules and bugs; do not add trivia.
- Reuse before adding: `components/ui/`, the helpers in `three/rig/pose.ts`,
  `three/animation/timeline.ts` and `lib/scoring/value.ts`.

## Commits and pull requests

- Commit only when asked. Imperative summary line, a body that says why when it is not obvious,
  and a trailer naming the model, for example
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- You may draft commit messages, pull request descriptions and review replies; the person
  reads, trims and signs them. Short and factual.
- Do not push, open a pull request or answer a reviewer unless the person explicitly asks for
  that action, and never without them reading what goes out.
- The pull request template has a one-line slot for AI disclosure; fill it in truthfully.

## Do not

- Commit `docs/isu/pdf/`, `docs/isu/text/`, `videos/`, `tools/blender/assets/` or anything
  generated.
- Edit the Next.js block at the top of this file; `next dev` manages it.
