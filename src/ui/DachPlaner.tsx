import { useRef, useState } from "react";
import type { Dachflaeche } from "../model/types";
import { aktiveModule, kwp, slotInfos } from "../logic/dach";
import { formatZahl } from "../logic/zahlen";

type Auswahl = { typ: "hindernis" | "frei"; id: string } | null;

/**
 * Maßstabsgetreue Dachansicht: Rastermodule antippen = aus-/einplanen,
 * Hindernisse und freie Module mit dem Finger verschieben.
 */
export default function DachPlaner(props: {
  d: Dachflaeche;
  aufToggle: (index: number) => void;
  aufBewegt: (typ: "hindernis" | "frei", id: string, x: number, y: number) => void;
  aufLoeschen: (typ: "hindernis" | "frei", id: string) => void;
}) {
  const { d } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const [auswahl, setAuswahl] = useState<Auswahl>(null);
  const [tempPos, setTempPos] = useState<{ id: string; x: number; y: number } | null>(null);
  const drag = useRef<{
    typ: "hindernis" | "frei";
    id: string;
    greifX: number;
    greifY: number;
    bewegt: boolean;
    breite: number;
    hoehe: number;
  } | null>(null);

  const info = slotInfos(d);
  const r = info.raster;

  if (!d.breite || !d.hoehe) {
    return (
      <p className="rounded-lg bg-grund p-3 text-center text-[14px] text-dezent">
        Breite und Höhe eintragen – dann erscheint hier die Dachansicht mit
        der Modulbelegung.
      </p>
    );
  }

  const breite = d.breite;
  const hoehe = d.hoehe;

  /** Zeigerposition in Dach-Koordinaten (m). */
  function dachPos(e: React.PointerEvent): { x: number; y: number } {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * (breite + 0.2) - 0.1,
      y: ((e.clientY - rect.top) / rect.height) * (hoehe + 0.2) - 0.1,
    };
  }

  function startDrag(
    e: React.PointerEvent,
    typ: "hindernis" | "frei",
    id: string,
    x: number,
    y: number,
    b: number,
    h: number,
  ) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = dachPos(e);
    drag.current = { typ, id, greifX: p.x - x, greifY: p.y - y, bewegt: false, breite: b, hoehe: h };
  }

  function bewegDrag(e: React.PointerEvent) {
    const dr = drag.current;
    if (!dr) return;
    const p = dachPos(e);
    // auf 1 cm runden und aufs Dach begrenzen
    const nx = Math.min(Math.max(0, Math.round((p.x - dr.greifX) * 100) / 100), breite - dr.breite);
    const ny = Math.min(Math.max(0, Math.round((p.y - dr.greifY) * 100) / 100), hoehe - dr.hoehe);
    dr.bewegt = true;
    setTempPos({ id: dr.id, x: nx, y: ny });
  }

  function endeDrag() {
    const dr = drag.current;
    drag.current = null;
    if (!dr) return;
    if (dr.bewegt && tempPos && tempPos.id === dr.id) {
      props.aufBewegt(dr.typ, dr.id, tempPos.x, tempPos.y);
    } else {
      // kein Ziehen → auswählen/abwählen
      setAuswahl((a) =>
        a && a.id === dr.id ? null : { typ: dr.typ, id: dr.id },
      );
    }
    setTempPos(null);
  }

  function pos(id: string, x: number, y: number): { x: number; y: number } {
    return tempPos && tempPos.id === id ? tempPos : { x, y };
  }

  const gewaehltesHindernis =
    auswahl?.typ === "hindernis"
      ? d.hindernisse.find((h) => h.id === auswahl.id)
      : undefined;
  const gewaehltesFrei =
    auswahl?.typ === "frei"
      ? d.freieModule.find((f) => f.id === auswahl.id)
      : undefined;

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`-0.1 -0.1 ${breite + 0.2} ${hoehe + 0.2}`}
        className="w-full rounded-lg"
        style={{ touchAction: "none", background: "#c7542f" }}
        role="img"
        aria-label={`Dachfläche ${d.name}: ${aktiveModule(d)} Module eingeplant`}
      >
        {/* Dachfläche */}
        <rect x={0} y={0} width={breite} height={hoehe} fill="#d98a66" stroke="#8a3b22" strokeWidth={0.05} />
        {Array.from({ length: Math.max(0, Math.ceil(hoehe / 0.4) - 1) }, (_, i) => (
          <line key={i} x1={0} y1={(i + 1) * 0.4} x2={breite} y2={(i + 1) * 0.4} stroke="#c07050" strokeWidth={0.02} />
        ))}

        {/* Rastermodule */}
        {info.slots.map((s) => (
          <rect
            key={s.index}
            x={s.x}
            y={s.y}
            width={r.modulB}
            height={r.modulH}
            rx={0.02}
            fill={
              s.zustand === "aktiv"
                ? "#16365c"
                : s.zustand === "abgewaehlt"
                  ? "rgba(255,255,255,0.65)"
                  : "rgba(255,255,255,0.15)"
            }
            stroke={s.zustand === "aktiv" ? "#9db8d8" : "#68717f"}
            strokeWidth={s.zustand === "aktiv" ? 0.015 : 0.02}
            strokeDasharray={s.zustand === "aktiv" ? undefined : "0.08 0.06"}
            style={{ cursor: s.zustand === "blockiert" ? "default" : "pointer" }}
            onClick={() => {
              if (s.zustand !== "blockiert") props.aufToggle(s.index);
            }}
          />
        ))}

        {/* Hindernisse (ziehbar) */}
        {d.hindernisse.map((h) => {
          const p = pos(h.id, h.x, h.y);
          const gewaehlt = auswahl?.typ === "hindernis" && auswahl.id === h.id;
          return (
            <g key={h.id}>
              <rect
                x={p.x}
                y={p.y}
                width={h.breite}
                height={h.hoehe}
                rx={0.03}
                fill="rgba(241,244,248,0.95)"
                stroke={gewaehlt ? "#d97706" : "#1c2433"}
                strokeWidth={gewaehlt ? 0.05 : 0.03}
                style={{ cursor: "grab" }}
                onPointerDown={(e) => startDrag(e, "hindernis", h.id, p.x, p.y, h.breite, h.hoehe)}
                onPointerMove={bewegDrag}
                onPointerUp={endeDrag}
                onPointerCancel={endeDrag}
              />
              {h.breite >= 0.5 && h.hoehe >= 0.35 ? (
                <text
                  x={p.x + h.breite / 2}
                  y={p.y + h.hoehe / 2 + 0.06}
                  textAnchor="middle"
                  fontSize={0.17}
                  fill="#1c2433"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {h.name}
                </text>
              ) : null}
            </g>
          );
        })}

        {/* Freie Module (ziehbar) */}
        {d.freieModule.map((f) => {
          const p = pos(f.id, f.x, f.y);
          const gewaehlt = auswahl?.typ === "frei" && auswahl.id === f.id;
          return (
            <rect
              key={f.id}
              x={p.x}
              y={p.y}
              width={r.modulB}
              height={r.modulH}
              rx={0.02}
              fill="#16365c"
              stroke={gewaehlt ? "#d97706" : "#f0a92e"}
              strokeWidth={gewaehlt ? 0.05 : 0.03}
              style={{ cursor: "grab" }}
              onPointerDown={(e) => startDrag(e, "frei", f.id, p.x, p.y, r.modulB, r.modulH)}
              onPointerMove={bewegDrag}
              onPointerUp={endeDrag}
              onPointerCancel={endeDrag}
            />
          );
        })}
      </svg>

      {gewaehltesHindernis || gewaehltesFrei ? (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border-2 border-sonne bg-sonne-hell p-2">
          <span className="text-[14px] font-semibold">
            {gewaehltesHindernis
              ? `${gewaehltesHindernis.name} · ${formatZahl(gewaehltesHindernis.x)} / ${formatZahl(gewaehltesHindernis.y)} m`
              : "Freies Modul (mit Rand-Markierung)"}
            <span className="block text-[12px] font-normal text-dezent">
              Zum Verschieben einfach ziehen
            </span>
          </span>
          <button
            type="button"
            className="min-h-11 flex-none rounded-lg border-2 border-fehler px-3 text-[14px] font-bold text-fehler"
            onClick={() => {
              props.aufLoeschen(auswahl!.typ, auswahl!.id);
              setAuswahl(null);
            }}
          >
            Löschen
          </button>
        </div>
      ) : null}

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
