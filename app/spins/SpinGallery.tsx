"use client";

import { useState } from "react";
import { ElementViewer } from "@/components/ElementViewer";
import { Chip } from "@/components/ui/Chip";

const ITEMS = [
  { id: "FCSp", label: "Flying camel", text: "A clear jump with a butterfly air position, landing straight into the camel. No rotation on the ice before take-off." },
  { id: "windmills", label: "Windmills", text: "Three in a row, each close to a split, count as one feature and are one of the six that unlock Level 4." },
  { id: "shapes", label: "Popular names", text: "Pancake, doughnut, haircutter and headless: skaters’ names that the panel files under the ten official categories." },
  { id: "FCSpToeArabian", label: "Toe Arabian entry", text: "A horizontal butterfly from the toe pick, credited as a difficult fly or as a change of foot by jump." },
];

/** Flying entries, windmills and the popular shapes in one viewer, chosen by chip. */
export function SpinGallery() {
  const [id, setId] = useState(ITEMS[0].id);
  const item = ITEMS.find((i) => i.id === id) ?? ITEMS[0];
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {ITEMS.map((i) => (
          <Chip key={i.id} onClick={() => setId(i.id)} active={i.id === id}>
            {i.label}
          </Chip>
        ))}
      </div>
      <ElementViewer spec={{ kind: "spin", code: item.id }} height={420} camera="side" />
      <p className="mt-2 text-sm text-muted">
        <span className="font-semibold text-foreground">{item.label}:</span> {item.text}
      </p>
    </div>
  );
}
