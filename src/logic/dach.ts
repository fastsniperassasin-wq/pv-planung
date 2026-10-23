import type { Dachflaeche, Hindernis, Projekt } from "../model/types";

/**
 * Modulraster einer Dachfläche: Wie viele Module passen?
 * Alle Maße in Metern; bei quer verlegten Modulen sind Breite und Höhe
 * des Moduls vertauscht.
 */
export interface Raster {
  spalten: number;
  zeilen: number;
  gesamt: number;
  modulB: number; // Maß entlang der Traufe in Verlegerichtung
  modulH: number; // Maß entlang der Sparren in Verlegerichtung
}

export function raster(d: Dachflaeche): Raster {
  const modulB = d.quer ? d.modulHoehe : d.modulBreite;
  const modulH = d.quer ? d.modulBreite : d.modulHoehe;
  if (
    !d.breite ||
    !d.hoehe ||
    d.breite <= 0 ||
    d.hoehe <= 0 ||
    modulB <= 0 ||
    modulH <= 0
  ) {
    return { spalten: 0, zeilen: 0, gesamt: 0, modulB, modulH };
  }
  const nutzB = d.breite - 2 * d.randAbstand;
  const nutzH = d.hoehe - 2 * d.randAbstand;
  const spalten = Math.max(
    0,
    Math.floor((nutzB + d.modulAbstand) / (modulB + d.modulAbstand)),
  );
  const zeilen = Math.max(
    0,
    Math.floor((nutzH + d.modulAbstand) / (modulH + d.modulAbstand)),
  );
  return { spalten, zeilen, gesamt: spalten * zeilen, modulB, modulH };
}

export type SlotZustand = "aktiv" | "abgewaehlt" | "blockiert";

export interface SlotInfo {
  index: number;
  x: number; // linke obere Ecke auf der Dachfläche (m)
  y: number;
  zustand: SlotZustand;
}

function ueberlappt(
  ax: number, ay: number, ab: number, ah: number,
  bx: number, by: number, bb: number, bh: number,
): boolean {
  return ax < bx + bb && ax + ab > bx && ay < by + bh && ay + ah > by;
}

/**
 * Alle Rasterplätze mit Lage und Zustand. Das Feld sitzt mittig auf der
 * Nutzfläche und wird um versatzX/versatzY (m) verschoben. Plätze, die
 * dadurch den Randabstand verletzen oder ein Hindernis berühren, sind
 * automatisch blockiert; von Hand abgewählte zählen ebenfalls nicht.
 */
export function slotInfos(d: Dachflaeche): {
  raster: Raster;
  startX: number;
  startY: number;
  slots: SlotInfo[];
} {
  const r = raster(d);
  if (r.gesamt === 0 || !d.breite || !d.hoehe) {
    return { raster: r, startX: 0, startY: 0, slots: [] };
  }
  const belegtB = r.spalten * r.modulB + (r.spalten - 1) * d.modulAbstand;
  const belegtH = r.zeilen * r.modulH + (r.zeilen - 1) * d.modulAbstand;
  const startX = (d.breite - belegtB) / 2 + d.versatzX;
  const startY = (d.hoehe - belegtH) / 2 + d.versatzY;
  const abgewaehlt = new Set(d.deaktiviert);
  const eps = 1e-9;

  const slots: SlotInfo[] = [];
  for (let z = 0; z < r.zeilen; z++) {
    for (let s = 0; s < r.spalten; s++) {
      const index = z * r.spalten + s;
      const x = startX + s * (r.modulB + d.modulAbstand);
      const y = startY + z * (r.modulH + d.modulAbstand);
      const imRand =
        x >= d.randAbstand - eps &&
        y >= d.randAbstand - eps &&
        x + r.modulB <= d.breite - d.randAbstand + eps &&
        y + r.modulH <= d.hoehe - d.randAbstand + eps;
      const beruehrtHindernis = d.hindernisse.some((h) =>
        ueberlappt(x, y, r.modulB, r.modulH, h.x, h.y, h.breite, h.hoehe),
      );
      const zustand: SlotZustand =
        !imRand || beruehrtHindernis
          ? "blockiert"
          : abgewaehlt.has(index)
            ? "abgewaehlt"
            : "aktiv";
      slots.push({ index, x, y, zustand });
    }
  }
  return { raster: r, startX, startY, slots };
}

/** Aktive Module: gültige Rasterplätze plus frei platzierte Module. */
export function aktiveModule(d: Dachflaeche): number {
  const imRaster = slotInfos(d).slots.filter((s) => s.zustand === "aktiv").length;
  return imRaster + d.freieModule.length;
}

export function kwp(d: Dachflaeche): number {
  return (aktiveModule(d) * d.modulWp) / 1000;
}

export function projektModule(p: Pick<Projekt, "dachflaechen">): number {
  return p.dachflaechen.reduce((s, d) => s + aktiveModule(d), 0);
}

export function projektKwp(p: Pick<Projekt, "dachflaechen">): number {
  return p.dachflaechen.reduce((s, d) => s + kwp(d), 0);
}

export const HINDERNIS_VORLAGEN: { name: string; breite: number; hoehe: number }[] = [
  { name: "Dachfenster", breite: 0.78, hoehe: 1.18 },
  { name: "Schornstein", breite: 0.8, hoehe: 0.8 },
  { name: "Entlüfter", breite: 0.3, hoehe: 0.3 },
];

export function neuesHindernis(
  id: string,
  vorlage: { name: string; breite: number; hoehe: number },
  d: Dachflaeche,
): Hindernis {
  return {
    id,
    name: vorlage.name,
    breite: vorlage.breite,
    hoehe: vorlage.hoehe,
    x: Math.max(0, (d.breite ?? 2) / 2 - vorlage.breite / 2),
    y: Math.max(0, (d.hoehe ?? 2) / 3),
  };
}

export function leereDachflaeche(id: string, name: string): Dachflaeche {
  return {
    id,
    name,
    ausrichtung: "Süd",
    modulBreite: 1.134,
    modulHoehe: 1.722,
    modulWp: 440,
    quer: false,
    randAbstand: 0.3,
    modulAbstand: 0.02,
    versatzX: 0,
    versatzY: 0,
    deaktiviert: [],
    hindernisse: [],
    freieModule: [],
  };
}
