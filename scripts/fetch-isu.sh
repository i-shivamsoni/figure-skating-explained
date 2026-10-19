#!/usr/bin/env bash
# Downloads the ISU documents this site is built from into docs/isu/pdf/ and extracts their
# text into docs/isu/text/ (pdftotext -layout, blank lines stripped). Both folders are
# gitignored: the documents are International Skating Union copyright and are not
# redistributed with this repository. links.md lists the same URLs with notes and
# docs/isu/README.md says what each document contains.
#
#   scripts/fetch-isu.sh          # all twelve documents
#   scripts/fetch-isu.sh 2786     # only the documents whose name contains "2786"
#
# Needs curl and pdftotext (Debian/Ubuntu: apt install poppler-utils; macOS: brew install poppler).
# Afterwards `pnpm data:sov` regenerates data/sov-2026-27.json from the Scale of Values text.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PDF_DIR="$ROOT/docs/isu/pdf"
TXT_DIR="$ROOT/docs/isu/text"

ISU="https://isu-d8g8b4b7ece7aphs.a03.azurefd.net/isudamcontainer/CMS"
USFS="https://s3.us-east-2.amazonaws.com/sidearm.nextgen.sites/usafs.sidearmsports.com/documents"

# "<file name without extension>|<url>", in the order of links.md
DOCS=(
  "ISU-Special-Regulations-Technical-Rules-Single-Pair-2026|$ISU/Corporate-Site/Governance/Isu-Regulations/2026-FS---Pair-Sports-Rules-FINAL-20260513-1778685370-9916.pdf"
  "TP-Handbook-Singles-2026-27|$ISU/Corporate-Site/Sports-Rules/Figure-Skating-Rules/Handbooks-Single-&-Pair-Skating/TP-HandbookSingles-26-27-15-July-2026-1784641784-3364.pdf"
  "TP-Handbook-Pairs-2026-27|$ISU/Corporate-Site/Sports-Rules/Figure-Skating-Rules/Handbooks-Single-&-Pair-Skating/TP-HandbookPair-Skating-26-27-15-July-2026-1784641785-2875.pdf"
  "Handbook-Referees-Judges-Single-Pair-2026-27|$ISU/Corporate-Site/Sports-Rules/Figure-Skating-Rules/Handbooks-Single-&-Pair-Skating/Handbook-for-Referees-and-Judges-2026-27-1779278300-9402.pdf"
  "RTD-Guidelines-2025-07|$ISU/Corporate-Site/Sports-Rules/Figure-Skating-Rules/Handbooks-Single-&-Pair-Skating/SP-New-RTD-guidelines-16-July-2025-1753088297-5459.pdf"
  "Thinking-Words-Program-Components-Scale|$ISU/Corporate-Site/Sports-Rules/Figure-Skating-Rules/Handbooks-Single-&-Pair-Skating/SP-Thinking-words-for-Program-Components-scale-1749110475-6223.pdf"
  "Program-Components-Chart-2024-07|$ISU/sportrulesdisciplinecategory/pdf/Componentschartupdated2024July086344800_17327068456450.pdf"
  "Single-Pair-Component-Charts-2024|$ISU/sportrulesdisciplinecategory/pdf/SPComponentCharts2024064619000_17327068477733.pdf"
  "Who-Is-Responsible-For-Deductions-2024-25|$ISU/sportrulesdisciplinecategory/pdf/SPWhoisresponsibleforDeductions202425V3010384600_17327068488063.pdf"
  "ISU-Comm-2786-Scale-of-Values-2026-27|$ISU/Corporate-Site/Governance/Transparency/ISU-Communications/2786-SinglesPairs-SOV-Update-260602-1780481099-6311.pdf"
  "ISU-Comm-2788-Levels-and-GOE-2026-27|$USFS/2026/5/26/ISU_2788-SP-Levels-and-GOE-2026-Updated-MAY-19_with_notes.pdf"
  "ISU-Comm-2788-GOE-Guidelines-Chart-2026-27|$USFS/2026/5/18/2026-27_SP_Guidelines_for_Marking_GOE.pdf"
)

for tool in curl pdftotext; do
  command -v "$tool" >/dev/null || { echo "fetch-isu: $tool is required" >&2; exit 1; }
done

filter="${1:-}"
mkdir -p "$PDF_DIR" "$TXT_DIR"
count=0
for entry in "${DOCS[@]}"; do
  name="${entry%%|*}"
  url="${entry#*|}"
  if [[ -n "$filter" && "${name,,}" != *"${filter,,}"* ]]; then continue; fi
  echo "fetching $name"
  curl -fsSL --retry 3 --retry-delay 2 -o "$PDF_DIR/$name.pdf" "$url"
  pdftotext -layout "$PDF_DIR/$name.pdf" - | sed '/^[[:space:]]*$/d' > "$TXT_DIR/$name.txt"
  count=$((count + 1))
done

if [[ $count -eq 0 ]]; then
  echo "fetch-isu: no document name contains \"$filter\"" >&2
  exit 1
fi
echo "done: $count document(s) in docs/isu/pdf and docs/isu/text"
