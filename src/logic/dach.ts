import type { Dachflaeche, Projekt } from "../model/types";

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

/** Anzahl aktiver (nicht abgewählter) Module der Dachfläche. */
export function aktiveModule(d: Dachflaeche): number {
  const r = raster(d);
  const abgewaehlt = new Set(d.deaktiviert.filter((i) => i >= 0 && i < r.gesamt));
  return r.gesamt - abgewaehlt.size;
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
    deaktiviert: [],
  };
}
