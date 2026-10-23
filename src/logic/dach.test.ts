import { describe, expect, it } from "vitest";
import { aktiveModule, kwp, leereDachflaeche, projektKwp, projektModule, raster } from "./dach";

function dach(breite: number, hoehe: number) {
  return { ...leereDachflaeche("d1", "Test"), breite, hoehe };
}

describe("raster", () => {
  it("rechnet Spalten und Zeilen aus den Dachmaßen", () => {
    // 10 m Traufe, 6 m Sparren, Rand 0,30 → nutzbar 9,40 × 5,40
    // hochkant 1,134 × 1,722 (+0,02 Fuge): 8 Spalten, 3 Zeilen
    const r = raster(dach(10, 6));
    expect(r.spalten).toBe(8);
    expect(r.zeilen).toBe(3);
    expect(r.gesamt).toBe(24);
  });
  it("quer verlegt vertauscht die Modulmaße", () => {
    const d = { ...dach(10, 6), quer: true };
    const r = raster(d);
    // quer 1,722 × 1,134: 5 Spalten, 4 Zeilen
    expect(r.spalten).toBe(5);
    expect(r.zeilen).toBe(4);
  });
  it("ohne Maße passt nichts", () => {
    expect(raster(leereDachflaeche("x", "leer")).gesamt).toBe(0);
    expect(raster(dach(0.5, 6)).spalten).toBe(0);
  });
});

describe("aktiveModule / kwp", () => {
  it("zieht abgewählte Plätze ab", () => {
    const d = { ...dach(10, 6), deaktiviert: [0, 5, 23] };
    expect(aktiveModule(d)).toBe(21);
    expect(kwp(d)).toBeCloseTo(9.24); // 21 × 440 Wp
  });
  it("ignoriert Abwahlen außerhalb des Rasters (z. B. nach Maßänderung)", () => {
    const d = { ...dach(10, 6), deaktiviert: [0, 999, -1] };
    expect(aktiveModule(d)).toBe(23);
  });
});

describe("Projekt-Summen", () => {
  it("addiert über alle Dachflächen", () => {
    const p = { dachflaechen: [dach(10, 6), { ...dach(10, 6), deaktiviert: [0] }] };
    expect(projektModule(p)).toBe(47);
    expect(projektKwp(p)).toBeCloseTo(20.68);
  });
});
