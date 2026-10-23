import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Projekt } from "../model/types";
import { AKTUELLE_SCHEMA_VERSION } from "../model/types";

interface PvDb extends DBSchema {
  projekte: { key: string; value: Projekt };
}

let dbPromise: Promise<IDBPDatabase<PvDb>> | null = null;

function db(): Promise<IDBPDatabase<PvDb>> {
  dbPromise ??= openDB<PvDb>("pv-planung-app", 1, {
    upgrade(d) {
      if (!d.objectStoreNames.contains("projekte")) {
        d.createObjectStore("projekte", { keyPath: "id" });
      }
    },
  });
  return dbPromise;
}

/** Migrationskette für spätere Schema-Versionen. */
export function migriere(p: Projekt): Projekt {
  if (p.schemaVersion !== AKTUELLE_SCHEMA_VERSION) {
    throw new Error(`Unbekannte Schema-Version ${String(p.schemaVersion)}`);
  }
  return p;
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
