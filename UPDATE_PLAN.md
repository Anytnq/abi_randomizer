# Vollständiger Update-Plan

## Ziel
Führe ein umfassendes Projekt-Upgrade durch mit Fokus auf:
- Code-Qualität und Modularisierung
- Neue Funktionen und verbesserte Nutzerführung
- Modernes Design, bessere Responsivität und höhere Benutzerfreundlichkeit

## Umfang
- Quellcode in `assets/js/`
- Interaktive App-Seiten und UI-Logik
- Visual Design in `assets/css/styles.css`
- Service Worker und Offline-Verhalten
- Dokumentation und Update-Kommunikation
- Graphify-Analyse als Architektur-Review

## Priorisierte Update-Bereiche

### 1. Code-Update & Upgrade
- Refaktorieren von `assets/js/randomizer/app.js`:
  - Extrahiere Zustand, Filterlogik und UI-Rendering in kleine, gut testbare Funktionen.
  - Reduziere globale Variablen und nutze klarere Module.
  - Entferne hartkodierte Strings und setze konstante Werte in `data.js`.
- Überprüfe `assets/js/randomizer/ui.js`:
  - Vereinfache `renderFilterButtons()` mit klaren UI-Komponenten.
  - Füge bessere ARIA-Unterstützung und Tastaturbedienung hinzu.
- Prüfe Squad-Logik in `assets/js/randomizer/squad.js` und `squad-ui.js`:
  - Stelle sicher, dass Squad-Status und Leader-Berechtigungen sauber getrennt sind.
  - Bessere Fehler- und Offline-Handling bei Firebase-Verbindungsproblemen.
- Teste und optimiere `assets/js/randomizer/game.js`:
  - Prüfe Gewichtung, Zufallslogik und History-Persistenz.
  - Schließe mögliche Edge Cases bei `pickWeaponWinner()` und `updateWeaponHistory()` aus.
- Entferne veraltete oder toten Code in `assets/js/randomizer/sound.js` und `responsive-layout.js`.
- Aktualisiere Import-Suffixe wie `?v=...` nur dort, wo sie wirklich nötig sind.

### 2. Feature-Update
- Filter-Erweiterung und +UI:
  - Neue Kategorie-Toggles für `backpack` und `secondary` im mobilen Layout.
  - Persistiere Filterauswahl und Spielfeldzustand klarer.
- Squad-Feature verbessern:
  - Besseres UI für Live-Ergebnisse und Team-Status.
  - Sichtbare Meldung, wenn ein Nutzer kein Leader ist.
  - Automatische Wiedergabe der `Hero song`-Option bei 0-to-Hero.
- Offline-Upgrade:
  - Offline-Seite `offline.html` prüfen und ggf. um Download-Hinweise ergänzen.
  - Service Worker so aktualisieren, dass neue Assets zuverlässig geprimed werden.
- Audio- und Feedback-Update:
  - Schreibe `playHeroSong()`-UI deutlich sichtbarer.
  - Füge eine Sound-Auswahlschaltfläche für `crate reveal` und Spin-Sound hinzu.
- GunGame/Randomizer Features:
  - `MYSTERY_WEAPON_CARD` als echte Auswahlkarte im UI integrieren.
  - Sichtbares Statustext/Countdown beim Nachladen der Karte.

### 3. Design-Upgrade & Update
- Modernisiere das Theme:
  - Kontraste verbessern: Buttons, Header, Filterkacheln.
  - Einheitlichere Farbpalette für aktive / inaktive Zustände.
- Mobile-First Layout:
  - Prüfe `@media (max-width: 780px)` und optimiere Filter-/Wheel-Anzeige.
  - Stelle sicher, dass `.slot-machine` und Filterfelder auf kleinen Displays gut scrollen.
- UI-Elemente verfeinern:
  - Buttons mit konsistentem Hover/Active-Feedback.
  - Nutzereingaben verständlicher machen (`aria-pressed`, `disabled`).
- Animationen und visuelle Hierarchie:
  - Feinere Spin-Animationen und Übergänge beim Filter-Rendern.
  - Klarere Hervorhebung von Squad-Containern und Leader-Controls.
- Design-Politur für `debug-panel` und `streamer-mode`:
  - Stelle sicher, dass der Debug-Panel auf mobilen Geräten nicht überlappt.
  - Grüner Greenscreen-Modus sollte textlich noch deutlicher sein.

## Umsetzungsschritte

### A. Vor dem Update
1. Erstelle ein Git-Branch: `update/code-feature-design`
2. Führe `graphify` erneut aus, um aktuelle Architektur-Warnungen zu prüfen.
3. Öffne `randomizer.html`, `gungame.html`, `muschel.html`, `index.html` im Browser zur Basisprüfung.

### B. Code- und Funktions-Update
1. Refaktorierung:
   - Zerlege `app.js` in kleinere Funktionen.
   - Prüfe `ui.js` auf Duplikate und flache Komponenten.
2. Feature-Erweiterungen:
   - UI-Status für Squad-Moderation und Sound-Menüs.
   - Optionale `Hero song`-Steuerung in der Oberfläche.
3. Offline/Service Worker:
   - Sicherstellen, dass `sw.js` alle kritischen Assets cached.
   - Überprüfen, ob `offline.html` als Fallback funktioniert.

### C. Design-Update
1. Farb- und Kontrast-Optimierung.
2. Verbesserte mobile Layouts für Filter und Spin-Abschnitte.
3. Klare visuelle Zustände für aktives/nicht aktives Spiel.

### D. Dokumentation
1. Aktualisiere `README.md` mit neuen Funktionen.
2. Ergänze Release-Notes oder `CHANGELOG` für das Upgrade.
3. Beschreibe im `README` den `graphify-out/`-Status als Architektur-Review.

### E. Test & Review
1. Lokaler Test mit statischem Server.
2. Funktionstest für:
   - Randomizer-Slot und Spin
   - GunGame-Route
   - Squad-Join/Leader-Aktionen
   - Offline-Fallback
   - Audio-Playback
3. Abschluss-Review: `git diff`, `git add`, `git commit`.

## Checkliste
- [ ] Branch erstellt
- [ ] Code refaktoriert
- [ ] Neue Features implementiert
- [ ] Design-Update angewendet
- [ ] README aktualisiert
- [ ] Graphify-Report erneuert
- [ ] Lokale Tests bestanden
- [ ] Deployment geprüft

## Empfohlene Dateien
- `assets/js/randomizer/app.js`
- `assets/js/randomizer/ui.js`
- `assets/js/randomizer/game.js`
- `assets/js/randomizer/squad.js`
- `assets/js/randomizer/sound.js`
- `assets/js/randomizer/responsive-layout.js`
- `assets/css/styles.css`
- `sw.js`
- `README.md`
- `graphify-out/graph.html`
- `graphify-out/GRAPH_REPORT.md`

## Ergebnis
Das Update liefert:
- stabileren, modulareren JavaScript-Code
- bessere Nutzerführung und neue Squad-/Audio-Funktionen
- ein moderneres, responsives UI-Design
- dokumentierte Architektur-Insights durch Graphify
