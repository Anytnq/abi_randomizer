/* Game Hub view (Planungs.md 5.2). All three modes are wired up; the
   `available` flag stays per-tile so a future mode can ship disabled. */

const TILES = [
  {
    route: "randomizer",
    accent: "var(--color-randomizer)",
    eyebrow: "Loadout · Filter · Wheel · Squad",
    title: "Randomizer",
    desc: "Loadout würfeln, Kategorien filtern, live mit dem Squad synchronisieren.",
    available: true,
  },
  {
    route: "gungame",
    accent: "var(--color-gungame)",
    eyebrow: "Run & Stage-Fortschritt",
    title: "GunGame",
    desc: "Progressive Waffenroute erzeugen und gemeinsam durchspielen.",
    available: true,
  },
  {
    route: "muschel",
    accent: "var(--color-muschel)",
    eyebrow: "Ja / Nein Entscheidung",
    title: "Miesmuschel",
    desc: "Frag die Miesmuschel und bekomm eine sofortige Entscheidung.",
    available: true,
  },
];

function buildTile(tile) {
  const el = document.createElement(tile.available ? "a" : "div");
  el.className = "game-tile";
  el.style.setProperty("--tile-accent", tile.accent);

  if (tile.available) {
    el.href = `#/${tile.route}`;
  } else {
    el.setAttribute("aria-disabled", "true");
  }

  const eyebrow = document.createElement("p");
  eyebrow.className = "game-tile-eyebrow";
  eyebrow.textContent = tile.eyebrow;

  const title = document.createElement("p");
  title.className = "game-tile-title";
  title.textContent = tile.title;

  const desc = document.createElement("p");
  desc.className = "game-tile-desc";
  desc.textContent = tile.desc;

  const footer = document.createElement("div");
  footer.className = "game-tile-footer";
  const chip = document.createElement("span");
  chip.className = tile.available ? "status-chip status-chip--success" : "status-chip";
  chip.textContent = tile.available ? "Verfügbar" : "Bald verfügbar";
  footer.appendChild(chip);

  el.append(eyebrow, title, desc, footer);
  return el;
}

export function render(outlet) {
  const hero = document.createElement("section");
  hero.className = "hub-hero";
  hero.innerHTML = `
    <p class="hub-hero-eyebrow">v2.0 · Game Hub</p>
    <h1 class="hub-hero-title">Wähl deinen Modus</h1>
    <p class="hub-hero-subtitle">
      Alle Modi an einem Ort - komplett neu aufgebaute Oberfläche, dieselbe
      bewährte Spiellogik.
    </p>
  `;

  const grid = document.createElement("div");
  grid.className = "game-tile-grid";
  TILES.forEach((tile) => grid.appendChild(buildTile(tile)));

  outlet.append(hero, grid);
  return null;
}
