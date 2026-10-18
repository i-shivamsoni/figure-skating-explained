import Link from "next/link";
import { JUMP_SIGNS } from "@/data/jumps";
import type { EdgeCall, RotationCall } from "@/lib/scoring/elements";
import { cn } from "./ui/cn";

const signName = (sign: string) => JUMP_SIGNS.find((x) => x.sign === sign)?.name ?? sign;

/** The technical panel's rotation calls as Segmented options; the hints are the ISU names. */
export const CALL_OPTIONS: { id: RotationCall; label: string; hint: string }[] = [
  { id: "", label: "Clean", hint: "Fully rotated" },
  { id: "q", label: "q", hint: signName("q") },
  { id: "<", label: "<", hint: signName("<") },
  { id: "<<", label: "<<", hint: signName("<<") },
];
export const EDGE_OPTIONS: { id: EdgeCall; label: string; hint: string }[] = [
  { id: "", label: "Correct", hint: "Correct take-off edge" },
  { id: "!", label: "!", hint: signName("!") },
  { id: "e", label: "e", hint: signName("e") },
];

/**
 * What the chosen call and edge signs mean, in the ISU's words, with the way to the full list.
 * With nothing chosen it says what the signs are (`always`) or shows only the link.
 */
export function SignNotes({ signs, always = false, className }: { signs: string[]; always?: boolean; className?: string }) {
  const chosen = signs.filter(Boolean).map((sign) => JUMP_SIGNS.find((x) => x.sign === sign)).filter((x) => x !== undefined);
  if (chosen.length === 0 && !always) {
    return (
      <p className={cn("text-xs text-muted", className)}>
        q, &lt;, &lt;&lt;, ! and e are the technical panel&apos;s calls.{" "}
        <Link href="/jumps#signs" className="font-medium text-accent hover:underline">
          What the signs mean →
        </Link>
      </p>
    );
  }
  return (
    <div className={cn("space-y-1 text-xs text-muted", className)} data-testid="sign-notes">
      {chosen.length === 0 ? (
        <p>q, &lt;, &lt;&lt;, ! and e are the technical panel&apos;s calls: a short rotation or a wrong take-off edge, each with its own effect on the value.</p>
      ) : (
        chosen.map((s) => (
          <p key={s.sign}>
            <span className="font-mono font-semibold text-foreground">{s.sign}</span> <span className="font-medium text-foreground">{s.name}</span>: {s.meaning} {s.baseValueEffect}
          </p>
        ))
      )}
      <Link href="/jumps#signs" className="font-medium text-accent hover:underline">
        What the signs mean →
      </Link>
    </div>
  );
}
