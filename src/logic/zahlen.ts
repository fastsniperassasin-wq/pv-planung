/** Zahlenhilfen (deutsches Komma, Formatierung) – reine Funktionen. */

export function parseDezimal(text: string): number | undefined {
  let t = text.trim().replace(/\s/g, "");
  if (t === "") return undefined;
  const komma = t.lastIndexOf(",");
  const punkt = t.lastIndexOf(".");
  if (komma >= 0 && punkt >= 0) {
    t = komma > punkt ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  } else if (komma >= 0) {
    t = t.replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, "");
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export function formatZahl(n: number | undefined, nachkomma = 2): string {
  if (n === undefined) return "";
  return n.toLocaleString("de-DE", { maximumFractionDigits: nachkomma });
}
