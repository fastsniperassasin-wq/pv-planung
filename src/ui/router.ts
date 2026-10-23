import { useSyncExternalStore } from "react";

export type Route =
  | { name: "kalender" }
  | { name: "liste" }
  | { name: "sicherung" }
  | { name: "projekt"; id: string };

function parse(hash: string): Route {
  const teile = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (teile[0] === "liste") return { name: "liste" };
  if (teile[0] === "sicherung") return { name: "sicherung" };
  if (teile[0] === "p" && teile[1]) return { name: "projekt", id: teile[1] };
  return { name: "kalender" };
}

function subscribe(cb: () => void): () => void {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

let letzterHash: string | null = null;
let letzteRoute: Route = { name: "kalender" };

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, () => {
    if (window.location.hash !== letzterHash) {
      letzterHash = window.location.hash;
      letzteRoute = parse(letzterHash);
    }
    return letzteRoute;
  });
}

export function geheZu(route: Route): void {
  switch (route.name) {
    case "kalender":
      window.location.hash = "#/";
      break;
    case "liste":
      window.location.hash = "#/liste";
      break;
    case "sicherung":
      window.location.hash = "#/sicherung";
      break;
    case "projekt":
      window.location.hash = `#/p/${route.id}`;
      break;
  }
}
