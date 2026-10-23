export type ProjektStatus = "geplant" | "laufend" | "abgeschlossen";

/** Hindernis auf der Dachfläche (Dachfenster, Schornstein …), Maße in m. */
export interface Hindernis {
  id: string;
  name: string;
  x: number; // linke obere Ecke auf der Dachfläche
  y: number;
  breite: number;
  hoehe: number;
}

/** Frei platziertes Einzelmodul (außerhalb des Rasters), Lage in m. */
export interface FreiModul {
  id: string;
  x: number;
  y: number;
}

/** Eine Dachfläche mit Maßen und Modulbelegung. Maße in Metern. */
export interface Dachflaeche {
  id: string;
  name: string; // z. B. „Hauptdach Süd“
  breite?: number; // entlang der Traufe
  hoehe?: number; // entlang der Sparren
  neigung?: number; // Grad
  ausrichtung: string; // Süd, Südost, …
  modulBreite: number; // m (Hochkant-Maß)
  modulHoehe: number; // m
  modulWp: number; // Leistung je Modul in Wp
  quer: boolean; // Module quer statt hochkant legen
  randAbstand: number; // m Abstand zu allen Dachrändern
  modulAbstand: number; // m Abstand zwischen Modulen
  versatzX: number; // m Verschiebung des Modulfelds (+ = nach rechts)
  versatzY: number; // m (+ = nach unten)
  deaktiviert: number[]; // von Hand abgewählte Modulplätze
  hindernisse: Hindernis[];
  freieModule: FreiModul[];
}

export interface MaterialPosten {
  id: string;
  text: string;
  menge: string; // frei, z. B. „38 Stk.“ oder „120 m“
  erledigt: boolean;
}

export interface Projekt {
  schemaVersion: 2;
  id: string;
  angelegtAm: string; // ISO
  geaendertAm: string; // ISO

  name: string;
  kunde: string;
  adresse: string;
  telefon: string;
  notizen: string;
  status: ProjektStatus;

  beginn: string; // ISO-Datum oder "" = noch ohne Termin (nicht im Kalender)
  ende: string; // ISO-Datum oder "" = eintägig

  dachflaechen: Dachflaeche[];
  material: MaterialPosten[];
}

export const AKTUELLE_SCHEMA_VERSION = 2 as const;

export const STATUS_TEXT: Record<ProjektStatus, string> = {
  geplant: "Geplant",
  laufend: "Laufend",
  abgeschlossen: "Abgeschlossen",
};

export const AUSRICHTUNGEN = [
  "Süd",
  "Südost",
  "Südwest",
  "Ost",
  "West",
  "Nordost",
  "Nordwest",
  "Nord",
] as const;
