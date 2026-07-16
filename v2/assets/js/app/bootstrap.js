import { createRouter } from "./router.js";
import { appStore } from "./app-store.js";
import { loadV2State } from "../core/storage.js";

const NAV_ITEMS = [
  { route: "hub", label: "Hub", available: true },
  { route: "randomizer", label: "Randomizer", available: true },
  { route: "gungame", label: "GunGame", available: true },
  { route: "muschel", label: "Miesmuschel", available: true },
  { route: "settings", label: "Einstellungen", available: true },
];

const ROUTE_ACCENT_VAR = {
  hub: "var(--color-randomizer)",
  randomizer: "var(--color-randomizer)",
  wheel: "var(--color-randomizer)",
  squad: "var(--color-randomizer)",
  gungame: "var(--color-gungame)",
  muschel: "var(--color-muschel)",
  settings: "var(--color-randomizer)",
};

function applyPersistedSettings() {
  const { settings } = loadV2State();
  document.documentElement.dataset.reducedMotion = String(
    settings.reducedMotion === true,
  );
  document.documentElement.dataset.streamer = settings.streamerMode ?? "off";
}

function buildNavLink(item) {
  const link = document.createElement("a");
  link.href = `#/${item.route}`;
  link.textContent = item.label;
  if (!item.available) {
    link.setAttribute("aria-disabled", "true");
    link.href = "#/hub";
    link.title = "Bald verfügbar";
  }
  return link;
}

function renderNav(container, className) {
  container.replaceChildren();
  NAV_ITEMS.forEach((item) => {
    const link = buildNavLink(item);
    link.className = className;
    link.dataset.route = item.route;
    container.appendChild(link);
  });
}

function updateActiveNav(routeName) {
  document
    .querySelectorAll("[data-route]")
    .forEach((link) => {
      if (link.dataset.route === routeName) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const isSupportedContext =
    location.protocol === "https:" ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";
  if (!isSupportedContext) return;

  navigator.serviceWorker
    .register("./sw.js", { updateViaCache: "none" })
    .then((registration) => {
      registration.update().catch(() => {});
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            worker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    })
    .catch(() => {});

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (sessionStorage.getItem("v2-sw-reloaded") === "1") return;
    sessionStorage.setItem("v2-sw-reloaded", "1");
    location.reload();
  });
}

export function bootstrap() {
  applyPersistedSettings();
  registerServiceWorker();

  const shell = document.getElementById("appShell");
  const sideNav = document.getElementById("appSideNav");
  const bottomNav = document.getElementById("appBottomNav");
  const outlet = document.getElementById("main");

  renderNav(sideNav, "app-nav-link");
  renderNav(bottomNav, "app-bottom-nav-link");

  createRouter({
    outlet,
    onRouteChange: (routeName) => {
      appStore.setState({ route: routeName });
      shell.style.setProperty(
        "--route-accent",
        ROUTE_ACCENT_VAR[routeName] ?? ROUTE_ACCENT_VAR.hub,
      );
      updateActiveNav(routeName);
      outlet.focus({ preventScroll: true });
    },
  });

  return appStore;
}
