# Figure Skating Explained

An interactive 3D guide to the components of figure skating (jumps, spins, step sequences,
choreographic elements and the ISU Judging System), built from the International Skating
Union documents for the 2026-27 season. Single Skating in this version; Pair Skating is
planned.

## Stack

Next.js 16 (App Router, static output), React 19, Tailwind 4, three.js with React Three
Fiber and drei, zustand, Vitest, Playwright. Deployed on Vercel.

## Develop

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm test           # scoring engine, decoder, rig and timeline tests
pnpm typecheck && pnpm lint
pnpm build
```

Dev-only pages for visual checks: `/dev/pose?pose=camel`, `/dev/jump?type=lutz&rot=4&t=2.1&cam=side&play=0`,
`/dev/spin?code=CCoSp`, `/dev/step?id=bracket`. Screenshot any page with
`node --experimental-strip-types scripts/shot.mts <url> <out.png>`.

## Data

- `docs/isu/` holds the ISU PDFs and their text extraction; `links.md` lists the URLs.
- `data/sov-2026-27.json` is generated from ISU Communication 2786 by `pnpm data:sov`
  (`scripts/parse-sov.mts`). Regenerate when the ISU publishes a new Scale of Values.
- `data/*.ts` are hand-written, paraphrased content modules with source references.
- `lib/scoring/` is the pure scoring engine (base value, GOE, second-half bonus, +REP,
  trimmed mean, program components, deductions, Short Program and well-balanced program
  validation); `lib/decoder/` parses protocol codes.

## 3D skater

`tools/blender/build_skater.py` builds `public/models/skater.glb` headlessly:

```bash
tools/blender/fetch-assets.sh        # downloads the CC0 Blender Studio Human Base Meshes bundle
<blender> -b --python tools/blender/build_skater.py -- --body female --preview /tmp/preview
```

It appends the base mesh, builds a 25-bone FK armature, adds boots and blades, assigns skin
and costume materials by dominant bone and exports glTF. Animation is not baked into the
file: `three/rig/poses.ts` holds named poses (bone directions in skater space) and
`three/animation/*` composes them into timelines with root motion, so every jump can be
produced at any rotation count and with any technical-panel call.

## Sources and licence

Rule text is paraphrased from the ISU documents listed on `/sources`; numbers are copied
exactly. The character mesh is CC0 (Blender Studio Human Base Meshes). This site is not
affiliated with the ISU.
