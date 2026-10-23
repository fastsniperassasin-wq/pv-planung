import type { Dachflaeche } from "../model/types";
import { aktiveModule, kwp, raster } from "../logic/dach";
import { formatZahl } from "../logic/zahlen";

/**
 * Maßstabsgetreue Dachansicht mit Modulraster. Ein Tipp auf ein Modul
 * wählt den Platz ab oder wieder an (z. B. Dachfenster, Kamin, Gaube).
 */
export default function DachPlaner(props: {
  d: Dachflaeche;
  aufToggle: (index: number) => void;
}) {
  const { d } = props;
  const r = raster(d);

  if (!d.breite || !d.hoehe) {
    return (
      <p className="rounded-lg bg-grund p-3 text-center text-[14px] text-dezent">
        Breite und Höhe eintragen – dann erscheint hier die Dachansicht mit
        der Modulbelegung.
      </p>
    );
  }
  if (r.gesamt === 0) {
    return (
      <p className="rounded-lg bg-sonne-hell p-3 text-center text-[14px] font-semibold text-sonne">
        Auf diese Fläche passt kein Modul – Maße, Randabstand oder
        Verlegerichtung prüfen.
      </p>
    );
  }

  const abgewaehlt = new Set(d.deaktiviert);
  // Belegung mittig ausrichten
  const belegtB = r.spalten * r.modulB + (r.spalten - 1) * d.modulAbstand;
  const belegtH = r.zeilen * r.modulH + (r.zeilen - 1) * d.modulAbstand;
  const startX = (d.breite - belegtB) / 2;
  const startY = (d.hoehe - belegtH) / 2;

  const module = [];
  for (let z = 0; z < r.zeilen; z++) {
    for (let s = 0; s < r.spalten; s++) {
      const index = z * r.spalten + s;
      const aktiv = !abgewaehlt.has(index);
      module.push(
        <rect
          key={index}
          x={startX + s * (r.modulB + d.modulAbstand)}
          y={startY + z * (r.modulH + d.modulAbstand)}
          width={r.modulB}
          height={r.modulH}
          rx={0.02}
          fill={aktiv ? "#16365c" : "rgba(255,255,255,0.65)"}
          stroke={aktiv ? "#9db8d8" : "#68717f"}
          strokeWidth={aktiv ? 0.015 : 0.025}
          strokeDasharray={aktiv ? undefined : "0.08 0.06"}
          style={{ cursor: "pointer" }}
          onClick={() => props.aufToggle(index)}
        />,
      );
    }
  }

  return (
    <div>
      <svg
        viewBox={`-0.1 -0.1 ${d.breite + 0.2} ${d.hoehe + 0.2}`}
        className="w-full rounded-lg"
        style={{ touchAction: "manipulation", background: "#c7542f" }}
        role="img"
        aria-label={`Dachfläche ${d.name}: ${aktiveModule(d)} Module eingeplant`}
      >
        {/* Dachfläche */}
        <rect
          x={0}
          y={0}
          width={d.breite}
          height={d.hoehe}
          fill="#d98a66"
          stroke="#8a3b22"
          strokeWidth={0.05}
        />
        {/* Ziegel-Andeutung */}
        {Array.from({ length: Math.max(0, Math.ceil(d.hoehe / 0.4) - 1) }, (_, i) => (
          <line
            key={i}
            x1={0}
            y1={(i + 1) * 0.4}
            x2={d.breite}
            y2={(i + 1) * 0.4}
            stroke="#c07050"
            strokeWidth={0.02}
          />
        ))}
        {module}
      </svg>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[14px] text-dezent">
          Raster {r.spalten} × {r.zeilen} · Modul antippen = aus-/einplanen
        </span>
        <span className="flex-none rounded-full bg-sonne-hell px-3 py-1 text-[14px] font-bold text-sonne">
          {aktiveModule(d)} Module · {formatZahl(kwp(d))} kWp
        </span>
      </div>
    </div>
  );
}
