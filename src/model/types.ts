export type ProjektStatus = "geplant" | "laufend" | "abgeschlossen";

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
  deaktiviert: number[]; // abgewählte Modulplätze (Index im Raster)
}

export interface MaterialPosten {
  id: string;
  text: string;
  menge: string; // frei, z. B. „38 Stk.“ oder „120 m“
  erledigt: boolean;
}

export interface Projekt {
  schemaVersion: 1;
  id: string;
  angelegtAm: string; // ISO
  geaendertAm: string; // ISO

  name: string;
  kunde: string;
  adresse: string;
  telefon: string;
  notizen: string;
  status: ProjektStatus;

  beginn: string; // ISO-Datum (Pflicht)
  ende: string; // ISO-Datum oder "" = eintägig

  dachflaechen: Dachflaeche[];
  material: MaterialPosten[];
}

export const AKTUELLE_SCHEMA_VERSION = 1 as const;

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
