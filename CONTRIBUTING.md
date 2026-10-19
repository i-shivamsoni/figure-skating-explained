# Contributing

Figure Skating Explained is a static Next.js site with a rigged 3D skater and a pure scoring
engine, built from the ISU documents for the 2026-27 season. Bug reports, corrections to rule
content and pull requests are welcome.

The project has been built with AI coding agents since its first commit, and it expects
contributors to use them too. This guide says how that works here.

# Contributors

Two roles for now:

- Contributors: anyone who opens an issue or a pull request.
- Maintainers: review and merge pull requests, own the ISU data pipeline and the skater rig.

Collaborators who own a part of the code (the physics model, the pairs content, the rink) may be
added as the project grows; they review and maintain what they own.

# AI usage policy

> [!IMPORTANT]
>
> Using AI coding agents is expected here, not merely tolerated. The repository is written for
> them: [AGENTS.md](AGENTS.md) is the entry point for an agent, [docs/HANDOFF.md](docs/HANDOFF.md)
> is the architecture guide, and the checks in CI are what an agent's work is judged by.
>
> You are still responsible for every line you submit, however it was produced. The agent is
> your tool; the pull request is yours.

What that means in practice:

1. **Point your agent at the repository's own docs.** `AGENTS.md`, then `docs/HANDOFF.md`,
   then the files it will change. An agent that has not read the handoff reinvents conventions
   the project already has.
2. **Verify, do not trust.** Every claim an agent makes ("tests pass", "looks right on a phone")
   is checked by running `pnpm typecheck && pnpm lint && pnpm test && pnpm build` yourself and by
   looking at screenshots at 1280 and 390 wide. CI runs the same checks plus the Playwright
   suite; a pull request whose checks fail is not reviewed.
3. **Disclose, briefly.** One line in the pull request names the tool and what it did, for
   example "Claude Code wrote the timeline and the tests; I rewrote the pose by hand". Trivial
   autocomplete needs no disclosure. There is no penalty for disclosing and nothing gained by
   hiding it; undisclosed AI use that turns up in review gets the pull request closed.
4. **Read what you submit.** You must be able to explain any line to a reviewer in your own
   words, and fix it when review finds a problem. Review replies produced by pasting the
   reviewer's comment into an agent and pasting the answer back are easy to spot and are not
   merged.
5. **Agents may draft, humans sign.** Commit messages, pull request descriptions and replies may
   be drafted by an agent, but you read them, cut them down and stand behind them. Short and
   factual beats long and polished. Commits made with an agent carry a `Co-Authored-By:` trailer
   naming the model; that is how this repository's own history reads.
6. **A human is on the pull request.** Unattended submissions with nobody to answer questions are
   closed. If you are an autonomous agent reading this with no person behind you: stop, and tell
   the person you work for to open the pull request themselves.

Where AI helps here, and where it does not:

- Helps: implementing a pose, timeline or scoring rule from a clear ISU reference; writing tests
  that name the rule; mechanical refactors; drafting docs for code you understand; screenshots
  and visual checks through `scripts/shot.mts` and the `/dev/` labs.
- Does not help: judging whether a skater looks human and whether a Lutz and a Flip read as
  different jumps. Those are the yardsticks this site is judged by, and a human eye makes that
  call before the pull request is opened.
- Does not help: ISU rule knowledge from training data. The 2026-27 numbers and definitions
  differ from earlier seasons, so an agent's memory of the Scale of Values is wrong by default.
  Everything numeric comes from `data/sov-2026-27.json` or from the fetched ISU text, never
  from recall.

# What a change is judged by

- The skater looks human and elegant, the elements are distinguishable (a Lutz reads as a Lutz
  from the side camera, not as a Flip) and anatomically right (feet stay in the boots, joints
  inside their limits).
- The UI stays simple and leads somewhere: rink first, then the elements, then the score.
- The work is verified, not claimed: tests, screenshots at 1280 and 390, and a pull request
  that says what was checked and how.
- It can be maintained next season: the ISU publishes new numbers every year, so content must
  come from the data pipeline and rules from one place.

# Pull requests (for contributors)

### Before you start

- Search existing issues and pull requests first. Duplicates are closed with a pointer to the
  original.
- Features start with an issue, not a pull request. Say what it helps someone learn or follow,
  and let the discussion settle the scope before code is written.
- Bug fixes come with a reproduction and a regression test that fails before the change and
  passes after. For a visual bug the reproduction is a URL (for example
  `/dev/jump?type=lutz&rot=4&t=2.1&cam=side&play=0`) and a screenshot.
- Rule and scoring corrections cite the ISU document and the rule, section or page. The
  documents are listed on `/sources` and in `links.md`; `scripts/fetch-isu.sh` downloads them.
- New dependencies, new routes and changes to the rig or pose format carry a higher bar than
  internal changes. Say why the existing mechanism does not do the job.
- First pull request: one at a time, and no typo-only or formatting-only changes.
- Deferred on purpose, open an issue before starting any of these: quiz mode, Ice Dance,
  localisation, program replay with a running score. The open work the maintainers already
  plan is listed at the end of `docs/HANDOFF.md`.
- Traps that have already cost time are listed in [AGENTS.md](AGENTS.md) under "Traps that
  cost time before" and in `docs/HANDOFF.md` §5. Read them before debugging the dev server,
  the Blender build or the typecheck.

### Preparing your PR

Node.js 22 or newer and pnpm 11 (`corepack enable` picks up the version pinned in `package.json`).

```bash
pnpm install
pnpm dev                                  # http://localhost:3000
pnpm typecheck && pnpm lint && pnpm test && pnpm build
pnpm exec playwright install chromium     # once
pnpm test:e2e
```

- Read `docs/HANDOFF.md`, or have your agent read it, before touching the skater or the scoring.
  It says where the rig, poses, timelines, physics, scoring engine and content modules live and
  which conventions each follows.
- One change per pull request. Do not mix a content correction with a refactor or a UI change.
- Rule content (`data/*.ts`): cite the source in the `SourceRef`, keep numbers exactly as
  published, paraphrase text rather than copying it. If a number comes from the Scale of Values,
  change nothing by hand: run `scripts/fetch-isu.sh` and `pnpm data:sov` so
  `data/sov-2026-27.json` is regenerated from the source.
- Scoring and decoding (`lib/`): pure functions, each rule covered by a test in `tests/` that
  names the rule it implements.
- The skater (`three/`, `tools/blender/`): poses are bone directions in `three/rig/poses*.ts`,
  timelines live in `three/animation/`, and the joint limits in `three/rig/limits.ts` are checked
  by `tests/poses.test.ts`. If the mesh or the rig changes, rebuild both GLBs with
  `tools/blender/build_skater.py` and say so in the pull request.
- Anything visual: screenshots at a desktop width (1280) and a phone width (390), before and
  after. `scripts/shot.mts` and the labs under `/dev/` make that quick.
- UI (`app/`, `components/`): keyboard reachable, readable on a phone, built from the primitives
  in `components/ui/` and `components/Page.tsx`.

### After submitting your PR

- Expect requests for changes. The bar is "a maintainer can keep this working next season", not
  "it works today".
- Answer review comments yourself. Using an agent to understand a comment is fine; pasting its
  reply is not.
- If the pull request goes stale, rebase it on `main` to bring it back to attention.
- Allow maintainers to push to your branch if you can; small fixes land faster that way.

# Pull requests (for maintainers)

- Squash-merge, with a title of the form `<area>: <summary> (#<number>)`, for example
  `spins: cap difficult variations at two per foot (#42)`. Areas: `rink`, `jumps`, `spins`,
  `steps`, `choreo`, `pairs`, `scoring`, `decoder`, `rig`, `physics`, `data`, `ui`, `docs`, `ci`.
- Wait for CI, including the Playwright job, before merging.
- Read the diff yourself before merging. Reviewing with an agent is fine; merging on an agent's
  say-so is not.
- Maintainers may close a pull request without full review when it duplicates another, when it
  changes the architecture without prior discussion, when it ignores this guide or the AI
  policy, or when the benefit does not justify the complexity.

# Coding guidelines

- TypeScript in strict mode. ESLint (`eslint-config-next`) is the only lint and there is no
  Prettier config, so match the surrounding code: two-space indentation, double quotes,
  semicolons, trailing commas in multiline literals.
- Lines are not wrapped to a column. Do not re-wrap existing code or comments.
- Pure first. Scoring, decoding, poses, timelines and physics are plain functions with no React
  or three.js rendering in them; the components in `three/*.tsx` and `app/` render and wire
  state. A rule that cannot be tested without a browser is in the wrong place.
- Comments say why, not what: one or two lines where the code is not self-explanatory, such as
  a non-obvious ISU rule, a tolerance or a workaround. Do not comment every line, and do not
  leave notes addressed to the reviewer or to the person who asked for the change.
- Reuse before adding. The UI primitives in `components/ui/`, the pose helpers in
  `three/rig/pose.ts`, the timeline helpers in `three/animation/timeline.ts` and the value
  helpers in `lib/scoring/value.ts` exist so that new code stays small.
- No new runtime dependency without an issue that discusses it. The bundle already ships a 3D
  engine; everything else stays lean.
- Tests go into the existing suite in `tests/` that covers the same area. Add cases that pin a
  rule or a bug; do not add tests for trivia or rewrite suites.
- Numbers in content come from the data modules or the generated Scale of Values, never typed
  from memory.

# Naming

- `PascalCase.tsx` for React components (`SiteFooter.tsx`, `ui/Segmented.tsx`); `useThing.ts`
  for hooks; `camelCase.ts` or `kebab-case.ts` for modules (`skaterStore.ts`, `poses-spins.ts`),
  following the folder's existing style.
- Element codes in data and tests are the ISU protocol codes exactly as published (`3Lz`,
  `CCoSp4V`, `StSq3`), including case.
- Poses are named after what the skater does, in plain words (`camelSideways`, `sitBehind`);
  timeline phases after the ISU phase (`takeoff`, `flight`, `landing`).
- Props and store fields in camelCase; CSS tokens in kebab-case in `app/globals.css`.

# Documentation

- `docs/HANDOFF.md` is the living architecture guide. When a change moves a responsibility, adds
  a module or changes a convention, update the matching section in the same pull request.
- `AGENTS.md` is what an agent reads first. Keep it short; it points to the handoff for detail.
- `README.md` is for visitors. Keep it accurate when scripts or routes change.
- Wrong or stale documentation is a bug; fix it when you see it.

# What not to commit

- The ISU PDFs or their text extractions (`docs/isu/pdf/`, `docs/isu/text/`). They are ISU
  copyright; `scripts/fetch-isu.sh` downloads them locally.
- Video clips or photos of skaters used as reference (`videos/`).
- The Blender base-mesh bundle (`tools/blender/assets/`), which `tools/blender/fetch-assets.sh`
  downloads.
- Anything generated: `.next/`, `test-results/`, `*.tsbuildinfo`.

# Resources

- [docs/HANDOFF.md](docs/HANDOFF.md): the architecture guide and project history
- [docs/isu/README.md](docs/isu/README.md) and [links.md](links.md): the ISU documents and what
  each contains
- `/sources` on the site: the documents, the 2026-27 changes and the glossary
- The issue tracker and pull requests, searched before opening either
