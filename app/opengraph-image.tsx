import { ImageResponse } from "next/og";

export const alt = "Figure Skating Explained: an interactive 3D guide to the elements of figure skating";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "linear-gradient(135deg, #07111c 0%, #0b3a5e 60%, #0b6fb8 100%)", color: "#e9f1f8", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: "#5db2ef" }} />
          <div style={{ fontSize: 34, fontWeight: 600 }}>Figure Skating Explained</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05, maxWidth: 1000 }}>Quads, spins, steps and scores, in 3D</div>
          <div style={{ fontSize: 30, color: "#b9d4ea" }}>Built from the ISU 2026-27 rules, handbooks and Scale of Values</div>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 24, color: "#cfe3f5" }}>
          {["4Lz 11.50", "3A 8.00", "CCoSp4 4.20", "StSq4 4.10"].map((t) => (
            <div key={t} style={{ padding: "8px 18px", borderRadius: 999, border: "2px solid #5db2ef" }}>
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
