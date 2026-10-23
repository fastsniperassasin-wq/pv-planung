import { useSyncExternalStore } from "react";
import type { Projekt } from "../model/types";
import { leereDachflaeche } from "../logic/dach";
import { MATERIAL_VORLAGE } from "../data/materialVorlage";
import * as db from "./db";

export interface AppZustand {
  geladen: boolean;
  projekte: Projekt[];
  letzteExterneSicherung?: string; // ISO
  sicherungsBannerVerschobenAm?: string; // ISO-Datum
}

let zustand: AppZustand = { geladen: false, projekte: [] };

const hoerer = new Set<() => void>();
const melde = () => {
  for (const h of hoerer) h();
};

function subscribe(cb: () => void): () => void {
  hoerer.add(cb);
  return () => hoerer.delete(cb);
}

export function useAppZustand(): AppZustand {
  return useSyncExternalStore(subscribe, () => zustand);
}

export async function ladeAlles(): Promise<void> {
  const [projekte, letzteExterneSicherung, bannerVerschoben] =
    await Promise.all([
      db.alleProjekte(),
      db.leseMeta("letzteExterneSicherung"),
      db.leseMeta("sicherungsBannerVerschobenAm"),
    ]);
  zustand = {
    geladen: true,
    projekte,
    letzteExterneSicherung,
    sicherungsBannerVerschobenAm: bannerVerschoben,
  };
  melde();
}

/* ---------- Automatische Sicherungskopie (rotierend, im Gerät) ---------- */

let autoTimer: ReturnType<typeof setTimeout> | null = null;
let letzterAbdruck = "";

function abdruck(projekte: Projekt[]): string {
  return (
    projekte.length +
    "|" +
    projekte.map((p) => p.geaendertAm).sort().join(",")
  );
}

function planeAutoSicherung(): void {
  if (autoTimer) clearTimeout(autoTimer);
  autoTimer = setTimeout(() => {
    autoTimer = null;
    void sofortAutoSicherung();
  }, 3000);
}

/** Schreibt sofort eine Kopie, wenn sich seit der letzten etwas geändert hat. */
export async function sofortAutoSicherung(): Promise<void> {
  if (!zustand.geladen || zustand.projekte.length === 0) return;
  const jetzt = abdruck(zustand.projekte);
  if (jetzt === letzterAbdruck) return;
  letzterAbdruck = jetzt;
  await db.schreibeAutoSicherung(zustand.projekte);
}

export async function merkeExterneSicherung(): Promise<void> {
  const iso = new Date().toISOString();
  await db.schreibeMeta("letzteExterneSicherung", iso);
  zustand = { ...zustand, letzteExterneSicherung: iso };
  melde();
}

export async function verschiebeSicherungsBanner(): Promise<void> {
  const heute = new Date().toISOString().slice(0, 10);
  await db.schreibeMeta("sicherungsBannerVerschobenAm", heute);
  zustand = { ...zustand, sicherungsBannerVerschobenAm: heute };
  melde();
}

export function neueId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function neuesProjekt(beginnIso: string): Projekt {
  const jetzt = new Date().toISOString();
  return {
    schemaVersion: 2,
    id: neueId(),
    angelegtAm: jetzt,
    geaendertAm: jetzt,
    name: "",
    kunde: "",
    adresse: "",
    telefon: "",
    notizen: "",
    status: "geplant",
    beginn: beginnIso,
    ende: "",
    dachflaechen: [leereDachflaeche(neueId(), "Dachfläche 1")],
    material: MATERIAL_VORLAGE.map((text) => ({
      id: neueId(),
      text,
      menge: "",
      erledigt: false,
    })),
  };
}

/* ---------- Autosave (debounced) ---------- */

const wartend = new Map<string, ReturnType<typeof setTimeout>>();

function autosave(p: Projekt): void {
  const alt = wartend.get(p.id);
  if (alt) clearTimeout(alt);
  wartend.set(
    p.id,
    setTimeout(() => {
      wartend.delete(p.id);
      void db.speichereProjekt(p);
    }, 400),
  );
}

export async function erstelleProjekt(beginnIso: string): Promise<Projekt> {
  const p = neuesProjekt(beginnIso);
  await db.speichereProjekt(p);
  zustand = { ...zustand, projekte: [p, ...zustand.projekte] };
  melde();
  planeAutoSicherung();
  return p;
}

/** Einziger Schreibpfad für Änderungen (mit Autosave). */
export function aenderProjekt(
  id: string,
  aenderung: (p: Projekt) => Projekt,
): void {
  const alt = zustand.projekte.find((p) => p.id === id);
  if (!alt) return;
  const neu: Projekt = {
    ...aenderung(structuredClone(alt)),
    id: alt.id,
    geaendertAm: new Date().toISOString(),
  };
  zustand = {
    ...zustand,
    projekte: zustand.projekte.map((p) => (p.id === id ? neu : p)),
  };
  melde();
  autosave(neu);
  planeAutoSicherung();
}

export async function loescheProjekt(id: string): Promise<void> {
  // Vor dem Löschen eine Kopie des aktuellen Stands festhalten
  await sofortAutoSicherung();
  await db.loescheProjekt(id);
  zustand = {
    ...zustand,
    projekte: zustand.projekte.filter((p) => p.id !== id),
  };
  melde();
}
