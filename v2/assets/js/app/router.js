/* Hash router with per-view dynamic import() (Planungs.md 8: "Ansichten
   per dynamischem import() laden"). */

const routes = {
  hub: () => import("../views/hub-view.js"),
  randomizer: () => import("../views/randomizer-view.js"),
  wheel: () => import("../views/wheel-view.js"),
  squad: () => import("../views/squad-view.js"),
  gungame: () => import("../views/gungame-view.js"),
  muschel: () => import("../views/muschel-view.js"),
  settings: () => import("../views/settings-view.js"),
};

export function createRouter({ outlet, onRouteChange }) {
  let currentCleanup = null;

  async function resolve() {
    const requested = window.location.hash.replace(/^#\/?/, "") || "hub";
    const routeName = routes[requested] ? requested : "hub";

    if (typeof currentCleanup === "function") {
      currentCleanup();
    }
    currentCleanup = null;

    outlet.replaceChildren();
    onRouteChange?.(routeName);

    const viewModule = await routes[routeName]();
    currentCleanup = viewModule.render(outlet) ?? null;
  }

  window.addEventListener("hashchange", resolve);
  resolve();
}
