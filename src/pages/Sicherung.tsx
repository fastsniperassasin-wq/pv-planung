import { useEffect, useRef, useState } from "react";
import { ladeAlles, useAppZustand } from "../store/store";
import * as db from "../store/db";
import { GrosserKnopf } from "../ui/bausteine";
import { datenExportieren, datenImportieren } from "../logic/sicherung";

export default function Sicherung() {
  const { letzteExterneSicherung } = useAppZustand();
  const [meldung, setMeldung] = useState("");
  const [autoKopien, setAutoKopien] = useState<
    { id: number; erstelltAm: string; anzahl: number }[]
  >([]);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void db.listeAutoSicherungen().then(setAutoKopien);
  }, [meldung]);

  function formatZeit(iso: string): string {
    return new Date(iso).toLocaleString("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[16px] font-bold uppercase tracking-wide text-dezent">
        Externe Sicherung (empfohlen)
      </h2>
      <p className="text-[15px] leading-relaxed text-dezent">
        Alle PV-Projekte als eine Datei sichern – z. B. per E-Mail an dich
        selbst oder in Google Drive. Das ist die einzige Sicherung, die auch
        Handyverlust oder das Löschen der App übersteht. Die App erinnert
        dich automatisch, wenn die letzte Sicherung älter als 7 Tage ist.
      </p>
      <p className="rounded-lg bg-grund p-3 text-[15px]">
        Letzte externe Sicherung:{" "}
        <b>
          {letzteExterneSicherung
            ? `${formatZeit(letzteExterneSicherung)} Uhr`
            : "noch nie"}
        </b>
      </p>
      <GrosserKnopf
        volleBreite
        aufKlick={() => {
          void datenExportieren().then(
            () => setMeldung("Sicherung erstellt ✓"),
            (e: unknown) => setMeldung("Fehler: " + String(e)),
          );
        }}
      >
        💾 Jetzt extern sichern
      </GrosserKnopf>
      <GrosserKnopf
        volleBreite
        art="sekundaer"
        aufKlick={() => importRef.current?.click()}
      >
        Sicherungsdatei einspielen
      </GrosserKnopf>
      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          if (
            !window.confirm(
              "Sicherung einspielen? Alle vorhandenen Daten auf diesem Gerät werden ersetzt. (Der jetzige Stand bleibt als automatische Kopie erhalten.)",
            )
          )
            return;
          void datenImportieren(f)
            .then(async () => {
              await ladeAlles();
              setMeldung("Sicherung eingespielt ✓");
            })
            .catch((err: unknown) => setMeldung("Fehler: " + String(err)));
        }}
      />
      {meldung ? (
        <p className="text-center text-[15px] font-bold text-akzent">{meldung}</p>
      ) : null}

      <hr className="border-linie" />

      <h2 className="text-[16px] font-bold uppercase tracking-wide text-dezent">
        Automatische Kopien (auf diesem Gerät)
      </h2>
      <p className="text-[15px] leading-relaxed text-dezent">
        Nach jeder Änderung legt die App von selbst eine Kopie an – behalten
        werden immer nur die letzten 5, ganz ohne Dateiflut. Damit holst du
        dir z. B. ein versehentlich gelöschtes Projekt zurück. Wichtig: Diese
        Kopien liegen im selben App-Speicher – gegen Handyverlust hilft nur
        die externe Sicherung oben.
      </p>
      {autoKopien.length === 0 ? (
        <p className="rounded-lg bg-grund p-3 text-[14px] text-dezent">
          Noch keine automatische Kopie vorhanden – sie entsteht bei der
          ersten Änderung an einem Projekt.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {autoKopien.map((k) => (
            <li
              key={k.id}
              className="flex items-center justify-between gap-2 rounded-lg border-2 border-linie bg-flaeche p-3"
            >
              <span className="text-[14px]">
                <b>{formatZeit(k.erstelltAm)} Uhr</b>
                <span className="block text-dezent">
                  {k.anzahl} Projekt{k.anzahl === 1 ? "" : "e"}
                </span>
              </span>
              <button
                type="button"
                className="min-h-11 flex-none rounded-lg border-2 border-akzent px-3 text-[14px] font-bold text-akzent"
                onClick={() => {
                  if (
                    !window.confirm(
                      `Stand vom ${formatZeit(k.erstelltAm)} Uhr wiederherstellen? Der aktuelle Stand wird dabei ersetzt.`,
                    )
                  )
                    return;
                  void db
                    .ladeAutoSicherung(k.id)
                    .then(async (s) => {
                      if (!s) throw new Error("Kopie nicht gefunden");
                      await db.ersetzeAlles(s.projekte.map(db.migriere));
                      await ladeAlles();
                      setMeldung("Stand wiederhergestellt ✓");
                    })
                    .catch((err: unknown) =>
                      setMeldung("Fehler: " + String(err)),
                    );
                }}
              >
                Wiederherstellen
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
