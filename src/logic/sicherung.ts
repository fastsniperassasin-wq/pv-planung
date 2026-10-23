import type { Projekt } from "../model/types";
import * as db from "../store/db";
import { merkeExterneSicherung } from "../store/store";

interface SicherungsDatei {
  formatVersion: 1;
  app: "pv-planung";
  exportiertAm: string;
  projekte: Projekt[];
}

export async function datenExportieren(): Promise<void> {
  const daten: SicherungsDatei = {
    formatVersion: 1,
    app: "pv-planung",
    exportiertAm: new Date().toISOString(),
    projekte: await db.alleProjekte(),
  };
  const blob = new Blob([JSON.stringify(daten)], { type: "application/json" });
  const name = `pv-sicherung-${daten.exportiertAm.slice(0, 10)}.json`;
  const datei = new File([blob], name, { type: "application/json" });
  if (navigator.canShare?.({ files: [datei] })) {
    try {
      await navigator.share({ files: [datei], title: name });
      await merkeExterneSicherung();
      return;
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  await merkeExterneSicherung();
}

export async function datenImportieren(datei: File): Promise<void> {
  const daten = JSON.parse(await datei.text()) as SicherungsDatei;
  if (daten.formatVersion !== 1 || !Array.isArray(daten.projekte)) {
    throw new Error("Keine gültige Sicherungsdatei.");
  }
  await db.ersetzeAlles(daten.projekte.map(db.migriere));
}
