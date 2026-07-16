# ABI Randomizer v2.0 – vollständiger Neuaufbau

## Klare Entscheidung

Version 2.0 wird kein Facelift und kein schrittweises Umstyling der bestehenden Oberfläche.

Die Benutzeroberfläche wird vollständig neu aufgebaut:

- neues Seitenkonzept
- neue Informationsarchitektur
- neues Layout für jeden Modus
- neues Design-System
- neue Komponenten
- neue CSS-Struktur
- neue Zustandsverwaltung
- neue Rendering-Schicht
- neue responsive Umsetzung
- neue Performance- und Qualitätsstandards

Aus v1 werden nur fachlich bewährte Daten und Kernfunktionen übernommen: Randomizer-Regeln, Waffen- und Map-Daten, Squad-Protokoll, Speicherformat und Audiofunktionen. Das bestehende HTML, die 3.700 Zeilen große CSS-Datei und die monolithische Steuerung in `assets/js/randomizer/app.js` dienen nicht als Grundlage des neuen UI.

## 1. Produktvision

v2 wird eine schnelle, bildschirmfüllende Gaming-Web-App statt einer Sammlung langer Formularseiten. Das Resultat und die nächste sinnvolle Aktion stehen immer im Mittelpunkt. Einstellungen, Squad, Wheel und Verlauf werden als klar getrennte Arbeitsbereiche geöffnet und überladen das Hauptspiel nicht.

Die Anwendung erhält eine gemeinsame App-Shell und drei eigenständige Experiences:

1. Loadout Randomizer
2. GunGame
3. Magische Miesmuschel

Die Landingpage wird zu einem echten Game Hub. Auf Desktop verhält sich die App wie ein Dashboard, auf Mobilgeräten wie eine native App mit unterer Navigation und bildschirmfüllenden Ansichten.

## 2. Was bewusst nicht übernommen wird

- bestehendes Seitenlayout
- bestehende visuelle Hierarchie
- Inline-CSS aus `index.html`
- globale Sammeldatei `assets/css/styles.css`
- DOM-Verschiebungen durch `responsive-layout.js`
- Mischung aus deutschen und englischen UI-Texten
- verstreute Event-Listener und DOM-Abfragen im großen `app.js`
- unterschiedliche Navigation und Kopfbereiche je Seite
- Desktop-Elemente, die mobil nur verkleinert oder umsortiert werden
- uneinheitliche Dialoge, Overlays, Buttons und Statusanzeigen
- Query-String-Hotfixes als dauerhafte Cache-Strategie

## 3. Was aus v1 übernommen werden darf

Nur klar abgegrenzte, testbare Fachlogik wird portiert:

- Daten aus `randomizer/data.js` und `gungame/data.js`
- gewichtete Zufallsauswahl und History-Regeln aus `randomizer/game.js`
- Firebase-Operationen aus `randomizer/squad.js`
- Validierungslogik aus `randomizer/squad-utils.js`
- persistierte Einstellungen aus `randomizer/storage.js`, mit Migration auf ein versioniertes v2-Schema
- Audioerzeugung aus `randomizer/sound.js`
- GunGame-Routenerzeugung nach Extraktion aus der bisherigen UI-Datei
- Miesmuschel-Entscheidungslogik und Verlauf

Diese Module erhalten Tests und UI-unabhängige Schnittstellen. Keine Fachfunktion darf direkt HTML erzeugen oder Layoutklassen kennen.

## 4. Neue Informationsarchitektur

```text
App Shell
├── Game Hub
│   ├── Randomizer starten
│   ├── GunGame starten
│   └── Miesmuschel starten
├── Randomizer
│   ├── Play
│   ├── Loadout-Details
│   ├── Filter
│   ├── Wheel
│   └── Squad
├── GunGame
│   ├── Setup
│   ├── Aktueller Run
│   ├── Route
│   └── Squad
├── Miesmuschel
│   ├── Frage
│   ├── Antwort
│   └── Verlauf
└── Einstellungen
    ├── Sound
    ├── Animationen
    ├── Streamer-Modus
    └── Daten zurücksetzen
```

Zusatzfunktionen werden nicht mehr gleichzeitig unter dem Hauptspiel angezeigt. Sie öffnen sich in eigenständigen Panels, Dialogen oder Ansichten.

## 5. Komplett neues Layout

### 5.1 Globale App-Shell

#### Desktop

- feste linke Navigation mit Logo und Moduswechsel
- kompakte obere Statusleiste mit Squad, Verbindung, Sound und Einstellungen
- bildschirmfüllender Hauptbereich
- kontextabhängige rechte Seitenleiste für Details oder Einstellungen
- maximale Nutzung der verfügbaren Höhe; keine künstlich schmale 900-Pixel-Spalte

```text
┌────────────┬─────────────────────────────────┬──────────────┐
│ Navigation │ Topbar                          │ Kontext      │
│            ├─────────────────────────────────┤ Sidebar      │
│ Hub        │                                 │              │
│ Randomizer │ Hauptansicht                    │ Filter /     │
│ GunGame    │                                 │ Squad /      │
│ Muschel    │                                 │ Details      │
│            │                                 │              │
└────────────┴─────────────────────────────────┴──────────────┘
```

#### Mobil

- kompakte Topbar
- eine bildschirmfüllende Hauptansicht
- Bottom Navigation für Play, Filter, Squad und Mehr
- Hauptaktion im unteren Daumenbereich
- Filter und Einstellungen als eigene Fullscreen Sheets
- keine schwebenden Desktop-Panels und keine DOM-Umsortierung per JavaScript

```text
┌──────────────────────┐
│ Topbar + Status      │
├──────────────────────┤
│                      │
│ Aktuelle Ansicht     │
│                      │
├──────────────────────┤
│ Primäre Aktion       │
├──────────────────────┤
│ Play Filter Squad •••│
└──────────────────────┘
```

### 5.2 Game Hub

Die bisherige Landingpage wird vollständig ersetzt.

- markanter Hero mit v2-Branding
- drei große, visuell eigenständige Game Tiles
- jedes Tile zeigt Zweck, Status und letzte Nutzung
- zuletzt verwendeter Modus kann direkt fortgesetzt werden
- Wartungs- und Offline-Zustände sind echte Komponenten
- Navigation und Einstellungen sind bereits Teil der App-Shell

### 5.3 Randomizer Play View

Die Slotmaschine wird nicht übernommen. Das neue Zentrum ist ein Loadout Board.

#### Desktop

- Map als breite Stage Card oben
- Ausrüstung als kompaktes Grid
- Waffen als zwei dominante Karten
- zentrale Aktion „Loadout würfeln“
- Einzelkarten können gesperrt oder neu gewürfelt werden
- Resultatwert und Seltenheit werden visuell hervorgehoben

```text
┌────────────────────────────────────────────┐
│ MAP                                        │
│ Armory                              ↻       │
├─────────┬─────────┬─────────┬──────────────┤
│ Helmet  │ Armor   │ Rig     │ Backpack     │
├───────────────────┬────────────────────────┤
│ Primary Weapon    │ Secondary Weapon       │
├───────────────────┴────────────────────────┤
│       [ LOADOUT WÜRFELN ]                  │
└────────────────────────────────────────────┘
```

#### Mobil

- Map und Waffen zuerst
- Ausrüstung als horizontaler, snap-basierter Kartenbereich oder kompaktes Grid
- Ergebnis bleibt nach dem Spin stabil lesbar
- Hauptaktion bleibt erreichbar, verdeckt aber keinen Inhalt
- „Gestorben“ und „Überlebt“ erscheinen erst nach einem Resultat als kontextbezogene Aktionen

#### Neue Interaktion

- Karten lassen sich vor dem Spin sperren
- Einzelnes Neuwürfeln erfolgt direkt an der Karte
- Filterstatus wird als kompakter Chip angezeigt
- Sonderereignisse ersetzen nicht die gesamte Seite, sondern nutzen ein einheitliches Event-Overlay
- Animationen laufen mit `transform` und `opacity`, nicht über Layoutwerte

### 5.4 Filter Studio

Filter werden aus der Play View entfernt und zu einer eigenen Ansicht.

- linke Kategorienavigation auf Desktop
- Fullscreen Sheet mit Tabs auf Mobil
- Waffenliste mit Suche
- aktive Anzahl pro Gruppe
- „Alle“, „Keine“ und „Standard wiederherstellen“
- Vorschau, wie viele mögliche Ergebnisse verbleiben
- Änderungen werden gesammelt und mit „Übernehmen“ bestätigt
- ungültige Konfigurationen werden vor dem Schließen erklärt
- lokale Speicherung erfolgt erst nach erfolgreicher Validierung

### 5.5 Wheel

Das Wheel wird eine eigenständige Spielansicht statt eines aufgeklappten Zusatzblocks.

- großes, responsives Canvas
- Quelle klar wählen: Squad oder eigene Werte
- Teilnehmer als editierbare Chips
- Ergebnis als Text und Animation
- eigene URL-/Ansichtsroute innerhalb der App
- Canvas wird nur initialisiert, wenn die Ansicht geöffnet ist

### 5.6 Squad Command Center

Squad wird vollständig vom Randomizer-Markup getrennt.

- Startscreen mit „Erstellen“ und „Beitreten“
- aktive Session als eigenes Dashboard
- Session-Code und Verbindung prominent
- Member Cards mit Rolle, Status und aktuellem Resultat
- Activity Feed als sekundärer Tab
- Leader-Aktionen über ein einheitliches Aktionsmenü
- Verbindungsabbrüche, Reconnect und Kick erhalten eigene Statusansichten
- Firebase-Code wird erst geladen, wenn Squad tatsächlich verwendet wird

### 5.7 GunGame

GunGame erhält eine echte Run-Oberfläche.

- Setup-Wizard vor dem Start
- aktuelle Waffe bildschirmfüllend im Fokus
- Fortschrittsring oder klare Stage-Anzeige
- vorherige und nächste Waffe nur als Kontext
- Route als vertikale Timeline in eigener Ansicht
- „Raid abgeschlossen“ als Hauptaktion
- Reset nur nach Bestätigung
- Squad verwendet dieselben Command-Center-Komponenten wie der Randomizer

### 5.8 Magische Miesmuschel

- minimalistische, immersive Einzelfunktion
- große Fragefläche
- animierte Muschel als visuelles Zentrum
- Antwort als klarer Ja-/Nein-/Neutral-Zustand
- Verlauf wird in einem separaten Drawer geöffnet
- Sound und Reduced Motion nutzen globale Einstellungen
- keine losgelösten Buttons am Seitenrand

### 5.9 Offline- und Fehleransichten

- gemeinsame Empty-/Error-State-Komponenten
- Offline-Seite funktioniert vollständig ohne externe Fonts
- „Erneut versuchen“, „Offline fortfahren“ und „Zum Hub“
- Anzeige, welche Daten lokal verfügbar sind
- Fehler enthalten eine konkrete nächste Aktion statt nur einer Meldung

## 6. Neues Design-System

### Stilrichtung: Dark Tactical / Electric Signal

- fast schwarze, leicht bläuliche Grundfläche
- wenige große Flächen statt vieler kleiner Rahmen
- elektrische Akzentfarben, gezielt pro Modus eingesetzt
- hohe typografische Kontraste
- feines Raster und dezente Textur statt dauernder Glow-Effekte
- Resultate und Aktionen wirken kräftig; Einstellungen bleiben ruhig

### Modusfarben

- Randomizer: Electric Amber
- GunGame: Signal Cyan
- Miesmuschel: Ultraviolet
- Squad online: Emerald
- Gefahr / 0 to Hero: Signal Red

### Typografie

- lokale Display-Schrift für Titel und Resultate
- lokale variable UI-Schrift für Oberfläche und Fließtext
- keine render-blockierenden Google-Font-Requests
- konsequente Größen- und Zeilenhöhen-Skala
- Zahlen erhalten tabellarische Ziffern für Werte und Status

### Komponentenbibliothek

- `AppShell`
- `SideNav` / `BottomNav`
- `TopBar`
- `GameTile`
- `LoadoutCard`
- `WeaponCard`
- `ActionButton`
- `IconButton`
- `StatusChip`
- `FilterGroup`
- `SearchField`
- `Sheet` / `Drawer`
- `Dialog`
- `Toast`
- `MemberCard`
- `Timeline`
- `EmptyState`
- `ErrorState`
- `EventOverlay`

Jede Komponente besitzt dokumentierte Zustände für Default, Hover, Focus, Active, Disabled, Loading, Error und Success.

## 7. Neue technische Architektur

Das Projekt bleibt auf Wunsch ohne Framework und kann weiterhin auf GitHub Pages laufen. Trotzdem erhält es eine strukturierte, komponentenbasierte Architektur mit nativen ES-Modulen.

```text
assets/
├── fonts/
├── icons/
├── audio/
├── styles/
│   ├── tokens.css
│   ├── reset.css
│   ├── base.css
│   ├── shell.css
│   ├── utilities.css
│   ├── components/
│   └── views/
└── js/
    ├── app/
    │   ├── bootstrap.js
    │   ├── router.js
    │   ├── store.js
    │   └── events.js
    ├── core/
    │   ├── randomizer-engine.js
    │   ├── gungame-engine.js
    │   ├── validation.js
    │   └── storage.js
    ├── services/
    │   ├── squad-service.js
    │   ├── audio-service.js
    │   └── update-service.js
    ├── components/
    └── views/
        ├── hub-view.js
        ├── randomizer-view.js
        ├── filters-view.js
        ├── wheel-view.js
        ├── squad-view.js
        ├── gungame-view.js
        └── muschel-view.js
```

### Schichtentrennung

```text
View → Actions → Store → Core/Services
  ↑                 │
  └──── Render ←────┘
```

- Views kennen DOM und Komponenten.
- Actions übersetzen Benutzerinteraktionen in Zustandsänderungen.
- Der Store hält den serialisierbaren App-Zustand.
- Core-Module enthalten reine Fachlogik ohne DOM.
- Services kapseln Firebase, Audio, Storage und Service Worker.
- Keine direkte Firebase-, Storage- oder Audio-Nutzung aus UI-Komponenten.

### Zustandsmodell

```js
{
  route,
  preferences,
  randomizer: { filters, locks, result, phase },
  wheel: { source, entries, result, phase },
  squad: { session, members, connection, role },
  gungame: { config, route, currentStage, phase },
  muschel: { question, result, history }
}
```

Alle Ansichten werden aus diesem Zustand gerendert. Lose globale Variablen und versteckte DOM-Zustände werden entfernt.

## 8. Performance-Neuaufbau

### Verbindliche Budgets

- Initiales JavaScript für den Hub: maximal 80 KB komprimiert
- Initiales CSS: maximal 35 KB komprimiert
- kein Laden von Firebase auf Hub, Miesmuschel oder Solo-GunGame
- Largest Contentful Paint: unter 2,0 Sekunden auf einem durchschnittlichen Mobilgerät
- Interaction to Next Paint: unter 200 ms
- Cumulative Layout Shift: unter 0,05
- Animationen möglichst stabil mit 60 FPS
- keine Aufgabe auf dem Main Thread länger als 50 ms im normalen Spielablauf

### Maßnahmen

- Ansichten und Dienste per dynamischem `import()` laden
- Firebase nur beim Öffnen von Squad laden
- Wheel-Canvas nur in der Wheel View initialisieren
- Hero-Audio niemals vorladen; erst nach Benutzeraktion laden
- Fonts lokal hosten, subsetten und mit `font-display: swap` ausliefern
- nur benötigte Schriftschnitte einbinden
- CSS nach Komponenten und Views aufteilen
- ungenutzte v1-Regeln vollständig entfernen
- große Listen mit `DocumentFragment` oder gebündeltem Rendering erzeugen
- Event Delegation statt hunderter einzelner Listener
- DOM-Schreib- und Leseoperationen bündeln
- Animationen nur über `transform` und `opacity`
- Resize-Verhalten vollständig über CSS Container Queries und Media Queries lösen
- SVG-Icons als kleines lokales Sprite
- Service Worker mit versioniertem App-Shell-Cache und sauberem Update-Flow
- Bilder und optionale Assets lazy laden
- Performance-Messungen automatisiert vor jedem Release ausführen

## 9. Accessibility als Architekturvorgabe

- vollständige Tastaturbedienung
- sichtbarer `:focus-visible`-Zustand
- Skip-Link und korrekte Landmarken
- semantische Buttons statt klickbarer Container
- Dialoge mit Fokusfalle und korrekter Rückgabe des Fokus
- Live-Regionen für Spin-, Squad- und Verbindungsstatus
- Farbinformation wird immer durch Text oder Icon ergänzt
- Mindestgröße interaktiver Touch-Ziele: 44 × 44 Pixel
- WCAG-2.2-AA-Kontraste
- Zoom bis 200 Prozent ohne Funktionsverlust
- vollständige `prefers-reduced-motion`-Variante
- Sound ist niemals die einzige Rückmeldung

## 10. Umsetzungsstrategie: Parallelaufbau statt Umbau in v1

v2 entsteht zunächst getrennt von der laufenden v1. Dadurch kann das neue System ohne Rücksicht auf alte CSS-Selektoren aufgebaut und jederzeit verglichen werden.

### Phase 0 – Sicherung und Verträge

- [ ] v1-Funktionen und Sonderfälle als Testmatrix dokumentieren
- [ ] Screenshots aller v1-Zustände sichern
- [ ] Daten-, Storage- und Firebase-Verträge dokumentieren
- [ ] Tests für Randomizer-Engine, GunGame-Engine und Squad-Utils vervollständigen
- [ ] Performance-Baseline mit Lighthouse erfassen

**Abnahme:** Alle zu übernehmenden fachlichen Funktionen sind durch Tests oder dokumentierte Abläufe abgesichert.

### Phase 1 – v2-Fundament

- [ ] neue v2-Verzeichnisstruktur anlegen
- [ ] Tokens, Reset, Typografie und Theme-System erstellen
- [ ] Store, Actions und einfacher Router implementieren
- [ ] App-Shell für Desktop und Mobil umsetzen
- [ ] Komponenten-Demo für Buttons, Karten, Formulare, Dialoge und Status erstellen
- [ ] lokale Fonts und Icon-Sprite integrieren

**Abnahme:** Leere v2-App ist responsiv, per Tastatur bedienbar und verwendet keine v1-Styles.

### Phase 2 – Hub als erster vollständiger Vertical Slice

- [ ] neuen Game Hub erstellen
- [ ] Routing zwischen Hub und leeren Modusansichten implementieren
- [ ] Offline- und Fehlerzustände ergänzen
- [ ] initiale Asset- und Performance-Budgets prüfen

**Abnahme:** Neue Designsprache, Navigation und Ladeverhalten sind auf allen Zielgrößen freigegeben.

### Phase 3 – Randomizer komplett neu bauen

- [ ] Randomizer-Fachlogik in reine Engine extrahieren
- [ ] Loadout Board implementieren
- [ ] Lock- und Einzel-Reroll-Interaktionen ergänzen
- [ ] Spin-State-Machine (`idle`, `spinning`, `result`, `event`) erstellen
- [ ] Filter Studio mit Suche, Zähler und Validierung bauen
- [ ] Storage-Migration von v1 zu v2 implementieren
- [ ] Sonderereignisse in einheitliche Event Overlays portieren

**Abnahme:** Solo-Randomizer ist funktional vollständig, visuell neu und unabhängig vom alten DOM.

### Phase 4 – Wheel und Squad neu bauen

- [ ] eigenständige Wheel View erstellen
- [ ] Wheel-Logik vom DOM entkoppeln
- [ ] Squad-Service als einzige Firebase-Schnittstelle erstellen
- [ ] Squad Command Center bauen
- [ ] Rollen, Presence, Reconnect und Activity Feed portieren
- [ ] Firebase dynamisch laden

**Abnahme:** Solo- und Squad-Modus bestehen vollständige Funktions- und Netzwerktests.

### Phase 5 – GunGame und Miesmuschel neu bauen

- [ ] GunGame-Engine extrahieren und testen
- [ ] Setup-Wizard, Run View und Timeline erstellen
- [ ] gemeinsame Squad-Komponenten anbinden
- [ ] Miesmuschel-Experience neu erstellen
- [ ] globalen Audio-Service anbinden

**Abnahme:** Alle Modi nutzen dieselbe Shell und Komponentenbibliothek, besitzen aber eine eigene visuelle Identität.

### Phase 6 – PWA, Performance und Ablösung von v1

- [ ] neuen Service Worker mit Cache-Manifest erstellen
- [ ] Offline-Flows und Update-Prompt testen
- [ ] Performance-Budgets auf allen Ansichten prüfen
- [ ] Accessibility Audit durchführen
- [ ] Cross-Browser- und Gerätematrix testen
- [ ] v1-Einstieg durch v2 ersetzen
- [ ] alte HTML-, CSS- und UI-Dateien erst nach Abnahme entfernen
- [ ] README, Changelog und Architektur-Dokumentation aktualisieren

**Abnahme:** v2 erfüllt Definition of Done und v1 wird nicht mehr produktiv geladen.

## 11. Tests und Qualitäts-Gates

### Automatisiert

- Unit-Tests für Randomizer-Auswahl und History
- Unit-Tests für Filtervalidierung
- Unit-Tests für GunGame-Routen
- Unit-Tests für Storage-Migration
- Unit-Tests für Squad-Validierung
- DOM-Komponententests für Dialog, Filter und Navigation
- End-to-End-Smoke-Tests für alle drei Modi
- Lighthouse-CI oder vergleichbarer Performance-Check

### Manuell

- 360 × 640
- 390 × 844
- 768 × 1024
- 1024 × 768
- 1440 × 900
- ultrabreiter Desktop
- Tastatur ohne Maus
- 200-Prozent-Zoom
- Reduced Motion
- langsames Mobilnetz
- offline und reconnecting
- Chrome, Firefox, Edge und Safari

Ein Arbeitspaket gilt erst als fertig, wenn Funktion, Responsivität, Accessibility und Performance gemeinsam bestanden sind.

## 12. Definition of Done für Version 2.0

- [ ] Kein v1-Layout und kein v1-Stylesheet wird produktiv geladen
- [ ] Alle Seiten nutzen die neue App-Shell
- [ ] Hub, Randomizer, Filter, Wheel, Squad, GunGame und Miesmuschel sind neu gestaltet
- [ ] Fachlogik ist von DOM und Styling getrennt
- [ ] `randomizer/app.js` ist durch Store, Actions, Views und Services ersetzt
- [ ] `responsive-layout.js` ist entfernt
- [ ] Firebase und schwere Features werden nur bei Bedarf geladen
- [ ] Performance-Budgets werden eingehalten
- [ ] Kernabläufe besitzen automatisierte Tests
- [ ] WCAG-2.2-AA-Ziele und Reduced Motion sind umgesetzt
- [ ] v1-Einstellungen werden sicher in das v2-Schema migriert
- [ ] PWA-Update und Offline-Nutzung wurden getestet
- [ ] alte Styles, HTML-Strukturen und ungenutzte UI-Logik sind gelöscht
- [ ] README, Changelog und Architekturübersicht beschreiben ausschließlich v2

## 13. Entscheidungen vor Entwicklungsbeginn

1. Bleibt v2 vollständig ohne Build-Schritt oder wird Vite für Bundling, Code-Splitting und Tests eingeführt?
2. Soll die v2 während der Entwicklung unter `/v2/` entstehen oder auf einem eigenen Branch mit separatem Preview-Deployment?
3. Welche der zwei Desktop-Strukturen wird final: dauerhafte Sidebar oder einklappbare Rail?
4. Soll das neue Loadout Board reale Item-Bilder nutzen oder bewusst typografisch/iconbasiert bleiben?
5. Soll die Miesmuschel wieder sofort verfügbar sein?
6. Werden gespeicherte v1-Filter vollständig migriert oder startet v2 mit einem sauberen Standardprofil?

## 14. Empfohlener Start

Der erste Sprint baut nicht das alte UI um. Er liefert einen sichtbaren Beweis für die neue Richtung:

1. v2-Verzeichnis und App-Shell
2. finales Token- und Typografie-System
3. neuer Game Hub
4. neues Randomizer Loadout Board mit statischen Beispieldaten
5. responsive Desktop- und Mobile-Prototypen
6. Messung von CSS-, JavaScript- und Rendering-Budget

Erst nach Freigabe dieses Vertical Slice wird die echte Randomizer-Engine angebunden. So ist früh sichtbar, dass v2 tatsächlich ein neues Produkt und keine umgefärbte Version von v1 ist.
