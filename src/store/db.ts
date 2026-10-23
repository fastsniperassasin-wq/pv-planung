import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Projekt } from "../model/types";
import { AKTUELLE_SCHEMA_VERSION } from "../model/types";

interface PvDb extends DBSchema {
  projekte: { key: string; value: Projekt };
  autosicherungen: { key: number; value: AutoSicherung };
  meta: { key: string; value: string };
}

/** Automatische, rotierende Sicherungskopie (nur auf diesem Gerät). */
export interface AutoSicherung {
  id: number; // Zeitstempel
  erstelltAm: string; // ISO
  projekte: Projekt[];
}

const MAX_AUTOSICHERUNGEN = 5;

let dbPromise: Promise<IDBPDatabase<PvDb>> | null = null;

function db(): Promise<IDBPDatabase<PvDb>> {
  dbPromise ??= openDB<PvDb>("pv-planung-app", 2, {
    upgrade(d) {
      if (!d.objectStoreNames.contains("projekte")) {
        d.createObjectStore("projekte", { keyPath: "id" });
      }
      if (!d.objectStoreNames.contains("autosicherungen")) {
        d.createObjectStore("autosicherungen", { keyPath: "id" });
      }
      if (!d.objectStoreNames.contains("meta")) {
        d.createObjectStore("meta");
      }
    },
  });
  return dbPromise;
}

/** Migrationskette für ältere Schema-Versionen. */
type AltesProjekt = Omit<Projekt, "schemaVersion"> & { schemaVersion: number };

export function migriere(p: Projekt): Projekt {
  let x: AltesProjekt = p;
  if (x.schemaVersion === 1) {
    // Version 2: Versatz, Hindernisse und freie Module je Dachfläche
    x = {
      ...x,
      schemaVersion: 2,
      dachflaechen: x.dachflaechen.map((d) => ({
        ...d,
        versatzX: d.versatzX ?? 0,
        versatzY: d.versatzY ?? 0,
        hindernisse: d.hindernisse ?? [],
        freieModule: d.freieModule ?? [],
      })),
    };
  }
  if (x.schemaVersion !== AKTUELLE_SCHEMA_VERSION) {
    throw new Error(`Unbekannte Schema-Version ${String(x.schemaVersion)}`);
  }
  return x as Projekt;
}

export async function alleProjekte(): Promise<Projekt[]> {
  const alle = await (await db()).getAll("projekte");
  return alle.map(migriere).sort((a, b) => b.beginn.localeCompare(a.beginn));
}

export async function speichereProjekt(p: Projekt): Promise<void> {
  await (await db()).put("projekte", p);
}

export async function loescheProjekt(id: string): Promise<void> {
  await (await db()).delete("projekte", id);
}

export async function ersetzeAlles(projekte: Projekt[]): Promise<void> {
  const d = await db();
  const tx = d.transaction("projekte", "readwrite");
  await tx.objectStore("projekte").clear();
  for (const p of projekte) await tx.objectStore("projekte").put(p);
  await tx.done;
}

/* ---------- Automatische Sicherungskopien (rotierend) ---------- */

export async function schreibeAutoSicherung(projekte: Projekt[]): Promise<void> {
  const d = await db();
  const jetzt = Date.now();
  await d.put("autosicherungen", {
    id: jetzt,
    erstelltAm: new Date(jetzt).toISOString(),
    projekte,
  });
  // Nur die neuesten behalten – keine Dateiflut
  const keys = (await d.getAllKeys("autosicherungen")).sort((a, b) => b - a);
  for (const alt of keys.slice(MAX_AUTOSICHERUNGEN)) {
    await d.delete("autosicherungen", alt);
  }
}

export async function listeAutoSicherungen(): Promise<
  { id: number; erstelltAm: string; anzahl: number }[]
> {
  const alle = await (await db()).getAll("autosicherungen");
  return alle
    .sort((a, b) => b.id - a.id)
    .map((s) => ({ id: s.id, erstelltAm: s.erstelltAm, anzahl: s.projekte.length }));
}

export async function ladeAutoSicherung(id: number): Promise<AutoSicherung | undefined> {
  return (await db()).get("autosicherungen", id);
}

/* ---------- Kleine Merkwerte (z. B. letzte externe Sicherung) ---------- */

export async function leseMeta(key: string): Promise<string | undefined> {
  return (await db()).get("meta", key);
}

export async function schreibeMeta(key: string, wert: string): Promise<void> {
  await (await db()).put("meta", wert, key);
}
