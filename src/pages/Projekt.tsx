import { useState } from "react";
import type { Dachflaeche, Projekt, ProjektStatus } from "../model/types";
import { AUSRICHTUNGEN, STATUS_TEXT } from "../model/types";
import { aenderProjekt, loescheProjekt, neueId, useAppZustand } from "../store/store";
import { geheZu } from "../ui/router";
import {
  Feld,
  GrosserKnopf,
  TextEingabe,
  ZahlEingabe,
  eingabeKlasse,
} from "../ui/bausteine";
import DachPlaner from "../ui/DachPlaner";
import {
  HINDERNIS_VORLAGEN,
  leereDachflaeche,
  neuesHindernis,
  projektKwp,
  projektModule,
} from "../logic/dach";
import { formatZahl } from "../logic/zahlen";

export default function ProjektPage(props: { id: string }) {
  const { projekte } = useAppZustand();
  const p = projekte.find((x) => x.id === props.id);
  const [modulDetails, setModulDetails] = useState<string | null>(null);

  if (!p) {
    return (
      <div className="py-10 text-center">
        <p className="mb-4 text-dezent">Projekt nicht gefunden.</p>
        <GrosserKnopf aufKlick={() => geheZu({ name: "kalender" })}>
          Zum Kalender
        </GrosserKnopf>
      </div>
    );
  }

  function setze(aenderung: (x: Projekt) => Projekt) {
    aenderProjekt(props.id, aenderung);
  }

  function setzeDach(dachId: string, teil: Partial<Dachflaeche>) {
    setze((x) => ({
      ...x,
      dachflaechen: x.dachflaechen.map((d) =>
        d.id === dachId ? { ...d, ...teil } : d,
      ),
    }));
  }

  const besorgt = p.material.filter((m) => m.erledigt).length;

  return (
    <div className="flex flex-col gap-5">
      {/* ---------- Anlagen-Übersicht ---------- */}
      <div className="flex items-center justify-between rounded-xl border-2 border-tinte bg-flaeche p-3">
        <div>
          <div className="text-[13px] font-bold uppercase tracking-wide text-dezent">
            Geplante Anlage
          </div>
          <div className="text-[15px] text-dezent">
            {p.dachflaechen.length} Dachfläche
            {p.dachflaechen.length === 1 ? "" : "n"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[22px] font-bold text-sonne">
            {formatZahl(projektKwp(p))} kWp
          </div>
          <div className="text-[14px] text-dezent">
            {projektModule(p)} Module
          </div>
        </div>
      </div>

      {/* ---------- Stammdaten ---------- */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[16px] font-bold uppercase tracking-wide text-dezent">
          Projekt
        </h2>
        <Feld label="Name des Projekts">
          <TextEingabe
            wert={p.name}
            platzhalter="z. B. PV-Anlage Musterweg"
            aufAenderung={(v) => setze((x) => ({ ...x, name: v }))}
          />
        </Feld>
        <Feld label="Kunde">
          <TextEingabe
            wert={p.kunde}
            aufAenderung={(v) => setze((x) => ({ ...x, kunde: v }))}
          />
        </Feld>
        <Feld label="Adresse">
          <TextEingabe
            wert={p.adresse}
            platzhalter="Straße Nr., PLZ Ort"
            aufAenderung={(v) => setze((x) => ({ ...x, adresse: v }))}
          />
        </Feld>
        <Feld label="Telefon">
          <TextEingabe
            wert={p.telefon}
            typ="tel"
            aufAenderung={(v) => setze((x) => ({ ...x, telefon: v }))}
          />
        </Feld>
        <div className="grid grid-cols-2 gap-3">
          <Feld label="Beginn" hinweis="Leer = noch ohne Termin (nicht im Kalender)">
            <TextEingabe
              typ="date"
              wert={p.beginn}
              aufAenderung={(v) => setze((x) => ({ ...x, beginn: v }))}
            />
          </Feld>
          <Feld label="Ende (leer = 1 Tag)">
            <TextEingabe
              typ="date"
              wert={p.ende}
              aufAenderung={(v) => setze((x) => ({ ...x, ende: v }))}
            />
          </Feld>
        </div>
        <Feld label="Status">
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(STATUS_TEXT) as ProjektStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={p.status === s}
                className={
                  "min-h-12 rounded-lg border-2 text-[14px] font-bold " +
                  (p.status === s
                    ? s === "geplant"
                      ? "border-geplant bg-geplant text-white"
                      : s === "laufend"
                        ? "border-sonne bg-sonne text-white"
                        : "border-fertig bg-fertig text-white"
                    : "border-linie bg-flaeche text-tinte")
                }
                onClick={() => setze((x) => ({ ...x, status: s }))}
              >
                {STATUS_TEXT[s]}
              </button>
            ))}
          </div>
        </Feld>
        <Feld label="Notizen">
          <textarea
            className="min-h-20 w-full rounded-lg border-2 border-linie bg-flaeche px-3 py-3 text-[17px] focus:border-akzent focus:outline-none"
            value={p.notizen}
            onChange={(e) => setze((x) => ({ ...x, notizen: e.target.value }))}
          />
        </Feld>
      </section>

      {/* ---------- Dachflächenplaner ---------- */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[16px] font-bold uppercase tracking-wide text-dezent">
          Dachflächenplaner
        </h2>
        {p.dachflaechen.map((d) => (
          <div key={d.id} className="flex flex-col gap-3 rounded-xl border-2 border-linie bg-flaeche p-3">
            <div className="flex gap-2">
              <input
                className={eingabeKlasse + " flex-1 font-bold"}
                value={d.name}
                placeholder="Name der Dachfläche"
                onChange={(e) => setzeDach(d.id, { name: e.target.value })}
              />
              <button
                type="button"
                aria-label="Dachfläche löschen"
                className="min-h-12 min-w-12 rounded-lg border-2 border-linie text-[18px] font-bold text-fehler"
                onClick={() => {
                  if (window.confirm(`Dachfläche „${d.name}“ löschen?`))
                    setze((x) => ({
                      ...x,
                      dachflaechen: x.dachflaechen.filter((y) => y.id !== d.id),
                    }));
                }}
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Feld label="Breite (Traufe)">
                <ZahlEingabe
                  klein
                  wert={d.breite}
                  suffix="m"
                  aufAenderung={(n) => setzeDach(d.id, { breite: n })}
                />
              </Feld>
              <Feld label="Höhe (Sparren)">
                <ZahlEingabe
                  klein
                  wert={d.hoehe}
                  suffix="m"
                  aufAenderung={(n) => setzeDach(d.id, { hoehe: n })}
                />
              </Feld>
              <Feld label="Neigung">
                <ZahlEingabe
                  klein
                  wert={d.neigung}
                  suffix="°"
                  aufAenderung={(n) => setzeDach(d.id, { neigung: n })}
                />
              </Feld>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Feld label="Ausrichtung">
                <select
                  className={eingabeKlasse + " px-2 py-2 text-[16px] min-h-11"}
                  value={d.ausrichtung}
                  onChange={(e) => setzeDach(d.id, { ausrichtung: e.target.value })}
                >
                  {AUSRICHTUNGEN.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </Feld>
              <Feld label="Verlegung">
                <div className="grid grid-cols-2 gap-1">
                  {([false, true] as const).map((quer) => (
                    <button
                      key={String(quer)}
                      type="button"
                      aria-pressed={d.quer === quer}
                      className={
                        "min-h-11 rounded-lg border-2 text-[14px] font-bold " +
                        (d.quer === quer
                          ? "border-akzent bg-akzent text-white"
                          : "border-linie bg-flaeche text-dezent")
                      }
                      onClick={() => setzeDach(d.id, { quer, deaktiviert: [] })}
                    >
                      {quer ? "Quer" : "Hochkant"}
                    </button>
                  ))}
                </div>
              </Feld>
            </div>

            <DachPlaner
              d={d}
              aufToggle={(index) =>
                setzeDach(d.id, {
                  deaktiviert: d.deaktiviert.includes(index)
                    ? d.deaktiviert.filter((i) => i !== index)
                    : [...d.deaktiviert, index],
                })
              }
              aufBewegt={(typ, id, x, y) =>
                typ === "hindernis"
                  ? setzeDach(d.id, {
                      hindernisse: d.hindernisse.map((h) =>
                        h.id === id ? { ...h, x, y } : h,
                      ),
                    })
                  : setzeDach(d.id, {
                      freieModule: d.freieModule.map((f) =>
                        f.id === id ? { ...f, x, y } : f,
                      ),
                    })
              }
              aufLoeschen={(typ, id) =>
                typ === "hindernis"
                  ? setzeDach(d.id, {
                      hindernisse: d.hindernisse.filter((h) => h.id !== id),
                    })
                  : setzeDach(d.id, {
                      freieModule: d.freieModule.filter((f) => f.id !== id),
                    })
              }
            />

            {/* Anlage verschieben (5-cm-Schritte) */}
            <div className="flex items-center justify-between gap-2 rounded-lg bg-grund p-2">
              <span className="text-[13px] font-semibold text-dezent">
                Anlage verschieben
                {d.versatzX !== 0 || d.versatzY !== 0 ? (
                  <span className="block text-[12px] font-normal">
                    Versatz {formatZahl(d.versatzX * 100, 0)} cm /{" "}
                    {formatZahl(d.versatzY * 100, 0)} cm
                  </span>
                ) : null}
              </span>
              <div className="flex gap-1">
                {(
                  [
                    ["◀", -0.05, 0],
                    ["▲", 0, -0.05],
                    ["▼", 0, 0.05],
                    ["▶", 0.05, 0],
                  ] as const
                ).map(([txt, dx, dy]) => (
                  <button
                    key={txt}
                    type="button"
                    aria-label={`Anlage ${txt} verschieben`}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-linie bg-flaeche text-[16px] font-bold active:border-akzent"
                    onClick={() =>
                      setzeDach(d.id, {
                        versatzX: Math.round((d.versatzX + dx) * 100) / 100,
                        versatzY: Math.round((d.versatzY + dy) * 100) / 100,
                      })
                    }
                  >
                    {txt}
                  </button>
                ))}
                <button
                  type="button"
                  className="min-h-11 rounded-lg border-2 border-linie bg-flaeche px-2 text-[13px] font-bold text-dezent active:border-akzent"
                  onClick={() => setzeDach(d.id, { versatzX: 0, versatzY: 0 })}
                >
                  Mitte
                </button>
              </div>
            </div>

            {/* Hindernisse und freie Module hinzufügen */}
            <div className="flex flex-wrap gap-2">
              {HINDERNIS_VORLAGEN.map((v) => (
                <button
                  key={v.name}
                  type="button"
                  className="min-h-11 flex-1 rounded-lg border-2 border-linie bg-flaeche px-2 text-[13px] font-bold active:border-akzent"
                  onClick={() =>
                    setzeDach(d.id, {
                      hindernisse: [
                        ...d.hindernisse,
                        neuesHindernis(neueId(), v, d),
                      ],
                    })
                  }
                >
                  + {v.name}
                </button>
              ))}
              <button
                type="button"
                className="min-h-11 flex-1 rounded-lg border-2 border-sonne bg-sonne-hell px-2 text-[13px] font-bold text-sonne"
                onClick={() =>
                  setzeDach(d.id, {
                    freieModule: [
                      ...d.freieModule,
                      {
                        id: neueId(),
                        x: Math.max(0, (d.breite ?? 2) / 2),
                        y: Math.max(0, (d.hoehe ?? 2) / 2),
                      },
                    ],
                  })
                }
              >
                + Freies Modul
              </button>
            </div>
            {d.hindernisse.length > 0 ? (
              <p className="text-[13px] text-dezent">
                Hindernisse und freie Module in der Dachansicht einfach mit dem
                Finger an die richtige Stelle ziehen. Antippen zeigt den
                Löschen-Knopf; Maße lassen sich unten anpassen.
              </p>
            ) : null}

            {/* Hindernis-Maße */}
            {d.hindernisse.map((h) => (
              <div key={h.id} className="grid grid-cols-5 items-end gap-1 rounded-lg bg-grund p-2">
                <input
                  className={eingabeKlasse.replace("w-full", "col-span-5 w-full") + " px-2 py-1.5 text-[14px] min-h-10 mb-1"}
                  value={h.name}
                  onChange={(e) =>
                    setzeDach(d.id, {
                      hindernisse: d.hindernisse.map((y) =>
                        y.id === h.id ? { ...y, name: e.target.value } : y,
                      ),
                    })
                  }
                />
                {(
                  [
                    ["x", h.x, "↔ Lage"],
                    ["y", h.y, "↕ Lage"],
                    ["breite", h.breite, "Breite"],
                    ["hoehe", h.hoehe, "Höhe"],
                  ] as const
                ).map(([feld, wert, label]) => (
                  <label key={feld} className="block">
                    <span className="block text-[11px] font-semibold uppercase text-dezent">
                      {label}
                    </span>
                    <ZahlEingabe
                      klein
                      wert={wert}
                      suffix="m"
                      aufAenderung={(n) =>
                        setzeDach(d.id, {
                          hindernisse: d.hindernisse.map((y) =>
                            y.id === h.id ? { ...y, [feld]: n ?? 0 } : y,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
                <button
                  type="button"
                  aria-label={`${h.name} löschen`}
                  className="min-h-11 rounded-lg border-2 border-linie text-[16px] font-bold text-fehler"
                  onClick={() =>
                    setzeDach(d.id, {
                      hindernisse: d.hindernisse.filter((y) => y.id !== h.id),
                    })
                  }
                >
                  ×
                </button>
              </div>
            ))}

            <button
              type="button"
              className="text-left text-[14px] font-bold text-akzent"
              onClick={() => setModulDetails(modulDetails === d.id ? null : d.id)}
            >
              {modulDetails === d.id ? "▴ " : "▸ "}Modul-Einstellungen (
              {formatZahl(d.modulBreite, 3)} × {formatZahl(d.modulHoehe, 3)} m,{" "}
              {d.modulWp} Wp)
            </button>
            {modulDetails === d.id ? (
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-grund p-2">
                <Feld label="Modulbreite">
                  <ZahlEingabe
                    klein
                    wert={d.modulBreite}
                    suffix="m"
                    aufAenderung={(n) =>
                      setzeDach(d.id, { modulBreite: n ?? 1.134, deaktiviert: [] })
                    }
                  />
                </Feld>
                <Feld label="Modulhöhe">
                  <ZahlEingabe
                    klein
                    wert={d.modulHoehe}
                    suffix="m"
                    aufAenderung={(n) =>
                      setzeDach(d.id, { modulHoehe: n ?? 1.722, deaktiviert: [] })
                    }
                  />
                </Feld>
                <Feld label="Leistung je Modul">
                  <ZahlEingabe
                    klein
                    wert={d.modulWp}
                    suffix="Wp"
                    aufAenderung={(n) => setzeDach(d.id, { modulWp: n ?? 440 })}
                  />
                </Feld>
                <Feld label="Randabstand">
                  <ZahlEingabe
                    klein
                    wert={d.randAbstand}
                    suffix="m"
                    aufAenderung={(n) =>
                      setzeDach(d.id, { randAbstand: n ?? 0.3, deaktiviert: [] })
                    }
                  />
                </Feld>
              </div>
            ) : null}
          </div>
        ))}
        <GrosserKnopf
          art="sekundaer"
          aufKlick={() =>
            setze((x) => ({
              ...x,
              dachflaechen: [
                ...x.dachflaechen,
                leereDachflaeche(
                  neueId(),
                  `Dachfläche ${x.dachflaechen.length + 1}`,
                ),
              ],
            }))
          }
        >
          + Weitere Dachfläche
        </GrosserKnopf>
      </section>

      {/* ---------- Material-Checkliste ---------- */}
      <section className="flex flex-col gap-2">
        <h2 className="text-[16px] font-bold uppercase tracking-wide text-dezent">
          Material-Checkliste ({besorgt}/{p.material.length})
        </h2>
        <p className="rounded-lg bg-akzent-hell p-2 text-[14px] text-akzent">
          Laut Dachplaner: <b>{projektModule(p)} Module</b> (
          {formatZahl(projektKwp(p))} kWp)
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-grund">
          <div
            className={
              "h-full rounded-full " +
              (besorgt === p.material.length && p.material.length > 0
                ? "bg-fertig"
                : "bg-akzent")
            }
            style={{
              width: `${p.material.length ? (besorgt / p.material.length) * 100 : 0}%`,
            }}
          />
        </div>
        {p.material.map((m) => (
          <div key={m.id} className="flex items-center gap-2">
            <button
              type="button"
              role="checkbox"
              aria-checked={m.erledigt}
              aria-label={`${m.text || "Position"} besorgt`}
              className={
                "flex h-11 w-11 flex-none items-center justify-center rounded-lg border-2 text-[18px] font-bold " +
                (m.erledigt
                  ? "border-fertig bg-fertig text-white"
                  : "border-dezent bg-flaeche text-transparent")
              }
              onClick={() =>
                setze((x) => ({
                  ...x,
                  material: x.material.map((y) =>
                    y.id === m.id ? { ...y, erledigt: !y.erledigt } : y,
                  ),
                }))
              }
            >
              ✓
            </button>
            <input
              className={
                eingabeKlasse.replace("w-full", "flex-1 min-w-0") +
                " px-2 py-2 text-[15px] min-h-11" +
                (m.erledigt ? " text-dezent line-through" : "")
              }
              value={m.text}
              placeholder="Material / Position"
              onChange={(e) =>
                setze((x) => ({
                  ...x,
                  material: x.material.map((y) =>
                    y.id === m.id ? { ...y, text: e.target.value } : y,
                  ),
                }))
              }
            />
            <input
              className={
                eingabeKlasse.replace("w-full", "w-24 flex-none") +
                " px-2 py-2 text-[15px] min-h-11"
              }
              value={m.menge}
              placeholder="Menge"
              onChange={(e) =>
                setze((x) => ({
                  ...x,
                  material: x.material.map((y) =>
                    y.id === m.id ? { ...y, menge: e.target.value } : y,
                  ),
                }))
              }
            />
            <button
              type="button"
              aria-label="Position löschen"
              className="min-h-11 min-w-11 flex-none rounded-lg border-2 border-linie text-[17px] font-bold text-fehler"
              onClick={() =>
                setze((x) => ({
                  ...x,
                  material: x.material.filter((y) => y.id !== m.id),
                }))
              }
            >
              ×
            </button>
          </div>
        ))}
        <GrosserKnopf
          art="sekundaer"
          aufKlick={() =>
            setze((x) => ({
              ...x,
              material: [
                ...x.material,
                { id: neueId(), text: "", menge: "", erledigt: false },
              ],
            }))
          }
        >
          + Position hinzufügen
        </GrosserKnopf>
      </section>

      <hr className="border-linie" />
      <p className="text-[13px] text-dezent">
        Änderungen werden automatisch gespeichert.
      </p>
      <GrosserKnopf
        art="gefahr"
        aufKlick={() => {
          if (
            window.confirm(
              "Dieses Projekt mit Dachplanung und Materialliste endgültig löschen?",
            )
          ) {
            void loescheProjekt(props.id).then(() => geheZu({ name: "kalender" }));
          }
        }}
      >
        Projekt löschen
      </GrosserKnopf>
    </div>
  );
}
