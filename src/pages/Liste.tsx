import { useState } from "react";
import type { ProjektStatus } from "../model/types";
import { STATUS_TEXT } from "../model/types";
import { erstelleProjekt, useAppZustand } from "../store/store";
import { geheZu } from "../ui/router";
import { GrosserKnopf, StatusChip, eingabeKlasse } from "../ui/bausteine";
import { formatZeitraum } from "../logic/kalender";
import { projektKwp, projektModule } from "../logic/dach";
import { formatZahl } from "../logic/zahlen";

type Sortierung = "neueste" | "aelteste" | "name" | "kwp";

const SORTIERUNGEN: { wert: Sortierung; text: string }[] = [
  { wert: "neueste", text: "Neueste zuerst" },
  { wert: "aelteste", text: "Älteste zuerst" },
  { wert: "name", text: "Name A–Z" },
  { wert: "kwp", text: "Anlagengröße (kWp)" },
];

export default function Liste() {
  const { projekte } = useAppZustand();
  const [suche, setSuche] = useState("");
  const [sortierung, setSortierung] = useState<Sortierung>("neueste");
  const [statusFilter, setStatusFilter] = useState<
    ProjektStatus | "alle" | "ohne_termin"
  >("alle");

  const s = suche.trim().toLowerCase();
  let gefiltert = projekte.filter(
    (p) =>
      (statusFilter === "alle"
        ? true
        : statusFilter === "ohne_termin"
          ? !p.beginn
          : p.status === statusFilter) &&
      (!s ||
        p.name.toLowerCase().includes(s) ||
        p.kunde.toLowerCase().includes(s) ||
        p.adresse.toLowerCase().includes(s)),
  );
  gefiltert = [...gefiltert].sort((a, b) => {
    switch (sortierung) {
      case "aelteste":
        return a.beginn.localeCompare(b.beginn);
      case "name":
        return (a.name || "Ω").localeCompare(b.name || "Ω", "de");
      case "kwp":
        return projektKwp(b) - projektKwp(a);
      default:
        return b.beginn.localeCompare(a.beginn);
    }
  });

  const kwpSumme = gefiltert.reduce((s2, p) => s2 + projektKwp(p), 0);

  return (
    <div className="flex flex-col gap-3">
      <GrosserKnopf
        volleBreite
        aufKlick={() => {
          void erstelleProjekt("").then((p) =>
            geheZu({ name: "projekt", id: p.id }),
          );
        }}
      >
        + Neues PV-Projekt (erst mal ohne Termin)
      </GrosserKnopf>
      <p className="-mt-1 text-[13px] text-dezent">
        Vorplanen ohne Datum: Das Projekt erscheint nur hier in der Liste.
        Sobald du auf der Projekt-Seite einen Beginn setzt, taucht es auch im
        Kalender auf.
      </p>

      <input
        type="search"
        className={eingabeKlasse}
        placeholder="Suche: Name, Kunde oder Adresse"
        value={suche}
        onChange={(e) => setSuche(e.target.value)}
      />

      <select
        aria-label="Sortierung"
        className={eingabeKlasse}
        value={sortierung}
        onChange={(e) => setSortierung(e.target.value as Sortierung)}
      >
        {SORTIERUNGEN.map((o) => (
          <option key={o.wert} value={o.wert}>
            {o.text}
          </option>
        ))}
      </select>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {(["alle", "ohne_termin", "geplant", "laufend", "abgeschlossen"] as const).map(
          (f) => (
            <button
              key={f}
              type="button"
              className={
                "min-h-11 flex-none rounded-full border-2 px-4 text-[14px] font-bold " +
                (statusFilter === f
                  ? "border-akzent bg-akzent-hell text-akzent"
                  : "border-linie bg-flaeche text-dezent")
              }
              onClick={() => setStatusFilter(f)}
            >
              {f === "alle"
                ? "Alle"
                : f === "ohne_termin"
                  ? "Ohne Termin"
                  : STATUS_TEXT[f]}
            </button>
          ),
        )}
      </div>

      {gefiltert.length === 0 ? (
        <p className="py-8 text-center text-[15px] text-dezent">
          {projekte.length === 0
            ? "Noch keine PV-Projekte. Leg mit „+ Neues PV-Projekt“ los oder tippe im Kalender auf einen Tag."
            : "Nichts gefunden."}
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {gefiltert.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="w-full rounded-xl border-2 border-linie bg-flaeche p-4 text-left active:border-akzent"
                  onClick={() => geheZu({ name: "projekt", id: p.id })}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-[17px] font-bold">
                        {p.name || "Ohne Namen"}
                      </div>
                      <div className="truncate text-[15px] text-dezent">
                        {[p.kunde, p.adresse].filter(Boolean).join(" · ") ||
                          "Keine Angaben"}
                      </div>
                      <div className="mt-1 text-[14px] text-dezent">
                        {formatZeitraum(p)} · {projektModule(p)} Module
                      </div>
                    </div>
                    <div className="flex flex-none flex-col items-end gap-1">
                      <StatusChip status={p.status} />
                      <span className="rounded-full bg-sonne-hell px-2 py-0.5 text-[12px] font-bold text-sonne">
                        {formatZahl(projektKwp(p))} kWp
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {kwpSumme > 0 ? (
            <p className="rounded-lg bg-sonne-hell p-3 text-center text-[15px] font-bold text-sonne">
              Angezeigte Projekte zusammen: {formatZahl(kwpSumme)} kWp
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
