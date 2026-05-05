# ABI Randomizer

Static randomizer project prepared for GitHub Pages.

## Structure

```text
.
├── index.html
├── randomizer.html
├── .nojekyll
├── assets
│   ├── css
│   │   └── styles.css
│   └── js
│       ├── app.js
│       ├── data.js
│       ├── game.js
│       ├── storage.js
│       └── ui.js
└── README.md
```

## GitHub Pages

1. Push the repository to GitHub.
2. Open the repository settings.
3. Go to Pages.
4. Select the main branch and the root folder.
5. Save the setting.

GitHub Pages will serve index.html automatically.

## Notes

- randomizer.html stays as a compatibility redirect to index.html.
- The site uses only static HTML, CSS, and JavaScript, so no build step is required.
- JavaScript is split into modules for data, UI, storage, game logic, and bootstrap.