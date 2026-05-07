# ABI Randomizer

Static browser randomizer for GitHub Pages with squad sync, wheel spin, advanced filters, and offline support.

## Features

- Slot-based randomizer for map, equipment, weapon, and secondary categories.
- Advanced filters with quick select/de-select actions:
	- Global toggle for all categories.
	- Per-group toggle for Map, Equipment, and Weapons.
- Default active categories on first load:
	- Map
	- Weapon
	- Secondary
- Squad mode (Firebase Realtime Database):
	- Create/join session by code.
	- Live player presence and results.
	- Leader actions via context menu (`...`): lead transfer and kick.
	- Live Activity feed with event-specific colors.
- Wheel mode:
	- Auto values from squad map results or manual values.
	- Leader spin overrides previous manual values for all squad members.
	- Pointer triangle oriented upward.
- PWA behavior:
	- Service Worker with offline fallback page.
	- Network-first strategy for static assets to reduce stale-cache issues after deployments.

## Project Structure

```text
.
├── index.html
├── randomizer.html
├── offline.html
├── sw.js
├── assets
│   ├── css
│   │   └── styles.css
│   └── js
│       ├── app.js
│       ├── data.js
│       ├── firebase.js
│       ├── game.js
│       ├── sound.js
│       ├── squad-utils.js
│       ├── squad-utils.test.js
│       ├── squad.js
│       ├── storage.js
│       ├── ui.js
│       └── wheel.js
└── README.md
```

## Deployment (GitHub Pages)

1. Push repository to GitHub.
2. Open repository settings.
3. Navigate to Pages.
4. Choose main branch and root folder.
5. Save.

`index.html` is served automatically.

## Local Development

- No build step required.
- Open the project with a local static server (recommended) so modules and service worker behave like production.
- If Firebase is used, provide valid project config in `assets/js/firebase.js`.

## Notes

- `randomizer.html` remains as compatibility redirect to `index.html`.
- The app is fully static (HTML/CSS/JavaScript modules).
- Cache updates are handled automatically; manual cache clearing should rarely be needed.